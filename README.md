# DesignCAD

DesignCAD is a browser-based CAD, slicing, and printer-control workspace built with React, Three.js, TypeScript, and Vite. It aims to bring the feel of a professional parametric CAD tool into a self-hostable web app that can run on a desktop during development and be served from a small Linux board such as an Orange Pi.

DesignCAD is open source under the MIT License.

> DesignCAD is not affiliated with Autodesk, Fusion 360, Duet3D, or any slicer vendor.

## What It Does

DesignCAD combines several maker-focused workflows in one app:

- **Design workspace** for sketching, solid modeling, import/export, component organization, and timeline-style feature management.
- **Prepare workspace** for slicer-oriented plate setup, model inspection, calibration workflows, and G-code preview.
- **Printer workspace** for Duet/RepRapFirmware-style printer connection, monitoring, firmware-related flows, and print-file management.
- **Self-hosted deployment** for serving the built app as static files from Nginx, including an optional Orange Pi updater service.

The project is still evolving quickly. Some CAD and slicer features are experimental, but the repository is now public so the work can be inspected, used, and improved in the open.

## Feature Highlights

### CAD And Modeling

- 3D viewport with orbit, pan, zoom, and view-cube style navigation.
- Sketch mode on XY, XZ, and YZ planes.
- Sketch tools including line, circle, rectangle, arc, and text workflows.
- Solid operations such as extrude, revolve, sweep, loft, shell, rib, split, draft, hole, thread, chamfer, and fillet-oriented dialogs.
- Mesh, surface, construction, inspect, assemble, and utilities ribbon areas.
- Component tree, feature timeline, selection filters, and visibility management.

### Import And Export

- Import support for:
  - `.f3d`
  - `.step`
  - `.stp`
  - `.stl`
  - `.obj`
- Project/settings bundle workflows for saving and loading workspace state.
- Export dialog for generated project/model outputs.

### Slicer And G-code Preview

- Prepare workspace for slicer-focused workflows.
- Plate/workspace model management.
- Calibration utilities.
- G-code preview and layer inspection.
- WASM-backed geometry/slicer helpers.

### Printer Workflows

- Printer workspace for Duet/RepRapFirmware-style devices.
- Printer profile and connection settings.
- Firmware/update-related UI flows.
- File and status panels for connected printers.

## Tech Stack

- **React 19**
- **TypeScript**
- **Three.js**
- **@react-three/fiber**
- **@react-three/drei**
- **Zustand**
- **Vite**
- **Vitest**
- **ESLint**
- **Lucide React**
- **WebAssembly assets** for selected geometry/slicer operations

## Requirements

- Node.js `22.12.0` or newer
- npm
- A modern browser with WebGL support

The repo includes an `.nvmrc` with the expected major Node version:

```bash
nvm use
```

## Quick Start

Install dependencies:

```bash
npm ci
```

Start the dev server:

```bash
npm run dev
```

Open:

```text
http://localhost:5173
```

The Vite dev server is configured to use port `5173`.

## Development Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Start the Vite development server. |
| `npm run dev:fresh` | Clear Vite optimized dependency cache, then start dev server. Useful after dependency, WASM, or persisted-state changes. |
| `npm run build` | Typecheck and build production static files into `dist/`. |
| `npm run preview` | Serve the production build locally with Vite preview. |
| `npm run clean` | Remove `dist/`. |
| `npm run typecheck` | Run the composite TypeScript build check. |
| `npm run lint` | Run ESLint. |
| `npm run test` | Run Vitest in watch mode. |
| `npm run test:run` | Run the Vitest suite once. |
| `npm run test:ui` | Start the Vitest UI. |
| `npm run verify` | Run `tsc -b` and `vitest run`. |
| `npm run check:wasm-budget` | Check WASM asset budget. |
| `npm run verify:wasm-build` | Verify the WASM build artifacts. |

## Project Layout

```text
src/
  app/                 Application shell helpers
  components/          UI components and workspace panels
  engine/              Geometry, import, slicer, and CAD logic
  services/            External/device service integrations
  store/               Zustand stores and slices
  test/                Vitest integration and behavior tests
  types/               Shared TypeScript types
  utils/               Project IO and shared helpers

public/
  fonts/               Runtime font assets

wasm/
  dist/                Tracked WASM runtime artifacts

scripts/
  designcad-updater.mjs
  install-orangepi-updater.sh
  check-wasm-budget.mjs
  verify-wasm-build.mjs
```

Local/private folders such as `gcodes/`, `.claude/`, `.codex/`, `memory/`, `.gitnexus/`, `obj/`, `node_modules/`, and `dist/` are intentionally ignored.

## Building For Production

Run:

```bash
npm run build
```

The static output is written to:

```text
dist/
```

That folder can be served by any static web server. For single-page app routing, configure the server to fall back to `index.html`.

## Static Hosting With Nginx

Example Nginx site:

```nginx
server {
    listen 80;
    server_name _;

    root /var/www/designcad;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /assets/ {
        try_files $uri =404;
        access_log off;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

Build and deploy:

```bash
npm run build
rsync -av --delete dist/ user@device:/var/www/designcad/
```

## Orange Pi Deployment

DesignCAD can be served from an Orange Pi 3 LTS or similar small Linux board.

Recommended base setup:

```bash
sudo apt update
sudo apt full-upgrade -y
sudo apt install -y nginx git curl ufw fail2ban rsync ca-certificates
sudo systemctl enable --now nginx
```

Firewall:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

For smaller SD cards, build on your development machine and copy only `dist/` to the device.

## Optional Self-Updater Service

The repo includes an optional updater service for a self-hosted Orange Pi deployment:

```text
scripts/designcad-updater.mjs
scripts/install-orangepi-updater.sh
```

The service exposes local endpoints through Nginx:

```text
GET  /api/update/status
POST /api/update/apply
```

The web app includes an **Updates** panel that can check GitHub and install updates through this local service.

Install on the Pi from a checked-out repo:

```bash
sudo ./scripts/install-orangepi-updater.sh
```

The installer creates:

```text
/opt/designcad/updater/designcad-updater.mjs
/etc/designcad-updater/updater.env
/etc/designcad-updater/token
/var/lib/designcad-updater/state.json
designcad-updater.service
```

Updater environment variables are documented in `.env.example`.

For public repositories, the updater can read GitHub without a token. For private forks or private deployments, set:

```bash
DESIGNCAD_GITHUB_TOKEN=your_read_only_token
```

Do not put GitHub tokens in the browser. The browser update panel uses the local updater key from `/etc/designcad-updater/token`.

## Release Assets

The updater can install either:

- the latest configured branch, normally `master`, by cloning and building on the Pi
- the latest GitHub release asset

For faster and more reliable device updates, publish a release asset named like:

```text
designcad-dist.zip
```

The archive should contain either:

```text
index.html
assets/
```

or:

```text
dist/index.html
dist/assets/
```

Branch updates run `npm ci && npm run build` on the device, which is slower and uses more disk space. Release updates only download and install the already-built static files.

## Quality And Testing

Before submitting code, run:

```bash
npm run typecheck
npm run lint
npm run test:run
npm run build
```

For a faster pre-check during development:

```bash
npm run typecheck
npm run lint
```

The slicer and geometry tests are intentionally detailed because small numerical changes can affect generated toolpaths, preview alignment, or dimensional accuracy.

## GitNexus Code Intelligence

This repository includes `AGENTS.md` instructions for GitNexus-assisted code navigation and impact analysis.

Useful commands:

```bash
npm run graph:analyze
npm run graph:list
npm run graph:serve
```

When changing functions/classes/methods, follow the GitNexus impact-analysis guidance in `AGENTS.md`.

## Contributing

Contributions are welcome. Start with:

- `CONTRIBUTING.md`
- `CODE_OF_CONDUCT.md`
- `SECURITY.md`

Good contributions include:

- focused bug fixes
- tests for slicer/geometry edge cases
- importer/exporter improvements
- viewport interaction fixes
- printer workflow improvements
- documentation that helps new users run or self-host the app

## Security

Please do not report security issues in public issues. See `SECURITY.md`.

Never commit:

- printer credentials
- Wi-Fi credentials
- updater keys
- GitHub tokens
- local G-code test files
- generated caches
- private project files

## License

DesignCAD is released under the MIT License. See `LICENSE`.

The bundled Roboto font is licensed separately by Google under Apache-2.0. See `THIRD_PARTY_NOTICES.md`.
