# Admin panel wiring — planned (Sprint 10, nothing built)

Layout per `docs/admin-backend.md` §"What Lives Where". No `src/app/admin` directory, no `requireAdmin()`, and no `AuditLogRepository`/`SettingsRepository` ports exist yet.

```mermaid
flowchart LR
  BROWSER["Browser\n/admin/*"] --> LAYOUT["src/app/admin/layout.tsx\nrequireAdmin() gate"]
  LAYOUT --> ROUTES["~40 routes\nusers · courses · payments · refunds\nsimulators · live-classes\ndiscount-codes · badges · audit-log · settings"]
  ROUTES --> ADMINUC["Admin* use cases\nAdminIssueRefund, AdminExportAuditLog\nAdminImpersonate, AdminUpdateSettings"]
  ADMINUC --> AP["IAccessPolicy\nrole check"]
  ADMINUC --> ALR["AuditLogRepository\nport not created"]
  ADMINUC --> SR["SettingsRepository\nport not created"]
  AP --> TAP["TierAccessPolicy\nalready built, reused"]
  ALR --> PALR["PrismaAuditLogRepository\nnot built -- AuditLog table\nexists in schema, unused"]
  SR --> PSR["PrismaSettingsRepository\nnot built -- no Settings\nmodel in schema either"]

  classDef built stroke:#FF6B35,stroke-width:2px,fill:none;
  classDef planned stroke:#D4D4D4,fill:none,stroke-dasharray: 4 3;
  class TAP built
  class LAYOUT,ROUTES,ADMINUC,ALR,SR,PALR,PSR planned
```

Solid orange = the one piece that already exists and gets reused as-is (**TierAccessPolicy**). Everything dashed is Sprint 10 scope per `docs/sprint-plan.md` — including a **SettingsRepository** port and **Settings** Prisma model that don't exist yet at all.
