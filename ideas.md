# Lesson View Redesign: Evidence Pathways

## Chosen direction

The lesson view will use **Evidence Pathways**, a reference-led editorial learning surface that makes each decision point visually distinct without replacing the native Amazon PH design system. It will retain the product’s navy shell, cool work surfaces, white cards, Amazon Orange action hierarchy, defined typography roles, CSS tokens, Phosphor icons, course route behavior, and MDX directive rendering.

## Reference patterns translated into native AMPH components

| Reference intent | Compatible AMPH treatment |
| --- | --- |
| Visible lesson route and progress | Restyle the existing `LessonSidebar` as a dark, calm route panel with module progress, numbered section groups, clear current state, and completion signals. |
| Purpose before prose | Turn the lesson heading area into a compact outcome-focused hero, retaining the title, module label, duration, and existing access behavior. |
| Distinct teaching beats | Introduce shell-level section rhythm, readable prose spacing, and restrained cue labels around the existing MDX content. Native visual directives remain the primary interactive artifacts. |
| Touch-friendly assessment | Preserve the existing `SelfCheck`, quiz, visual-block, and simulator components; improve only their shared composition and visual hierarchy where the renderer already owns it. |
| Clear completion and next action | Elevate the existing completion and previous/next controls into a deliberate end-of-lesson action area. |

## Non-negotiable compatibility constraints

- Do not alter lesson slugs, course routing, enrollment authorization, completion actions, or curriculum inventory data.
- Do not alter or bypass MDX directives, quiz routing, native content imports, or established accessibility tests.
- Do not add dependencies, global fonts, custom icon sets, Tailwind, gradients, glass effects, or raw design values.
- Keep the production repository’s dense, operational visual language. The reference informs information hierarchy and learning rhythm, not a wholesale visual rebrand.

## Alternatives considered

| Direction | Decision | Reason |
| --- | --- | --- |
| Full visual clone of the supplied reference | Rejected | It would conflict with the repository’s native Amazon PH token, typography, and component constraints. |
| Rewrite each MDX lesson individually | Rejected | It would create 42 fragile content variants and risk inventory and directive regressions. |
| Shared lesson shell and navigation redesign | Chosen | It applies consistently to all modules while preserving the production content model and existing interactive learning blocks. |
