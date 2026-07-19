# Layer wiring — current reality

The five layers as they are currently wired in `src/composition/container.ts`.

```mermaid
flowchart TB
  subgraph APP["src/app — Next.js App Router"]
    PAGES["Pages (RSC)\npublic + student + admin routes"]
    ACTIONS["Server actions\nsrc/app/actions/*.ts"]
    WEBHOOK["Route handler\n/api/webhooks/paymongo"]
  end

  subgraph COMPOSITION["src/composition/container.ts"]
    BUILD["buildContainer()\ncached singleton"]
    SCOPE["runWithContainer / getContainer\nAsyncLocalStorage"]
  end

  subgraph USECASES["src/usecases — feature classes"]
    UC["Auth, enrollment, courses,\nadmin CRUD, payments/refunds,\nsimulators, certificates..."]
  end

  subgraph PORTS["src/ports — interfaces, every method -> Result&lt;T,E&gt;"]
    PT["repositories/ payment/ email/\naccess/ security/ system/\nrendering/ simulator/"]
  end

  subgraph INFRA["src/infra — adapters"]
    REAL["Prisma*Repository\nPayMongoAdapter\nResendEmailSender\nReactPdfCertificateRenderer"]
    FAKE["InMemory* / Stub* / Fake*\nseveral still wired in prod"]
  end

  subgraph DOMAIN["src/domain — pure, zero deps"]
    DM["entities/ values/ shared/Result\nservices/ simulator/*"]
  end

  PAGES --> ACTIONS --> BUILD --> UC
  UC --> PT --> DM
  UC --> DM
  PT -.implemented by.-> REAL --> DM
  PT -.implemented by.-> FAKE
  WEBHOOK --> BUILD

  classDef gap stroke:#B91C1C,stroke-width:2px,fill:none,stroke-dasharray: 3 3;
  class FAKE gap
```

Dashed red = remaining production gaps. The webhook route now uses `buildContainer()`, and `courseRepo` is Prisma-backed. The still-in-memory production adapters are `orderRepo`, `moduleRepo`, `lessonRepo`, `discountCodeRepo`, `liveClassRepo`, `scenarioRepo`, `sessionRepo`, and `auditLog`.
