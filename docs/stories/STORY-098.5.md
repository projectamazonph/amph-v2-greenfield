# STORY-098.5: Download center file upload + file management

**Points:** 1
**Epic:** Content library gap closure (follow-up to STORY-098, same session)

## Status

**Status:** Done — 2026-08-03.

## Goal

STORY-098 shipped the download center with admin-pasted external
links only (Google Drive/Sheets, or a static asset already in
`public/`). This story adds real file upload — an admin can attach a
file directly instead of hosting it elsewhere — plus the file
management operations that come with owning uploaded bytes: replacing
a file (old copy is deleted, not orphaned) and permanently purging a
resource (removes the row and its uploaded file together).

## What shipped

- `src/ports/storage/IFileStorage.ts` — generic upload/delete port,
  not resource-specific, so any future upload feature can reuse it.
  `upload({ key, data, contentType })` → `{ url, key }`; `delete(key)`
  is best-effort (deleting a missing key is not an error).
- Three adapters in `src/infra/storage/`:
  - `InMemoryFileStorage` — test fake.
  - `LocalFileStorage` — writes to `public/uploads/<key>` on local
    disk, returns a root-relative `/uploads/<key>` URL. Dev-only: read
    the docblock — Vercel's serverless functions have a read-only
    filesystem outside `/tmp`, and `/tmp` doesn't persist across
    invocations, so this adapter's writes are lost in production.
  - `VercelBlobFileStorage` — the real production adapter, backed by
    `@vercel/blob` (new dependency). Needs `BLOB_READ_WRITE_TOKEN`.
- `buildContainer()` picks `VercelBlobFileStorage` when
  `BLOB_READ_WRITE_TOKEN` is set, else falls back to
  `LocalFileStorage` — so uploads work in `pnpm dev` out of the box,
  and upgrade to real persistent storage the moment a Blob store is
  provisioned on the Vercel project, no code change needed.
- `Resource.fileKey: string | null` (new column, folded into the same
  `20260803000000_resource` migration rather than a second one, since
  the table had not shipped to any deployed environment yet). Non-null
  only when the file was uploaded via `IFileStorage`; null for
  pre-installed static assets and admin-pasted external links — in
  both of those cases we don't own the file and have nothing to
  delete on our end.
- `Resource.fileUrl` validation (`isValidUrl` in
  `src/domain/entities/Resource.ts`) now also accepts root-relative
  paths (`/downloads/...`, `/uploads/...`) alongside absolute http(s)
  URLs — same-origin static/uploaded assets don't need a full URL, and
  a relative path is actually more portable (works the same on
  localhost, preview deploys, and the production domain without an
  app-URL env var).
- Use cases: `UploadFile`, `DeleteFile` (generic, thin wrappers over
  `IFileStorage`), `PurgeResource` (hard-deletes the row via the new
  `IResourceRepository.hardDelete()`, then deletes the uploaded file
  from storage if `fileKey` was set — file cleanup is best-effort and
  happens after the row is gone). `UpdateResource` now also takes
  `fileStorage` as a dependency: when a patch swaps in a different
  `fileKey`, the previously-owned file is deleted after the DB update
  succeeds (best-effort, fire-and-forget — a failed cleanup orphans a
  blob, which is a cost problem, not a correctness one).
- `resource.purged` / `resource.purge_failed` added to `AuditAction`.
- Admin forms (`/admin/resources/new`, `/admin/resources/[id]/edit`):
  a file input alongside the existing URL field — "upload a file, or
  paste an external link; if you upload one, it wins." The edit page
  also gained a second danger-zone action, "Permanently delete"
  (separate from "Unpublish"), which calls the new
  `purgeResourceAction`.
- `createResource.action.ts`/`updateResource.action.ts` now accept an
  optional `File`; when present, `resourceFileUpload.helper.ts`
  (shared, not itself a server action) builds a
  `resources/<resourceId>/<sanitized filename>` storage key, uploads
  via `container.uploadFile`, and feeds the resulting `fileUrl`/
  `fileKey` into the create/update call.
- `GET /api/resources/[id]/download` now resolves a relative `fileUrl`
  against the request's own origin (`new URL(fileUrl, req.url)`)
  before redirecting, since `NextResponse.redirect` requires an
  absolute URL — the only HTTP-specific addition; the route otherwise
  stays as thin as STORY-098 left it.

## Known limitations

- `LocalFileStorage` uploads don't survive a Vercel redeploy or even
  a second serverless invocation — it's a local-dev convenience, not
  a production fallback. Until `BLOB_READ_WRITE_TOKEN` is provisioned,
  admin file uploads in a deployed environment will appear to succeed
  but the file won't actually be retrievable afterward. This is
  flagged in the adapter's docblock and in `.env.example`, not hidden.
- No file-size limit or content-type allowlist is enforced anywhere in
  this pass — an admin could upload an arbitrarily large or
  arbitrarily-typed file. Acceptable for now because only admins (not
  students) can reach the upload path, but worth adding before this
  is opened to any less-trusted role.
- Orphan cleanup (old file on replace, file on purge) is fire-and-forget
  with no retry — a failed delete leaves a blob nobody references.
  There's no periodic reconciliation job to catch these; low priority
  since it's a storage-cost problem, not a correctness or security one.

## Verification

```bash
pnpm tsc --noEmit
pnpm lint
DATABASE_URL="postgresql://test:test@localhost:5432/amph_test" \
JWT_SECRET="test-secret-at-least-32-bytes-long-please" \
  pnpm test
pnpm test:arch
pnpm build
```

All green (3464 passed / 2 skipped, up from 3425/2 after STORY-098
alone). Also smoke-tested with `pnpm dev`: the pre-installed static
assets under `public/downloads/` serve with correct `Content-Type`
headers, and `/resources`, `/admin/resources`, `/admin/resources/new`,
and `GET /api/resources/[id]/download` all behave the same as their
STORY-098 baseline (redirect/401 for unauthenticated requests).
