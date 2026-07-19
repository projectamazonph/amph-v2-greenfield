# STORY-050d: Discount codes (admin CRUD)

**Sprint:** 10
**Points:** 1
**Epic:** Admin panel
**Depends on:** STORY-050a (audit log writes for discount code CRUD)
**Blocks:** none

## Status

- **Story**: STORY-050d
- **Sprint**: 10 — Admin panel
- **Points**: 1
- **Status**: Pending (split from original STORY-050)

## Why split

See STORY-050a.

## Goal

Ship the admin discount code CRUD surface. The student-side use case (`ApplyDiscountCode`) already exists; the admin needs to be able to create / update / archive discount codes.

## Acceptance Criteria

- [ ] `DiscountCode` entity already exists. Confirm the create/update factories exist (if not, add them).
- [ ] `IDiscountCodeRepository` already exists. Add `listAll`, `create`, `update`, `archive` (or `delete`).
- [ ] 4 use cases: `AdminListDiscountCodes`, `CreateDiscountCode`, `UpdateDiscountCode`, `ArchiveDiscountCode`
- [ ] All TDD
- [ ] Audit log writes
- [ ] Admin pages: list, new, detail, edit
- [ ] Container wiring

## Pitfalls

- The existing `ApplyDiscountCode` use case must keep working (student-side flow).
- Discount code validation rules: percent vs fixed, expiry date, max uses, course-specific vs global.

## Out of scope

- Discount code usage analytics
- Bulk discount code generation
- Discount code email campaigns
