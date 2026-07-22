# STORY-013 — Content Import Script

## Goal

Read MDX lesson files from the AMPH curriculum source directory, parse frontmatter, and upsert Module + Lesson rows into the Postgres database. This seeds the public catalog with real curriculum content in a single runnable command.

## Scope

### What is in scope

- `scripts/import-amph-content.ts` — standalone Node.js script (not a Next.js route)
- `IAmphContentReader` port — abstracts the filesystem + MDX parsing so the use case stays testable
- `ContentIdGenerator` port — deterministic ID generation for idempotent upserts
- `ImportAmphContent` use case — the orchestration logic: maps MDX frontmatter → Module/Lesson entities → repo upserts
- `NodeContentReader` adapter — production `IAmphContentReader` (gray-matter + node:fs)
- `Md5ContentIdGenerator` adapter — production `ContentIdGenerator` (Node crypto)
- Course creation — two courses (`ppc-foundations`, `accelerated-mastery`) are created if they don't exist
- Module → course mapping:
  - Module numbers 0–4 → course `ppc-foundations`
  - Module numbers 5–8 → course `accelerated-mastery`
- Unit tests for `ImportAmphContent` with a `FakeAmphContentReader`
- `pnpm import:content` npm script entry point

### What is out of scope

- Module/lesson deletion (only upsert — idempotent re-runs)
- MDX rendering (STORY-012)
- Any Next.js App Router code
- Any billing or enrollment wiring

## Code shape

```
src/domain/ports/content/
  IAmphContentReader.ts       ← port: readAll() returns MdxFile[]

src/ports/system/
  ContentIdGenerator.ts       ← port: generateId(...parts) for deterministic IDs

src/usecases/
  ImportAmphContent.ts        ← orchestrator: parse + upsert modules + lessons

src/infra/content/
  NodeContentReader.ts        ← production IAmphContentReader (gray-matter + node:fs)

src/infra/system/
  Md5ContentIdGenerator.ts    ← production ContentIdGenerator (Node crypto)

scripts/
  import-amph-content.ts      ← CLI entry point; wires Prisma + GrayMatter + script
```

### `IAmphContentReader` port

```ts
// Input from an MDX file's frontmatter (gray-matter parsed)
export interface MdxFrontmatter {
  title: string;
  slug: string; // e.g. "1.1-read-ppc-data-before-you-change-it"
  moduleNumber: number; // 0–8
  lessonNumber: number; // 1–N
  type: string; // "reading" → TEXT, "video" → VIDEO, etc.
  estimatedMinutes: number;
  xpReward: number;
}

export interface MdxFile {
  readonly dirSlug: string; // e.g. "1-foundations"
  readonly fileSlug: string; // e.g. "1.1-read-ppc-data-before-you-change-it"
  readonly frontmatter: MdxFrontmatter;
  readonly body: string; // raw MDX body (after frontmatter)
}

export interface IAmphContentReader {
  /**
   * Walk the content directory and return all discovered MDX files
   * grouped by course slug. Each course slug maps to a list of files
   * in display order (sorted by moduleNumber, then lessonNumber).
   */
  readAll(): Promise<
    Result<readonly { courseSlug: string; files: readonly MdxFile[] }[], ContentReadError>
  >;
}

export type ContentReadError =
  { kind: "read_error"; message: string } | { kind: "parse_error"; message: string; file: string };
```

### `ImportAmphContent` use case

```ts
export interface ImportAmphContentResult {
  readonly coursesCreated: number;
  readonly modulesUpserted: number;
  readonly lessonsUpserted: number;
}

export type ImportAmphContentError =
  | { kind: "course_creation_failed"; message: string }
  | { kind: "read_error"; message: string }
  | { kind: "db_error"; message: string };

export class ImportAmphContent {
  constructor(options: {
    contentReader: IAmphContentReader;
    courseRepo: CourseRepository;
    moduleRepo: IModuleRepository;
    lessonRepo: ILessonRepository;
    idGen: ContentIdGenerator;
  }) { ... }

  execute(): Promise<Result<ImportAmphContentResult, ImportAmphContentError>> { ... }
}
```

**Business rules:**

- Module IDs are stable: `idGen.generateId("module:" + courseSlug + ":" + moduleNumber)` — same module re-runs produce the same ID (upsert semantics)
- Lesson IDs are stable: `idGen.generateId("lesson:" + moduleId + ":" + lessonSlug)` — same lesson re-runs produce the same ID
- Lesson type mapping: `reading`/`text` → `TEXT`, `video` → `VIDEO`, `quiz` → `QUIZ`, unknown → `TEXT`
- `Lesson.content` shape: TEXT → `{ body }`, VIDEO → `{ durationMinutes }` (matches the Lesson entity validation)
- `estimatedMinutes` and `xpReward` from frontmatter are NOT stored in `Lesson.content` — they live only in the MDX frontmatter and are intended to be re-applied at the lesson page render (STORY-026) via the MDX component frontmatter, or via a follow-up metadata column. **Follow-up: STORY-013.1** — add `estimatedMinutes` / `xpReward` as first-class fields on the Lesson entity (requires schema migration).
- If a course doesn't exist, it is created with a stub curriculum (`DRAFT` status, priceMinor=0) so the Course entity validation passes
- If a module already exists, its title and displayOrder are updated (upsert)
- If a lesson already exists, its title and displayOrder are updated (upsert)
- `findBySlug` returning `not_found` is treated as a normal "doesn't exist yet" signal, not a DB error

### `scripts/import-amph-content.ts`

- Reads `CONTENT_ROOT` env var (defaults to `D:\Web Project\amph-v2\content\curriculum\modules`)
- Creates `PrismaCourseRepository`, `PrismaModuleRepository`, `PrismaLessonRepository`
- Creates a `NodeContentReader` (implements `IAmphContentReader` using Node.js `fs` + `gray-matter`)
- Runs `ImportAmphContent`
- Prints a summary table (courses created, modules upserted, lessons upserted)
- Exits 0 on success, exits 1 on error

## Acceptance criteria

- [x] `pnpm import:content` runs without errors against the real content directory
- [x] `ppc-foundations` course has modules 0–4 (5 modules)
- [x] `accelerated-mastery` course has modules 5–8 (4 modules)
- [x] All 31 MDX files produce exactly 31 Lesson rows
- [x] Re-running the script is idempotent (no duplicate modules or lessons)
- [x] `pnpm typecheck` passes
- [x] `pnpm lint` passes
- [x] 11 unit tests for `ImportAmphContent` cover happy path + idempotency + module grouping + title derivation + lesson type mapping + read errors
- [x] Conventional commit: `feat(content): import amph content from MDX files (STORY-013)`

## Dependencies

- `gray-matter@^4.0.3` — frontmatter parsing (installed by STORY-012)
- `tsx@^4.23.1` — TypeScript script execution (added as devDep in this story)
- No new runtime dependencies

## Pitfalls (actual)

- `estimatedMinutes`/`xpReward` live in frontmatter but the `Lesson` entity has no fields for them — the Lesson entity's content validation strips them, so they are NOT stored in `Lesson.content` today. STORY-013.1 follow-up.
- Gray-matter always lowercases YAML booleans; `type: "reading"` is safe.
- The two-course split (modules 0–4 vs 5–8) is hardcoded in `courseSlugForModule`; if the source content structure changes, the mapping must be updated.
- `findBySlug` returning `not_found` must be treated as "doesn't exist yet", not as a DB error — easy to get wrong on first read.
- `createCourse` requires a non-empty curriculum (the `isValidCurriculum` check), so the script creates a stub section+lesson on first run.
- The script does NOT go through the composition container — it constructs its own Prisma client and repos so it can run from CI / a developer terminal without an active Next.js process.
