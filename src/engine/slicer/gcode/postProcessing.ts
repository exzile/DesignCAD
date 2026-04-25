import type { PrintProfile } from '../../../types/slicer';

function parseReplaceCommand(line: string): { pattern: RegExp; replacement: string } | null {
  const match = line.match(/^replace:\/(.+)\/([gimsuy]*)=>([\s\S]*)$/);
  if (!match) return null;
  try {
    return { pattern: new RegExp(match[1], match[2]), replacement: match[3] };
  } catch {
    return null;
  }
}

export function applyPostProcessingScripts(gcode: string, print: PrintProfile): string {
  const scripts = (print.postProcessingScripts ?? []).map((script) => script.trim()).filter(Boolean);
  if (scripts.length === 0) return gcode;

  let output = gcode;
  const appended: string[] = [];
  const prepended: string[] = [];

  for (const script of scripts) {
    for (const rawLine of script.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith(';')) continue;
      if (line.startsWith('prepend:')) {
        prepended.push(line.slice('prepend:'.length).trim());
        continue;
      }
      if (line.startsWith('append:')) {
        appended.push(line.slice('append:'.length).trim());
        continue;
      }
      const replace = parseReplaceCommand(line);
      if (replace) {
        output = output.replace(replace.pattern, replace.replacement);
        continue;
      }
      appended.push(line);
    }
  }

  if (prepended.length > 0) output = `${prepended.join('\n')}\n${output}`;
  if (appended.length > 0) output = `${output.trimEnd()}\n${appended.join('\n')}\n`;
  return output;
}
