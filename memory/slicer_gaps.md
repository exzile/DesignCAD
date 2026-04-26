---
name: Slicer Engine Gaps vs UI
description: Slicer settings that have UI/types but the engine still ignores or stubs them — check before claiming a feature works
type: project
---

The UI exposes near-full Cura 5.x settings; the engine in `engine/slicer/` is partial. The authoritative gap list is `TaskLists.txt` (the `[s]` storage-only entries). This file is a quick scan for "does X actually do anything" — for the canonical state always check TaskLists first.

**How to apply:** When the user reports "X doesn't seem to do anything," check `TaskLists.txt` `[s]` entries first; this file lists the highest-impact ones.

## Wired since this file was last refreshed (NOT gaps anymore)

- Adaptive layers — engine generates variable layer heights via 45°-peak penalty.
- Bridge detection — `bridgeMP = polygon-clipping.difference(currentLayerMaterial, prevLayerMaterial)` drives `bridgeSkinSpeed`/`bridgeSkinFlow`/`bridgeFanSpeed`.
- Gyroid / honeycomb / concentric / cubic infill — real curve patterns, not linear fills.
- Arachne thin-wall detection + sub-nominal centerline walls (classic offset cascade); full Arachne (`wallGenerator: 'arachne'`) lands with WASM via ARACHNE-9.
- Z-seam shortest-mode nozzle threading.
- Per-region overhang infill boost.
- Closing-radius mesh repair, normal-direction mesh repair.

## Still stubs / no-ops

- **Tree / organic support** — `supportType` accepts; engine generates normal vertical supports.
- **Lightning, tetrahedral, octet, cross-3D, cubic-subdivision infill** — fall back to linear/curve.
- **One-at-a-time print sequence** — always all-at-once.
- **Mold mode** — geometry not converted.
- **Fuzzy skin** — no noise on outer wall path.
- **Per-object setting overrides** — UI hooks exist on `PlateObject.perObjectSettings`, no editor.
- **Mesh modifiers** — Infill / Cutting / Anti-Overhang / Support Mesh — none implemented.
- **Support / seam / blocker painting** — no UI.
- **Multi-extruder** — prime tower, tool change G-code, per-extruder settings: not applicable (single-extruder architecture).
- **PostProcessingPlugin equivalent** — none.
- **Print time estimation before slice** — only available after slice completes.

## Print monitoring

Live print monitoring is intentionally NOT in the slicer — handled by the Duet panel.
