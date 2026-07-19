# Admin panel wiring — implemented surface

Layout mirrors the current `src/app/admin/*` tree. Admin routes are server components gated by `requireAdmin()` in `src/app/admin/layout.tsx`, with defense-in-depth checks in action/page boundaries.

```mermaid
flowchart LR
  BROWSER["Browser\n/admin/*"] --> LAYOUT["src/app/admin/layout.tsx\nrequireAdmin() gate"]
  LAYOUT --> ROUTES["admin routes\nusers · courses · modules · lessons\npayments · simulators · live-classes\ndiscount-codes · badges · settings"]
  ROUTES --> ACTIONS["Server actions\nsrc/app/actions/*"]
  ACTIONS --> ADMINUC["Admin* use cases\nlist/get/create/update/archive\n+ refund override + impersonation"]
  ADMINUC --> AP["IAccessPolicy\nrole check"]
  ADMINUC --> ALR["RecordAuditLog use case\nwrites audit entries"]
  AP --> TAP["TierAccessPolicy\nalready built, reused"]
  ALR --> IAL["InMemoryAuditLog\n(wired in production container)"]

  classDef built stroke:#FF6B35,stroke-width:2px,fill:none;
  classDef planned stroke:#D4D4D4,fill:none,stroke-dasharray: 4 3;
  class LAYOUT,ROUTES,ACTIONS,ADMINUC,ALR,AP,TAP built
  class IAL planned
```

Solid orange = implemented and wired. Dashed gray = remaining persistence gap. Admin audit writes are wired through `RecordAuditLog`, but the production container still uses `InMemoryAuditLog` rather than a Prisma-backed audit repository.
