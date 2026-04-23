import { handleBasicSketchCommit } from './commitHandlers/basicHandlers';
import { handleCurveSketchCommit } from './commitHandlers/curveHandlers';
import { handleEditingSketchCommit } from './commitHandlers/editingHandlers';
import { handleTangentSketchCommit } from './commitHandlers/tangentHandlers';
import type { SketchCommitCtx } from './commitHandlers/types';

const HANDLERS = [
  handleBasicSketchCommit,
  handleTangentSketchCommit,
  handleCurveSketchCommit,
  handleEditingSketchCommit,
] as const;

export type { SketchCommitCtx } from './commitHandlers/types';

export function commitSketchTool(ctx: SketchCommitCtx): void {
  for (const handler of HANDLERS) {
    if (handler(ctx)) return;
  }
}
