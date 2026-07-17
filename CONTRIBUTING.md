# Contributing

This is a single-developer, docs-first project. The audience for contributions
is future-you, future-co-admins, and the AI agents that work in this repo.

## Ground Rules

1. **Read `AGENTS.md` first.** It is the rules file. Then read `CLAUDE.md` for
   the architecture summary. Then read `docs/build-spec.md` for the engineering
   build spec, layer by layer.
2. **Follow the SOLID contract.** It is enforced by the directory structure
   and the ESLint boundary rule. If a change requires a forbidden import,
   add a port — never disable the rule.
3. **One concern per commit.** Conventional commits. Reference the story ID
   in parentheses. Example: `feat(auth): SignIn use case (STORY-006)`.
4. **Tests are not optional.** A use case without a `buildTestContainer()`
   test is not done. A domain function without 100% branch coverage is not
   done.
5. **The voice is the voice.** Read `docs/voice-guide.md` before writing any
   copy. The ESLint rule catches the most common AI-slop phrases; the rest
   is on you.
6. **No AI features.** ADR-003. The ESLint rule `local/no-ai-packages`
   blocks `openai`, `anthropic`, `langchain`, and friends.
7. **No multi-tenant, no multi-currency, no subscriptions, no native app.**
   ADRs 015, 008, 009, 010. If your change needs any of these, open an ADR
   first.

## The Recipe for Adding a Feature

1. **Model the domain.** Add entities and value objects in `src/domain/<feature>/`.
   No imports from `app/` or `infra/`. Write tests next to the file. 100%
   branch coverage on the pure functions.
2. **Define the port(s).** Add interfaces in `src/ports/<concern>/`. Document
   postconditions. Write a `Fake*` in `src/infra/<concern>/fake/`. Test the
   fake matches the port contract.
3. **Write the use case.** Add a class in `src/usecases/<feature>/`.
   Constructor-inject the ports. Use `Result<T, E>`. Test with
   `buildTestContainer()`.
4. **Implement the adapter (if needed).** In `src/infra/<concern>/`. Wrap
   the real SDK. Map to and from domain types. Integration test against the
   real SDK.
5. **Wire it.** Add to `src/composition/container.ts`. Add to
   `buildTestContainer()` if relevant.
6. **Expose it.** Add a server action in `src/app/actions/<feature>.ts`
   (5–10 lines: parse with Zod, call the use case, return the `Result`) or
   a page in `src/app/(dashboard)/<feature>/page.tsx`.
7. **Add a story.** `docs/stories/STORY-XXX.md`. Acceptance criteria, files
   touched, code shape, pitfalls, verification, DoD.
8. **Open a PR.** Conventional commit, story ID in parentheses, CI green.

## Pull Request Checklist

Use the PR template at `.github/PULL_REQUEST_TEMPLATE.md`. The CI will run
typecheck, lint, unit + integration tests, coverage gates, e2e (if
applicable), and the build. Squash merge to `main`. Branch is auto-deleted
on merge (per repo settings).

## Reporting Issues

- Bugs: `.github/ISSUE_TEMPLATE/bug_report.md`
- Features: `.github/ISSUE_TEMPLATE/feature_request.md`
- Stories (sprint planning): `.github/ISSUE_TEMPLATE/story.md`

Security issues: do not open a public issue. Email `projectamazonph@gmail.com`
per `.github/SECURITY.md`.

## Code of Conduct

`.github/CODE_OF_CONDUCT.md`. Be kind. Be specific. Disagree with the argument,
not the person.

## License

Proprietary. See `LICENSE`. No outside contributions accepted without prior
written permission.
