# Teaching-deck migration artifacts

This directory contains the source-to-target mapping for migrating the 144 teaching-deck slides from `projectamazonph/amazon-ph-simulators` into the native MDX lesson system.

## Files

- `teaching-deck-slide-map.json` is the generated 144-row manifest. Each row identifies one source slide, its learning-aid type and teaching role, the target course/module/lesson, the native target primitive, the evidence output, the disposition, and the editorial status.
- `target-provenance.json` records intentional target-specific extensions and synthesized lessons that do not have a one-to-one source-slide assignment.
- `../CURRICULUM-INDEX.md` remains the human-readable lesson inventory.

## Repeatable workflow

From the greenfield repository:

```bash
pnpm generate:deck-manifest
AMPH_SOURCE_REPO=/path/to/amazon-ph-simulators pnpm validate:deck-manifest -- --require-source
```

The validator checks that all 144 source rows exist, every source module has exactly 12 rows, all mapped target lessons exist, all target primitives are registered by the MDX directive plugin and lesson renderer, and the target inventory contains 42 lessons.

The source repository is intentionally not vendored into this repository. In CI, run the validator without `--require-source` when the source checkout is unavailable; in a migration or release workspace, use `--require-source` to verify the external slide paths directly.

## Editorial status values

`queued` means the row has a deterministic source-to-target mapping but still requires lesson-author review. Future status values should be limited to `reviewed`, `ported`, `merged`, `reframed`, `superseded`, or `omitted-with-rationale`.

The manifest is a planning and audit contract. It does not imply that the source slide’s HTML, CSS, or JavaScript should be copied into the greenfield application.

The target-provenance register complements, rather than expands, the 144-row source manifest. A target lesson belongs in the register when it intentionally adds strategic depth or synthesizes several source roles. This prevents an intentional greenfield extension from being mistaken for an unmapped source slide.
