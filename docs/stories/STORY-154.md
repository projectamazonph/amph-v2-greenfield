# STORY-154: Second arithmetic recompute, and a written record of what is still wrong

**Status:** merged in PR #558
**Depends on:** STORY-153, which recomputed the other half of the course

A read-only pass recomputed every printed ratio, sum and derived figure in the 26 lessons of
Modules -1, 1, 2, 3, 4, 9 and 11, and compared every quiz question for modules -1 to 4 against the
lesson it came from. Five confirmed arithmetic errors are fixed here. The full findings list,
including the seven that are deliberately not fixed in this story, lives in
[`docs/audit-2026-09-23-lesson-arithmetic.md`](../audit-2026-09-23-lesson-arithmetic.md), which is
the durable record and should be read instead of this file for detail.

Clean results worth stating: Modules -1, 9 and 11 have no internal arithmetic contradictions, and
the module -1 to 4 quiz bank recomputes correctly against its source lessons, which is the part
`PR #554` converted to pesos last.

Why seven findings are recorded rather than fixed: each needs either a decision about what the
course teaches, where two lessons disagree by up to 4x and an agent should not pick a winner, or a
reading pass longer than the session that found them had room for. The largest of the two
decision items is the broad-versus-exact budget split in `2.4` against `4.1`.

DoD: `validate:lesson-production` 45/45, `validate:learning-release` pass, the 12 tests under
`src/domain/curriculum` pass, and no open finding in this story is left only in a chat log.
