# Layer wiring — current reality

The five layers as they are actually wired in `src/composition/container.ts` today, including the two production gaps documented in `CLAUDE.md`: `courseRepo`/`orderRepo` resolve to in-memory implementations, and the PayMongo webhook route never touches the container at all.

```mermaid
flowchart TB
  subgraph APP["src/app — Next.js App Router"]
    PAGES["Pages (RSC)\n7 routes built"]
    ACTIONS["Server actions\nsrc/app/actions/*.ts"]
    WEBHOOK["Route handler\n/api/webhooks/paymongo"]
  end

  subgraph COMPOSITION["src/composition/container.ts"]
    BUILD["buildContainer()\ncached singleton"]
    SCOPE["runWithContainer / getContainer\nAsyncLocalStorage"]
  end

  subgraph USECASES["src/usecases — 18 classes"]
    UC["SignUp, Login, EnrollStudent,\nCreatePaymentIntent, IssueCertificate,\nRecordQuizAttempt, AwardBadge ..."]
  end

  subgraph PORTS["src/ports — interfaces, every method -> Result&lt;T,E&gt;"]
    PT["repositories/ payment/ email/\naccess/ security/ system/\nrendering/ simulator/"]
  end

  subgraph INFRA["src/infra — adapters"]
    REAL["Prisma*Repository\nPayMongoAdapter\nResendEmailSender\nReactPdfCertificateRenderer"]
    FAKE["InMemory* / Stub* / Fake*\ntest fakes -- 2 stuck in prod"]
  end

  subgraph DOMAIN["src/domain — pure, zero deps"]
    DM["entities/ values/ shared/Result\nservices/ simulator/*"]
  end

  PAGES --> ACTIONS --> BUILD --> UC
  UC --> PT --> DM
  UC --> DM
  PT -.implemented by.-> REAL --> DM
  PT -.implemented by.-> FAKE
  WEBHOOK -. own InMemory* repos, bypasses container .-> FAKE

  classDef gap stroke:#B91C1C,stroke-width:2px,fill:none,stroke-dasharray: 3 3;
  class WEBHOOK,FAKE gap
```

Dashed red = the known gap. **courseRepo** and **orderRepo** resolve to `InMemory*` inside `buildProductionContainer()` — courses and orders are not Postgres-backed in production yet. The webhook route re-instantiates its own `InMemory*` repos per request, so it cannot see orders created anywhere else in the app (there's a literal `TODO: wire Prisma* repos in STORY-023 follow-up` in that file).
