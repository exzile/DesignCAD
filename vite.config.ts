import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import wasm from 'vite-plugin-wasm'
import http from 'node:http'
import https from 'node:https'
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)

// Proxies /duet-proxy/<host>/path → http://<host>/path, bypassing browser CORS.
function duetProxyPlugin(): Plugin {
  return {
    name: 'duet-proxy',
    configureServer(server) {
      server.middlewares.use('/duet-proxy', (req, res) => {
        const match = req.url?.match(/^\/([^/?]+)([/?].*)?$/);
        if (!match) { res.statusCode = 400; res.end('Bad proxy URL'); return; }
        const [, host, rest = '/'] = match;
        const targetUrl = `http://${host}${rest}`;
        const parsed = new URL(targetUrl);
        const mod = parsed.protocol === 'https:' ? https : http;
        const proxyReq = mod.request(
          targetUrl,
          { method: req.method, headers: { ...req.headers, host: parsed.host } },
          (proxyRes) => {
            res.writeHead(proxyRes.statusCode ?? 200, proxyRes.headers);
            proxyRes.pipe(res);
          }
        );
        proxyReq.on('error', (err) => {
          console.error(`[duet-proxy] upstream error ${req.method} ${targetUrl}: ${err.message}`);
          if (!res.headersSent) {
            res.statusCode = 502;
            res.setHeader('content-type', 'text/plain');
            res.end(`Upstream error: ${err.message}`);
          } else {
            res.end();
          }
        });
        req.pipe(proxyReq);
      });
    },
  };
}

function parseAuthParams(header: string): Record<string, string> {
  const params: Record<string, string> = {};
  const rest = header.replace(/^\s*\w+\s+/, '');
  const pattern = /(\w+)=(?:"([^"]*)"|([^,]*))(?:,\s*|$)/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(rest)) !== null) {
    params[match[1]] = match[2] ?? match[3] ?? '';
  }
  return params;
}

function md5(value: string): string {
  return crypto.createHash('md5').update(value).digest('hex');
}

function digestAuthHeader(
  challenge: string,
  target: URL,
  method: string,
  username: string,
  password: string,
): string {
  const params = parseAuthParams(challenge);
  const realm = params.realm ?? '';
  const nonce = params.nonce ?? '';
  const qop = (params.qop ?? '').split(',').map((item) => item.trim()).find((item) => item === 'auth');
  const opaque = params.opaque;
  const algorithm = params.algorithm || 'MD5';
  const uri = `${target.pathname}${target.search}`;
  const nc = '00000001';
  const cnonce = crypto.randomBytes(8).toString('hex');
  const ha1 = md5(`${username}:${realm}:${password}`);
  const ha2 = md5(`${method}:${uri}`);
  const response = qop
    ? md5(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`)
    : md5(`${ha1}:${nonce}:${ha2}`);
  const parts = [
    `username="${username.replace(/"/g, '\\"')}"`,
    `realm="${realm.replace(/"/g, '\\"')}"`,
    `nonce="${nonce.replace(/"/g, '\\"')}"`,
    `uri="${uri.replace(/"/g, '\\"')}"`,
    `response="${response}"`,
    `algorithm=${algorithm}`,
  ];
  if (opaque) parts.push(`opaque="${opaque.replace(/"/g, '\\"')}"`);
  if (qop) {
    parts.push(`qop=${qop}`);
    parts.push(`nc=${nc}`);
    parts.push(`cnonce="${cnonce}"`);
  }
  return `Digest ${parts.join(', ')}`;
}

function cameraProxyPlugin(): Plugin {
  return {
    name: 'camera-proxy',
    configureServer(server) {
      server.middlewares.use('/camera-proxy', (req, res) => {
        const parsedReq = new URL(req.url ?? '/', 'http://localhost');
        const target = parsedReq.searchParams.get('url');
        const username = parsedReq.searchParams.get('username') ?? '';
        const password = parsedReq.searchParams.get('password') ?? '';
        if (!target) { res.statusCode = 400; res.end('missing ?url'); return; }

        let targetUrl: URL;
        try { targetUrl = new URL(target); }
        catch { res.statusCode = 400; res.end('bad url'); return; }
        if (targetUrl.protocol !== 'http:' && targetUrl.protocol !== 'https:') {
          res.statusCode = 400; res.end('unsupported protocol'); return;
        }

        const requestUpstream = (authorization?: string) => {
          const mod = targetUrl.protocol === 'https:' ? https : http;
          const headers: http.OutgoingHttpHeaders = {
            Accept: req.headers.accept ?? 'multipart/x-mixed-replace,image/*,*/*',
            'User-Agent': 'DesignCAD-camera-proxy',
            host: targetUrl.host,
          };
          if (authorization) headers.Authorization = authorization;
          const upstreamReq = mod.request(targetUrl, { method: 'GET', headers });
          upstreamReq.setTimeout(5000, () => {
            upstreamReq.destroy(new Error('Camera connection timed out'));
          });
          return upstreamReq;
        };

        const pipeResponse = (upstream: http.IncomingMessage) => {
          const headers = { ...upstream.headers };
          delete headers['content-length'];
          headers['access-control-allow-origin'] = '*';
          res.writeHead(upstream.statusCode ?? 200, headers);
          upstream.pipe(res);
        };

        const firstReq = requestUpstream();
        firstReq.on('response', (firstRes) => {
          firstReq.setTimeout(0);
          const challenge = firstRes.headers['www-authenticate'];
          const challengeText = Array.isArray(challenge) ? challenge[0] : challenge;
          if (firstRes.statusCode !== 401 || !challengeText || !username) {
            pipeResponse(firstRes);
            return;
          }

          firstRes.resume();
          const lowerChallenge = challengeText.toLowerCase();
          const authorization = lowerChallenge.startsWith('digest')
            ? digestAuthHeader(challengeText, targetUrl, 'GET', username, password)
            : lowerChallenge.startsWith('basic')
              ? `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`
              : '';
          if (!authorization) {
            res.statusCode = 401;
            res.end('unsupported camera authentication');
            return;
          }

          const secondReq = requestUpstream(authorization);
          secondReq.on('response', (secondRes) => {
            secondReq.setTimeout(0);
            pipeResponse(secondRes);
          });
          secondReq.on('error', (err) => {
            console.error(`[camera-proxy] upstream auth error GET ${targetUrl.origin}${targetUrl.pathname}: ${err.message}`);
            if (!res.headersSent) {
              res.statusCode = 502;
              res.setHeader('content-type', 'text/plain');
              res.end(`Upstream error: ${err.message}`);
            } else {
              res.end();
            }
          });
          secondReq.end();
        });
        firstReq.on('error', (err) => {
          console.error(`[camera-proxy] upstream error GET ${targetUrl.origin}${targetUrl.pathname}: ${err.message}`);
          if (!res.headersSent) {
            res.statusCode = 502;
            res.setHeader('content-type', 'text/plain');
            res.end(`Upstream error: ${err.message}`);
          } else {
            res.end();
          }
        });
        firstReq.end();
      });
    },
  };
}

// Proxies /github-proxy?url=<encoded URL> → the upstream URL on GitHub,
// following redirects (github.com → objects.githubusercontent.com).
// Browsers block those asset-CDN URLs because they don't send CORS headers;
// this dev-only proxy re-emits the bytes with ACAO:* so firmware updates work.
type HlsBridgeSession = {
  dir: string;
  indexPath: string;
  process: ChildProcessWithoutNullStreams;
  lastAccess: number;
};
type HlsBridgeQuality = 'native' | '1080p' | '720p' | '480p';
type RtspRecordingSession = {
  createdAt: number;
  filePath: string;
  kind: string;
  process: ChildProcessWithoutNullStreams;
  target: string;
};
type CameraBackendSource =
  | { kind: 'rtsp'; target: string }
  | { kind: 'usb'; target: string };

type MiddlewareHost = {
  middlewares: {
    use: (
      path: string,
      handler: (req: http.IncomingMessage, res: http.ServerResponse) => void | Promise<void>,
    ) => void;
  };
  httpServer?: {
    once: (event: 'close', listener: () => void) => void;
  } | null;
};

function contentTypeForHlsFile(filePath: string): string {
  if (filePath.endsWith('.m3u8')) return 'application/vnd.apple.mpegurl';
  if (filePath.endsWith('.ts')) return 'video/mp2t';
  return 'application/octet-stream';
}

function localFfmpegPath(): string {
  const envPath = process.env.FFMPEG_PATH?.trim();
  if (envPath) return envPath;
  try {
    const bundled = require('@ffmpeg-installer/ffmpeg') as { path?: string };
    if (bundled.path) return bundled.path;
  } catch (error) {
    throw new Error(`Bundled FFmpeg package is unavailable: ${(error as Error).message}`);
  }
  throw new Error('Bundled FFmpeg package did not expose an executable path.');
}

function normalizeBridgeQuality(value: string | null): HlsBridgeQuality {
  return value === 'native' || value === '1080p' || value === '720p' || value === '480p'
    ? value
    : '1080p';
}

function scaleFilterForQuality(quality: HlsBridgeQuality): string[] {
  if (quality === 'native') return [];
  const height = quality === '1080p' ? 1080 : quality === '720p' ? 720 : 480;
  return ['-vf', `scale=-2:min(${height}\\,ih)`];
}

function backendSourceId(source: CameraBackendSource, quality: HlsBridgeQuality): string {
  return crypto.createHash('sha1').update(`${source.kind}|${source.target}|${quality}`).digest('hex').slice(0, 16);
}

function parseBackendCameraSource(parsedReq: URL): CameraBackendSource | null {
  const source = parsedReq.searchParams.get('source') ?? 'rtsp';
  const target = parsedReq.searchParams.get(source === 'usb' ? 'device' : 'url');
  if (!target) return null;
  if (source === 'usb') return { kind: 'usb', target };
  try {
    const targetUrl = new URL(target);
    return targetUrl.protocol === 'rtsp:' ? { kind: 'rtsp', target } : null;
  } catch {
    return null;
  }
}

function ffmpegInputArgs(source: CameraBackendSource): string[] {
  if (source.kind === 'rtsp') {
    return ['-rtsp_transport', 'tcp', '-fflags', 'nobuffer', '-flags', 'low_delay', '-i', source.target];
  }

  if (process.platform === 'win32') {
    return ['-f', 'dshow', '-i', source.target.startsWith('video=') ? source.target : `video=${source.target}`];
  }
  if (process.platform === 'darwin') {
    return ['-f', 'avfoundation', '-i', source.target || '0'];
  }
  return ['-f', 'v4l2', '-framerate', '30', '-i', source.target || '/dev/video0'];
}

function redactCameraTarget(target: string): string {
  return target.replace(/\/\/.*@/, '//***@');
}

function rtspHlsBridgePlugin(): Plugin {
  const sessions = new Map<string, HlsBridgeSession>();
  const root = path.join(os.tmpdir(), 'designcad-camera-hls');
  const ffmpegPath = localFfmpegPath();

  function stopSession(id: string): void {
    const session = sessions.get(id);
    if (!session) return;
    session.process.kill('SIGTERM');
    sessions.delete(id);
    try {
      fs.rmSync(session.dir, { recursive: true, force: true });
    } catch {
      /* temp cleanup best effort */
    }
  }

  function bridgeSessionId(source: CameraBackendSource, quality: HlsBridgeQuality): string {
    return backendSourceId(source, quality);
  }

  function ensureSession(source: CameraBackendSource, quality: HlsBridgeQuality): HlsBridgeSession {
    const id = bridgeSessionId(source, quality);
    const existing = sessions.get(id);
    if (existing && !existing.process.killed) {
      existing.lastAccess = Date.now();
      return existing;
    }

    const dir = path.join(root, id);
    fs.mkdirSync(dir, { recursive: true });
    const indexPath = path.join(dir, 'index.m3u8');
    const segmentPattern = path.join(dir, 'segment_%05d.ts');
    const args = [
      '-hide_banner',
      '-loglevel', 'warning',
      ...ffmpegInputArgs(source),
      '-an',
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-tune', 'zerolatency',
      '-pix_fmt', 'yuv420p',
      ...scaleFilterForQuality(quality),
      '-f', 'hls',
      '-hls_time', '1',
      '-hls_list_size', '5',
      '-hls_flags', 'delete_segments+append_list+omit_endlist',
      '-hls_segment_filename', segmentPattern,
      indexPath,
    ];
    const child = spawn(ffmpegPath, args, { windowsHide: true });
    child.stderr.on('data', (chunk) => {
      console.warn(`[camera-rtsp-hls] ${String(chunk).trim()}`);
    });
    child.on('exit', () => {
      sessions.delete(id);
    });

    const session = { dir, indexPath, process: child, lastAccess: Date.now() };
    sessions.set(id, session);
    return session;
  }

  return {
    name: 'camera-rtsp-hls',
    configureServer(server) {
      register(server);
    },
    configurePreviewServer(server) {
      register(server);
    },
  };

  function register(server: MiddlewareHost): void {
      const cleanupTimer = setInterval(() => {
        const staleBefore = Date.now() - 5 * 60 * 1000;
        for (const [id, session] of sessions) {
          if (session.lastAccess < staleBefore) stopSession(id);
        }
      }, 60 * 1000);

      server.httpServer?.once('close', () => {
        clearInterval(cleanupTimer);
        for (const id of sessions.keys()) stopSession(id);
      });

      server.middlewares.use('/camera-rtsp-hls', async (req, res) => {
        const parsedReq = new URL(req.url ?? '/', 'http://localhost');
        const quality = normalizeBridgeQuality(parsedReq.searchParams.get('quality'));
        const source = parseBackendCameraSource(parsedReq);

        if (source) {
          const id = bridgeSessionId(source, quality);
          const session = ensureSession(source, quality);
          const waitStarted = Date.now();
          while (!fs.existsSync(session.indexPath) && Date.now() - waitStarted < 8000) {
            await new Promise((resolve) => setTimeout(resolve, 250));
          }
          const playlist = fs.existsSync(session.indexPath)
            ? fs.readFileSync(session.indexPath, 'utf8').split(/\r?\n/).map((line) => (
              line && !line.startsWith('#') ? `/camera-rtsp-hls/${id}/${line}` : line
            )).join('\n')
            : '#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-TARGETDURATION:1\n#EXT-X-MEDIA-SEQUENCE:0\n';
          res.writeHead(200, {
            'access-control-allow-origin': '*',
            'cache-control': 'no-cache, no-store, must-revalidate',
            'content-type': contentTypeForHlsFile(session.indexPath),
          });
          res.end(playlist);
          return;
        }

        const match = parsedReq.pathname.match(/^\/([a-f0-9]{16})\/([^/]+)$/);
        if (!match) {
          res.statusCode = 400;
          res.end('missing ?url');
          return;
        }
        const [, id, fileName] = match;
        const session = sessions.get(id);
        if (!session) {
          res.statusCode = 404;
          res.end('stream not running');
          return;
        }
        session.lastAccess = Date.now();
        const filePath = path.join(session.dir, fileName);
        if (!filePath.startsWith(session.dir) || !fs.existsSync(filePath)) {
          res.statusCode = 404;
          res.end('segment not ready');
          return;
        }
        res.writeHead(200, {
          'access-control-allow-origin': '*',
          'cache-control': 'no-cache',
          'content-type': contentTypeForHlsFile(filePath),
        });
        fs.createReadStream(filePath).pipe(res);
      });
  }
}

function rtspRecordingPlugin(): Plugin {
  const recordings = new Map<string, RtspRecordingSession>();
  const root = path.join(os.tmpdir(), 'designcad-camera-recordings');
  const ffmpegPath = localFfmpegPath();

  function recordingId(seed: string): string {
    return crypto.createHash('sha1').update(`${seed}|${Date.now()}|${crypto.randomBytes(8).toString('hex')}`).digest('hex').slice(0, 18);
  }

  function stopRecordingProcess(id: string): Promise<RtspRecordingSession | null> {
    const session = recordings.get(id);
    if (!session) return Promise.resolve(null);
    return new Promise((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        recordings.delete(id);
        resolve(session);
      };
      session.process.once('exit', finish);
      session.process.kill('SIGINT');
      setTimeout(() => {
        if (!settled) {
          session.process.kill('SIGTERM');
          finish();
        }
      }, 5000);
    });
  }

  function register(server: MiddlewareHost): void {
    server.httpServer?.once('close', () => {
      for (const [id, session] of recordings) {
        session.process.kill('SIGTERM');
        recordings.delete(id);
      }
    });

    server.middlewares.use('/camera-rtsp-record', async (req, res) => {
      const parsedReq = new URL(req.url ?? '/', 'http://localhost');
      const action = parsedReq.searchParams.get('action') ?? 'status';

      if (action === 'status') {
        const sessions = Array.from(recordings.entries()).map(([id, session]) => ({
          id,
          createdAt: session.createdAt,
          durationMs: Date.now() - session.createdAt,
          kind: session.kind,
          target: redactCameraTarget(session.target),
        }));
        res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-cache' });
        res.end(JSON.stringify({ recordings: sessions }));
        return;
      }

      if (action === 'start') {
        const source = parseBackendCameraSource(parsedReq);
        const kind = parsedReq.searchParams.get('kind') ?? 'clip';
        const quality = normalizeBridgeQuality(parsedReq.searchParams.get('quality'));
        if (!source) {
          res.statusCode = 400;
          res.end('missing or unsupported camera source');
          return;
        }

        fs.mkdirSync(root, { recursive: true });
        const id = recordingId(`${source.kind}|${source.target}`);
        const filePath = path.join(root, `${id}.mp4`);
        const args = [
          '-hide_banner',
          '-loglevel', 'warning',
          ...ffmpegInputArgs(source),
          '-an',
          '-c:v', 'libx264',
          '-preset', 'veryfast',
          '-tune', 'zerolatency',
          '-pix_fmt', 'yuv420p',
          ...scaleFilterForQuality(quality),
          '-movflags', '+frag_keyframe+empty_moov+default_base_moof',
          '-f', 'mp4',
          filePath,
        ];
        const child = spawn(ffmpegPath, args, { windowsHide: true });
        child.stderr.on('data', (chunk) => {
          console.warn(`[camera-rtsp-record] ${String(chunk).trim()}`);
        });
        child.on('exit', () => {
          recordings.delete(id);
        });
        const createdAt = Date.now();
        recordings.set(id, { createdAt, filePath, kind, process: child, target: `${source.kind}:${source.target}` });
        res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-cache' });
        res.end(JSON.stringify({ id, createdAt, kind }));
        return;
      }

      if (action === 'stop') {
        const id = parsedReq.searchParams.get('id');
        if (!id) { res.statusCode = 400; res.end('missing id'); return; }
        const session = await stopRecordingProcess(id);
        if (!session) {
          res.statusCode = 404;
          res.end('recording not running');
          return;
        }
        if (!fs.existsSync(session.filePath)) {
          res.statusCode = 500;
          res.end('recording file was not created');
          return;
        }
        const stat = fs.statSync(session.filePath);
        res.writeHead(200, {
          'access-control-allow-origin': '*',
          'cache-control': 'no-cache, no-store, must-revalidate',
          'content-disposition': `attachment; filename="${id}.mp4"`,
          'content-length': String(stat.size),
          'content-type': 'video/mp4',
          'x-recording-created-at': String(session.createdAt),
          'x-recording-duration-ms': String(Math.max(0, Date.now() - session.createdAt)),
          'x-recording-kind': session.kind,
        });
        fs.createReadStream(session.filePath)
          .on('close', () => {
            fs.rm(session.filePath, { force: true }, () => {});
          })
          .pipe(res);
        return;
      }

      res.statusCode = 400;
      res.end('unknown action');
    });
  }

  return {
    name: 'camera-rtsp-record',
    configureServer(server) {
      register(server);
    },
    configurePreviewServer(server) {
      register(server);
    },
  };
}

function githubProxyPlugin(): Plugin {
  const ALLOW_HOSTS = new Set([
    'api.github.com',
    'github.com',
    'objects.githubusercontent.com',
    'codeload.github.com',
  ]);

  return {
    name: 'github-proxy',
    configureServer(server) {
      server.middlewares.use('/github-proxy', async (req, res) => {
        try {
          const parsed = new URL(req.url ?? '/', 'http://dummy');
          const target = parsed.searchParams.get('url');
          if (!target) {
            res.statusCode = 400; res.end('missing ?url'); return;
          }
          let targetUrl: URL;
          try { targetUrl = new URL(target); }
          catch { res.statusCode = 400; res.end('bad url'); return; }
          if (!ALLOW_HOSTS.has(targetUrl.hostname)) {
            res.statusCode = 403; res.end('host not allowed'); return;
          }

          const acceptHdr = req.headers.accept;
          const upstream = await fetch(targetUrl, {
            method: req.method ?? 'GET',
            headers: {
              'User-Agent': 'DesignCAD-dev-proxy',
              ...(typeof acceptHdr === 'string' ? { Accept: acceptHdr } : {}),
            },
            redirect: 'follow',
          });

          const hdrs: Record<string, string> = {
            'access-control-allow-origin': '*',
            'content-type': upstream.headers.get('content-type') ?? 'application/octet-stream',
          };
          // NOTE: do NOT forward content-length. undici's fetch transparently
          // decompresses gzip/deflate responses (common on api.github.com),
          // but the upstream content-length reflects the *compressed* size.
          // If we copy it over, the browser reads only that many bytes of our
          // decoded stream and truncates the JSON ("Unterminated string…").
          res.writeHead(upstream.status, hdrs);

          if (!upstream.body) { res.end(); return; }
          const reader = upstream.body.getReader();
          const pump = async () => {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              if (value) res.write(Buffer.from(value));
            }
            res.end();
          };
          await pump();
        } catch (err) {
          res.statusCode = 502;
          res.end((err as Error).message);
        }
      });
    },
  };
}

// Send `Cache-Control: no-cache` for dev-mode static assets that the
// browser would otherwise hold onto across reloads — `.wasm`, `.js`,
// `.ts`, `.tsx`, `.css`, and the bare `/` HTML entry. `no-cache`
// (NOT `no-store` — we want disk cache + ETag revalidation) makes
// every fetch validate against the server. Effects:
//
//   • Rebuilt `.wasm` (after `wasm/build.ps1`) arrives within the
//     next slice, no hard-reload needed.
//   • Edits to source `.ts`/`.tsx` always reach the running tab —
//     the long-tail cache-stale problems we kept hitting (purple
//     colour, profile migration, etc.) become impossible because
//     the browser cannot serve stale source from disk.
//
// Only applies to the dev middleware (`apply: 'serve'`); production
// assets are content-hashed by `rollupOptions.output` and need
// long cache headers, so we don't touch them.
function noCacheDevAssetsPlugin(): Plugin {
  return {
    name: 'no-cache-dev-assets',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url) { next(); return; }
        const url = req.url;
        const noCache =
          /\.(wasm|js|mjs|cjs|ts|tsx|jsx|css)(\?|$)/.test(url)
          || url === '/'
          || url === '/index.html'
          || url.startsWith('/@');  // Vite virtual modules
        if (noCache) {
          res.setHeader('Cache-Control', 'no-cache, must-revalidate');
        }
        next();
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), wasm(), duetProxyPlugin(), cameraProxyPlugin(), rtspHlsBridgePlugin(), rtspRecordingPlugin(), githubProxyPlugin(), noCacheDevAssetsPlugin()],
  resolve: {
    alias: {
      module: fileURLToPath(new URL('./src/shims/nodeModule.ts', import.meta.url)),
    },
  },
  build: {
    // Disable CSS minification — lightningcss crashes on @keyframes in
    // some versions of the Vite 8 / rolldown stack.
    cssMinify: false,
    chunkSizeWarningLimit: 4096,
    assetsInlineLimit: (filePath) => filePath.endsWith('.wasm') ? false : undefined,
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) =>
          assetInfo.names.some((name) => name.endsWith('.wasm'))
            ? 'assets/wasm/[name]-[hash][extname]'
            : 'assets/[name]-[hash][extname]',
      },
    },
  },
  server: {
    port: process.env.PORT ? parseInt(process.env.PORT) : 5173,
    strictPort: false,
    // Bind all interfaces so the dev server is reachable from desktop
    // browsers when it's running on a Pi / Orange Pi over the LAN.
    host: true,
    watch: {
      // wasm/.toolchain/ holds emsdk + Boost + Clipper2 + CuraEngine
      // sources (~1.5GB total, gitignored). Rolldown's file watcher
      // would otherwise enumerate them on every dev start, blowing
      // memory and triggering needless HMR cycles. Exclude here and
      // the .toolchain churn stops mattering.
      ignored: [
        '**/wasm/.toolchain/**',
        '**/wasm/.toolchain',
      ],
    },
  },
  preview: {
    port: 4173,
    strictPort: true,
  },
})
