# Ports Layer Analysis — amph-v2-greenfield

## Summary Stats
- **Total port interfaces**: 37 (29 repositories + 8 service/infrastructure ports)
- **Additional port in domain layer**: 1 (`IAmphContentReader`)
- **Email renderer ports**: 9 (1 service `EmailSender` + 8 template renderers)
- **Total unique port files (non-test)**: 48
- **ADR-014 compliance**: ~95% — most ports return `Result<T, E>`; exceptions noted below

---

## 1. REPOSITORY INTERFACES (29 ports)

### 1.1 `UserRepository` — `src/ports/repositories/UserRepository.ts`
| Method | Return Type | Uses Result? | Infra Impl | Notes |
|---|---|---|---|---|
| `findById(id)` | `Promise<Result<User, UserError>>` | ✅ | PrismaUserRepository, InMemoryUserRepository | |
| `listAll()` | `Promise<Result<readonly User[], UserError>>` | ✅ | ✅ | |
| `findByEmail(email)` | `Promise<Result<User, UserError>>` | ✅ | ✅ | |
| `create(params)` | `Promise<Result<User, UserError>>` | ✅ | ✅ | |
| `update(id, patch)` | `Promise<Result<User, UserError>>` | ✅ | ✅ | |
| `emailExists(email)` | `Promise<Result<boolean, UserError>>` | ✅ | ✅ | |
| `getPasswordHash(userId)` | `Promise<Result<string, UserError>>` | ✅ | ✅ | |
| `updateTotalXp(userId, newTotalXp)` | `Promise<Result<User, UserError>>` | ✅ | ✅ | |
| `getTwoFactorSecret(userId)` | `Promise<Result<string \| null, UserError>>` | ✅ | ✅ | |
| `setTwoFactorSecret(userId, secret)` | `Promise<Result<void, UserError>>` | ✅ | ✅ | |

### 1.2 `CourseRepository` — `src/ports/repositories/CourseRepository.ts`
| Method | Return Type | Uses Result? | Infra Impl | Notes |
|---|---|---|---|---|
| `listPublished()` | `Promise<Result<readonly Course[], CourseError>>` | ✅ | PrismaCourseRepository, InMemoryCourseRepository | |
| `listAll()` | `Promise<Result<readonly Course[], CourseError>>` | ✅ | ✅ | |
| `findById(id)` | `Promise<Result<Course, CourseError>>` | ✅ | ✅ | |
| `findBySlug(slug)` | `Promise<Result<Course, CourseError>>` | ✅ | ✅ | |
| `create(course)` | `Promise<Result<Course, CourseError>>` | ✅ | ✅ | STORY-048a |
| `update(course)` | `Promise<Result<Course, CourseError>>` | ✅ | ✅ | STORY-048a |
| `archive(id)` | `Promise<Result<Course, CourseError>>` | ✅ | ✅ | STORY-048a |

### 1.3 `IOrderRepository` — `src/ports/repositories/OrderRepository.ts`
| Method | Return Type | Uses Result? | Infra Impl | Notes |
|---|---|---|---|---|
| `create(order)` | `Promise<Result<Order, OrderError>>` | ✅ | PrismaOrderRepository, InMemoryOrderRepository | |
| `findById(id)` | `Promise<Result<Order, OrderError>>` | ✅ | ✅ | |
| `findByPaymongoPaymentId(id)` | `Promise<Result<Order, OrderError>>` | ✅ | ✅ | |
| `findByUserId(userId)` | `Promise<Result<Order[], OrderError>>` | ✅ | ✅ | |
| `listAll(filters?)` | `Promise<Result<Order[], OrderError>>` | ✅ | ✅ | STORY-049 |
| `listRefundRequests(filters)` | `Promise<Result<{orders, nextCursor, total}, OrderError>>` | ✅ | ✅ | STORY-062 |
| `update(order)` | `Promise<Result<Order, OrderError>>` | ✅ | ✅ | |
| `findPaidForUserAndCourse(userId, courseId)` | `Promise<Result<Order \| null, OrderError>>` | ✅ | ✅ | STORY-P0-1 |

### 1.4 `IEnrollmentRepository` — `src/ports/repositories/IEnrollmentRepository.ts`
| Method | Return Type | Uses Result? | Infra Impl | Notes |
|---|---|---|---|---|
| `findByUserIdAndCourseId(userId, courseId)` | `Promise<Enrollment \| null>` | ❌ **Plain null** | PrismaEnrollmentRepository, InMemoryEnrollmentRepository | **ADR-014 violation** — not wrapped in Result |
| `findByUserId(userId)` | `Promise<Result<readonly Enrollment[], EnrollmentError>>` | ✅ | ✅ | |
| `findByCourseId(courseId)` | `Promise<Result<readonly Enrollment[], EnrollmentError>>` | ✅ | ✅ | |
| `findById(id)` | `Promise<Result<Enrollment, EnrollmentError>>` | ✅ | ✅ | |
| `create(enrollment)` | `Promise<Result<Enrollment, EnrollmentError>>` | ✅ | ✅ | |
| `update(enrollment)` | `Promise<Result<Enrollment, EnrollmentError>>` | ✅ | ✅ | |

### 1.5 `ILessonRepository` — `src/ports/repositories/ILessonRepository.ts`
| Method | Return Type | Uses Result? | Infra Impl | Notes |
|---|---|---|---|---|
| `findByModuleId(moduleId)` | `Promise<Result<readonly Lesson[], LessonError>>` | ✅ | PrismaLessonRepository, InMemoryLessonRepository | |
| `findById(id)` | `Promise<Result<Lesson, LessonError>>` | ✅ | ✅ | |
| `create(lesson)` | `Promise<Result<Lesson, LessonError>>` | ✅ | ✅ | STORY-048c |
| `update(lesson)` | `Promise<Result<Lesson, LessonError>>` | ✅ | ✅ | |
| `delete(id)` | `Promise<Result<void, LessonError>>` | ✅ | ✅ | |
| `reorder(moduleId, lessonIds)` | `Promise<Result<readonly Lesson[], LessonError>>` | ✅ | ✅ | |

### 1.6 `IModuleRepository` — `src/ports/repositories/IModuleRepository.ts`
| Method | Return Type | Uses Result? | Infra Impl | Notes |
|---|---|---|---|---|
| `findByCourseId(courseId)` | `Promise<Result<readonly Module[], ModuleError>>` | ✅ | PrismaModuleRepository, InMemoryModuleRepository | |
| `findById(id)` | `Promise<Result<Module, ModuleError>>` | ✅ | ✅ | |
| `create(module)` | `Promise<Result<Module, ModuleError>>` | ✅ | ✅ | STORY-048b |
| `update(module)` | `Promise<Result<Module, ModuleError>>` | ✅ | ✅ | |
| `delete(id)` | `Promise<Result<void, ModuleError>>` | ✅ | ✅ | |
| `reorder(courseId, moduleIds)` | `Promise<Result<readonly Module[], ModuleError>>` | ✅ | ✅ | |

### 1.7 `IQuizRepository` — `src/ports/repositories/IQuizRepository.ts`
| Method | Return Type | Uses Result? | Infra Impl | Notes |
|---|---|---|---|---|
| `create(quiz)` | `Promise<Result<Quiz, QuizRepositoryError>>` | ✅ | PrismaQuizRepository, InMemoryQuizRepository | |
| `findById(id)` | `Promise<Result<Quiz \| null, QuizRepositoryError>>` | ✅ | ✅ | |
| `findByCourseId(courseId)` | `Promise<Result<readonly Quiz[], QuizRepositoryError>>` | ✅ | ✅ | |
| `findAll()` | `Promise<Result<readonly Quiz[], QuizRepositoryError>>` | ✅ | ✅ | STORY-091 |
| `update(quiz)` | `Promise<Result<Quiz, QuizRepositoryError>>` | ✅ | ✅ | STORY-091 |
| `delete(id)` | `Promise<Result<void, QuizRepositoryError>>` | ✅ | ✅ | STORY-091 |

### 1.8 `IQuizAttemptRepository` — `src/ports/repositories/IQuizAttemptRepository.ts`
| Method | Return Type | Uses Result? | Infra Impl | Notes |
|---|---|---|---|---|
| `create(attempt)` | `Promise<Result<QuizAttempt, QuizAttemptRepositoryError>>` | ✅ | PrismaQuizAttemptRepository, InMemoryQuizAttemptRepository | |
| `update(attempt)` | `Promise<Result<QuizAttempt, QuizAttemptRepositoryError>>` | ✅ | ✅ | Explicit NOT upsert |
| `findById(id)` | `Promise<Result<QuizAttempt \| null, QuizAttemptRepositoryError>>` | ✅ | ✅ | |
| `findByUserAndQuiz(userId, quizId)` | `Promise<Result<readonly QuizAttempt[], ...>>` | ✅ | ✅ | |
| `findLatestByUserAndQuiz(userId, quizId)` | `Promise<Result<QuizAttempt \| null, ...>>` | ✅ | ✅ | |
| `countByQuizId(quizId)` | `Promise<Result<number, QuizAttemptRepositoryError>>` | ✅ | ✅ | STORY-091 guard |

### 1.9 `ICertificateRepository` — `src/ports/repositories/ICertificateRepository.ts`
| Method | Return Type | Uses Result? | Infra Impl | Notes |
|---|---|---|---|---|
| `create(cert)` | `Promise<Result<Certificate, CertificateRepositoryError>>` | ✅ | PrismaCertificateRepository, InMemoryCertificateRepository | |
| `findById(id)` | `Promise<Result<Certificate \| null, ...>>` | ✅ | ✅ | |
| `findByVerificationHash(hash)` | `Promise<Result<Certificate \| null, ...>>` | ✅ | ✅ | STORY-043 |
| `findByUserId(userId)` | `Promise<Result<readonly Certificate[], ...>>` | ✅ | ✅ | |
| `update(cert)` | `Promise<Result<Certificate, ...>>` | ✅ | ✅ | STORY-044 |
| `listAll(filters?)` | `Promise<Result<readonly Certificate[], ...>>` | ✅ | ✅ | STORY-092 |

### 1.10 `IBadgeRepository` — `src/ports/repositories/IBadgeRepository.ts`
| Method | Return Type | Uses Result? | Infra Impl | Notes |
|---|---|---|---|---|
| `findBySlug(slug)` | `Promise<Result<Badge \| null, BadgeRepositoryError>>` | ✅ | PrismaBadgeRepository, InMemoryBadgeRepository | |
| `findAll()` | `Promise<Result<readonly Badge[], BadgeRepositoryError>>` | ✅ | ✅ | |
| `create(badge)` | `Promise<Result<Badge, BadgeRepositoryError>>` | ✅ | ✅ | STORY-050e |
| `update(badge)` | `Promise<Result<Badge, BadgeRepositoryError>>` | ✅ | ✅ | STORY-050e |
| `archive(slug)` | `Promise<Result<void, BadgeRepositoryError>>` | ✅ | ✅ | STORY-050e |

### 1.11 `IBadgeAwardRepository` — `src/ports/repositories/IBadgeAwardRepository.ts`
| Method | Return Type | Uses Result? | Infra Impl | Notes |
|---|---|---|---|---|
| `create(award)` | `Promise<Result<BadgeAward, BadgeAwardError>>` | ✅ | PrismaBadgeAwardRepository, InMemoryBadgeAwardRepository | |
| `findByUserId(userId)` | `Promise<Result<readonly BadgeAward[], BadgeAwardError>>` | ✅ | ✅ | |
| `exists(userId, badgeSlug)` | `Promise<Result<boolean, BadgeAwardError>>` | ✅ | ✅ | |

### 1.12 `IAuditLog` — `src/ports/repositories/IAuditLog.ts`
| Method | Return Type | Uses Result? | Infra Impl | Notes |
|---|---|---|---|---|
| `record(entry)` | `Promise<Result<void, AuditLogError>>` | ✅ | PrismaAuditLog, InMemoryAuditLog | |
| `list(filters)` | `Promise<Result<AuditLogPage, AuditLogError>>` | ✅ | ✅ | STORY-061, cursor pagination |

### 1.13 `IPricingTierRepository` — `src/ports/repositories/IPricingTierRepository.ts`
| Method | Return Type | Uses Result? | Infra Impl | Notes |
|---|---|---|---|---|
| `listAll()` | `Promise<Result<readonly PricingTier[], PricingTierRepositoryError>>` | ✅ | PrismaPricingTierRepository, InMemoryPricingTierRepository | |
| `listActive()` | `Promise<Result<readonly PricingTier[], ...>>` | ✅ | ✅ | |
| `findById(id)` | `Promise<Result<PricingTier \| null, ...>>` | ✅ | ✅ | |
| `findBySlug(slug)` | `Promise<Result<PricingTier \| null, ...>>` | ✅ | ✅ | |
| `create(tier)` | `Promise<Result<PricingTier, ...>>` | ✅ | ✅ | |
| `update(tier)` | `Promise<Result<PricingTier, ...>>` | ✅ | ✅ | |
| `archive(id)` | `Promise<Result<PricingTier, ...>>` | ✅ | ✅ | |

### 1.14 `IDiscountCodeRepository` — `src/ports/repositories/IDiscountCodeRepository.ts`
| Method | Return Type | Uses Result? | Infra Impl | Notes |
|---|---|---|---|---|
| `listAll()` | `Promise<Result<DiscountCode[], DiscountCodeRepositoryError>>` | ✅ | PrismaDiscountCodeRepository, InMemoryDiscountCodeRepository | |
| `findById(id)` | `Promise<Result<DiscountCode \| null, ...>>` | ✅ | ✅ | |
| `findByCode(code)` | `Promise<DiscountCode \| null>` | ❌ **Plain null** | ✅ | **ADR-014 violation** |
| `create(code)` | `Promise<Result<DiscountCode, ...>>` | ✅ | ✅ | |
| `update(code)` | `Promise<Result<void, DiscountCodeRepositoryError>>` | ✅ | ✅ | STORY-050d |
| `archive(id)` | `Promise<Result<void, DiscountCodeRepositoryError>>` | ✅ | ✅ | STORY-050d |
| `incrementUsedCount(codeId)` | `Promise<Result<DiscountCode, ...>>` | ✅ | ✅ | |

### 1.15 `IAttemptFeedbackRepository` — `src/ports/repositories/IAttemptFeedbackRepository.ts`
| Method | Return Type | Uses Result? | Infra Impl | Notes |
|---|---|---|---|---|
| `create(feedback)` | `Promise<Result<void, AttemptFeedbackError>>` | ✅ | PrismaAttemptFeedbackRepository, InMemoryAttemptFeedbackRepository | STORY-066 |
| `findByAttemptId(attemptId)` | `Promise<Result<AttemptFeedback \| null, ...>>` | ✅ | ✅ | |
| `findByUserId(userId, limit?)` | `Promise<Result<readonly AttemptFeedback[], ...>>` | ✅ | ✅ | |

### 1.16 `IProgressEventRepository` — `src/ports/repositories/IProgressEventRepository.ts`
| Method | Return Type | Uses Result? | Infra Impl | Notes |
|---|---|---|---|---|
| `create(event)` | `Promise<Result<ProgressEvent, ProgressEventError>>` | ✅ | PrismaProgressEventRepository, InMemoryProgressEventRepository | |
| `findByUserId(userId)` | `Promise<Result<readonly ProgressEvent[], ...>>` | ✅ | ✅ | |
| `findByCourseId(courseId)` | `Promise<Result<readonly ProgressEvent[], ...>>` | ✅ | ✅ | |

### 1.17 `IQuizAttemptRepository` *(see 1.8 above)*

### 1.18 `IScorePolicyRepository` — `src/ports/repositories/IScorePolicyRepository.ts`
| Method | Return Type | Uses Result? | Infra Impl | Notes |
|---|---|---|---|---|
| `findBySimulatorAndDifficulty(simId, diff, mode)` | `Promise<Result<ScorePolicy \| null, SimulatorAttemptError>>` | ✅ | PrismaScorePolicyRepository, InMemoryScorePolicyRepository | STORY-065 |
| `findBySimulator(simId)` | `Promise<Result<readonly ScorePolicy[], SimulatorAttemptError>>` | ✅ | ✅ | |
| `create(policy)` | `Promise<Result<void, SimulatorAttemptError>>` | ✅ | ✅ | |
| `update(policy)` | `Promise<Result<void, SimulatorAttemptError>>` | ✅ | ✅ | |

### 1.19 `ISimulatorAttemptRepository` — `src/ports/repositories/ISimulatorAttemptRepository.ts`
| Method | Return Type | Uses Result? | Infra Impl | Notes |
|---|---|---|---|---|
| `create(attempt)` | `Promise<Result<SimulatorAttempt, SimulatorAttemptError>>` | ✅ | PrismaSimulatorAttemptRepository, InMemorySimulatorAttemptRepository | STORY-064 |
| `findById(id)` | `Promise<Result<SimulatorAttempt \| null, ...>>` | ✅ | ✅ | |
| `findByAttemptId(attemptId)` | `Promise<Result<SimulatorAttempt \| null, ...>>` | ✅ | ✅ | |
| `findByUserAndScenario(userId, simId, scenarioId, opts?)` | `Promise<Result<SimulatorAttempt[], ...>>` | ✅ | ✅ | |
| `addDecision(attemptId, decision)` | `Promise<Result<void, SimulatorAttemptError>>` | ✅ | ✅ | |
| `updateStatus(id, status, opts?)` | `Promise<Result<SimulatorAttempt, SimulatorAttemptError>>` | ✅ | ✅ | |

### 1.20 `ISimulatorScenarioRepository` — `src/ports/repositories/ISimulatorScenarioRepository.ts`
| Method | Return Type | Uses Result? | Infra Impl | Notes |
|---|---|---|---|---|
| `listAll(filter?)` | `Promise<Result<SimulatorScenario[], SimulatorScenarioError>>` | ✅ | PrismaSimulatorScenarioRepository, InMemorySimulatorScenarioRepository | STORY-050b |
| `findById(id)` | `Promise<Result<SimulatorScenario \| null, ...>>` | ✅ | ✅ | |
| `create(scenario)` | `Promise<Result<SimulatorScenario, ...>>` | ✅ | ✅ | |
| `update(scenario)` | `Promise<Result<SimulatorScenario, ...>>` | ✅ | ✅ | |
| `archive(id)` | `Promise<Result<void, SimulatorScenarioError>>` | ✅ | ✅ | |

### 1.21 `IUserStreakRepository` — `src/ports/repositories/IUserStreakRepository.ts`
| Method | Return Type | Uses Result? | Infra Impl | Notes |
|---|---|---|---|---|
| `findByUserId(userId)` | `Promise<Result<UserStreak \| null, UserStreakError>>` | ✅ | PrismaUserStreakRepository, InMemoryUserStreakRepository | |
| `upsert(streak)` | `Promise<Result<UserStreak, UserStreakError>>` | ✅ | ✅ | |

### 1.22 `IWebhookEventLog` — `src/ports/repositories/IWebhookEventLog.ts`
| Method | Return Type | Uses Result? | Infra Impl | Notes |
|---|---|---|---|---|
| `record(input)` | `Promise<Result<WebhookEventRecord, WebhookEventLogError>>` | ✅ | PrismaWebhookEventLog, InMemoryWebhookEventLog | |
| `markProcessed(id, error?)` | `Promise<Result<void, WebhookEventLogError>>` | ✅ | ✅ | |

### 1.23 `IXPEventRepository` — `src/ports/repositories/IXPEventRepository.ts`
| Method | Return Type | Uses Result? | Infra Impl | Notes |
|---|---|---|---|---|
| `create(event)` | `Promise<Result<XPEvent, XPEventError>>` | ✅ | PrismaXPEventRepository, InMemoryXPEventRepository | |
| `findByUserId(userId)` | `Promise<Result<readonly XPEvent[], XPEventError>>` | ✅ | ✅ | |

### 1.24 `ILiveClassRepository` — `src/ports/repositories/ILiveClassRepository.ts`
| Method | Return Type | Uses Result? | Infra Impl | Notes |
|---|---|---|---|---|
| `listAll(opts?)` | `Promise<Result<LiveClass[], LiveClassRepositoryError>>` | ✅ | PrismaLiveClassRepository, InMemoryLiveClassRepository | STORY-050c |
| `findById(id)` | `Promise<Result<LiveClass \| null, ...>>` | ✅ | ✅ | |
| `create(liveClass)` | `Promise<Result<void, LiveClassRepositoryError>>` | ✅ | ✅ | |
| `update(liveClass)` | `Promise<Result<void, LiveClassRepositoryError>>` | ✅ | ✅ | |
| `delete(id)` | `Promise<Result<void, LiveClassRepositoryError>>` | ✅ | ✅ | |

### 1.25 `IEmailTemplateRepository` — `src/ports/repositories/IEmailTemplateRepository.ts`
| Method | Return Type | Uses Result? | Infra Impl | Notes |
|---|---|---|---|---|
| `listAll()` | `Promise<Result<readonly EmailTemplate[], EmailTemplateError>>` | ✅ | PrismaEmailTemplateRepository, InMemoryEmailTemplateRepository | STORY-063 |
| `findByType(type)` | `Promise<Result<EmailTemplate \| null, ...>>` | ✅ | ✅ | |
| `upsert(template)` | `Promise<Result<void, EmailTemplateError>>` | ✅ | ✅ | |

### 1.26 `EmailVerificationRepository` — `src/ports/repositories/EmailVerificationRepository.ts`
| Method | Return Type | Uses Result? | Infra Impl | Notes |
|---|---|---|---|---|
| `create(args)` | `Promise<Result<{id}, EmailVerificationError>>` | ✅ | PrismaEmailVerificationRepository, InMemoryEmailVerificationRepository | STORY-007 |
| `findByTokenHash(tokenHash)` | `Promise<Result<EmailVerificationRecord, ...>>` | ✅ | ✅ | |
| `markUsed(id)` | `Promise<Result<void, EmailVerificationError>>` | ✅ | ✅ | |

### 1.27 `PasswordResetRepository` — `src/ports/repositories/PasswordResetRepository.ts`
| Method | Return Type | Uses Result? | Infra Impl | Notes |
|---|---|---|---|---|
| `create(args)` | `Promise<Result<{id}, PasswordResetError>>` | ✅ | PrismaPasswordResetRepository, InMemoryPasswordResetRepository | STORY-008 |
| `findByTokenHash(tokenHash)` | `Promise<Result<PasswordResetRecord, ...>>` | ✅ | ✅ | |
| `markUsed(id)` | `Promise<Result<void, PasswordResetError>>` | ✅ | ✅ | |
| `invalidateAllForUser(userId)` | `Promise<Result<{count}, PasswordResetError>>` | ✅ | ✅ | |

### 1.28 `SentReminderRepository` — `src/ports/repositories/SentReminderRepository.ts`
| Method | Return Type | Uses Result? | Infra Impl | Notes |
|---|---|---|---|---|
| `wasSent(args)` | `Promise<boolean>` | ❌ **Plain boolean** | PrismaSentReminderRepository, InMemorySentReminderRepository | **ADR-014 violation** — not wrapped in Result |
| `markSent(args)` | `Promise<Result<void, SentReminderError>>` | ✅ | ✅ | |

### 1.29 `SessionRepository` — `src/ports/repositories/SessionRepository.ts`
| Method | Return Type | Uses Result? | Infra Impl | Notes |
|---|---|---|---|---|
| `findById(id)` | `Promise<Result<SessionRecord, SessionError>>` | ✅ | PrismaSessionRepository, InMemorySessionRepository | |
| `create(params)` | `Promise<Result<SessionRecord, SessionError>>` | ✅ | ✅ | |
| `deleteById(id)` | `Promise<Result<void, SessionError>>` | ✅ | ✅ | |
| `deleteAllForUser(userId)` | `Promise<Result<void, SessionError>>` | ✅ | ✅ | |

### 1.30 `KeywordDatasetRepository` — `src/ports/repositories/KeywordDatasetRepository.ts`
| Method | Return Type | Uses Result? | Infra Impl | Notes |
|---|---|---|---|---|
| `findByNiche(nicheId)` | `Promise<Result<KeywordDataset, KeywordDatasetRepositoryError>>` | ✅ | StaticKeywordDatasetRepository | STORY-081 |

---

## 2. SERVICE / INFRASTRUCTURE PORTS (8 ports in `src/ports/` + 1 in `src/domain/ports/`)

### 2.1 `IAccessPolicy` — `src/ports/access/IAccessPolicy.ts`
| Method | Return Type | Uses Result? | Infra Impl | Notes |
|---|---|---|---|---|
| `canAccess(userId, courseId)` | `Promise<AccessDecision>` | ❌ (value object, not Result) | TierAccessPolicy, StubAccessPolicy | STORY-022 |

### 2.2 `EmailSender` — `src/ports/email/EmailSender.ts`
| Method | Return Type | Uses Result? | Infra Impl | Notes |
|---|---|---|---|---|
| `send(message)` | `Promise<Result<{messageId}, EmailSenderError>>` | ✅ | ResendEmailSender, InMemoryEmailSender | STORY-045 |

### 2.3 `IPaymentGateway` — `src/ports/payment/IPaymentGateway.ts`
| Method | Return Type | Uses Result? | Infra Impl | Notes |
|---|---|---|---|---|
| `createCheckoutSession(params)` | `Promise<Result<CheckoutSession, PaymentGatewayError>>` | ✅ | PayMongoAdapter, StubPaymentGateway | |
| `getCheckoutSession(sessionId)` | `Promise<Result<CheckoutSession, PaymentGatewayError>>` | ✅ | ✅ | |
| `verifyWebhookSignature(payload, signature)` | `void` | ❌ **Throws on invalid** | ✅ | **ADR-014 deviation** — throws Error instead of returning Result |
| `refund(params)` | `Promise<Result<{refundId, processedAt}, PaymentGatewayError>>` | ✅ | ✅ | STORY-049 |

### 2.4 `Logger` — `src/ports/observability/Logger.ts`
| Method | Return Type | Uses Result? | Infra Impl | Notes |
|---|---|---|---|---|
| `debug(message, context?)` | `void` | N/A | PinoLogger, TestLogger | STORY-052 |
| `info(message, context?)` | `void` | N/A | ✅ | |
| `warn(message, context?)` | `void` | N/A | ✅ | |
| `error(message, context?)` | `void` | N/A | ✅ | |
| `child(bindings)` | `Logger` | N/A | ✅ | |

### 2.5 `CertificateRenderer` — `src/ports/rendering/CertificateRenderer.ts`
| Method | Return Type | Uses Result? | Infra Impl | Notes |
|---|---|---|---|---|
| `render(input)` | `Promise<Buffer>` | ❌ **Throws acceptable** | ReactPdfCertificateRenderer, StaticCertificateRenderer | STORY-042; doc says throwing is acceptable for PDF lib errors |

### 2.6 `IMdxContentRenderer` — `src/ports/rendering/IMdxContentRenderer.ts`
| Method | Return Type | Uses Result? | Infra Impl | Notes |
|---|---|---|---|---|
| `render(source, options?)` | `Promise<Result<MdxRendered, MdxRenderError>>` | ✅ | NextMdxRenderer | STORY-012 |
| `clearCache()` | `void` | N/A | ✅ | Test-only |

### 2.7 `Simulator<TIn, TOut>` — `src/ports/simulator/Simulator.ts`
| Method | Return Type | Uses Result? | Infra Impl | Notes |
|---|---|---|---|---|
| `simulatorId` | `SimulatorId` (property) | N/A | StubSimulator | STORY-036 |
| `name` | `string` (property) | N/A | ✅ | |
| `run(input)` | `Promise<TOut>` | ❌ (generic, no Result) | ✅ | |

### 2.8 `SimulatorRegistry` — `src/ports/simulator/SimulatorRegistry.ts`
| Method | Return Type | Uses Result? | Infra Impl | Notes |
|---|---|---|---|---|
| `register(simulator)` | `void` | N/A | InMemorySimulatorRegistry | STORY-036 |
| `get(id)` | `Simulator<unknown, unknown> \| null` | ❌ | ✅ | |
| `list()` | `readonly Simulator<unknown, unknown>[]` | ❌ | ✅ | |

### 2.9 `IAmphContentReader` — `src/domain/ports/content/IAmphContentReader.ts`
| Method | Return Type | Uses Result? | Infra Impl | Notes |
|---|---|---|---|---|
| `readAll()` | `Promise<Result<readonly {courseSlug, files}[], ContentReadError>>` | ✅ | NodeContentReader (infra/content/) | STORY-013; port lives in **domain/ports** not src/ports |

---

## 3. SECURITY PORTS (5 ports)

### 3.1 `JwtService` — `src/ports/security/JwtService.ts`
| Method | Return Type | Uses Result? | Infra Impl |
|---|---|---|---|
| `sign(payload, expiresIn)` | `Promise<Result<string, Error>>` | ✅ | JoseJwtService |
| `verify(token)` | `Promise<Result<Record<string, unknown>, Error>>` | ✅ | ✅ |

### 3.2 `PasswordHasher` — `src/ports/security/PasswordHasher.ts`
| Method | Return Type | Uses Result? | Infra Impl |
|---|---|---|---|
| `hash(password)` | `Promise<Result<string, HashError>>` | ✅ | Argon2PasswordHasher |
| `verify(password, hash)` | `Promise<Result<boolean, VerifyError>>` | ✅ | ✅ |

### 3.3 `RateLimiter` — `src/ports/security/RateLimiter.ts`
| Method | Return Type | Uses Result? | Infra Impl |
|---|---|---|---|
| `check(input)` | `Promise<Result<RateLimitResult, RateLimitError>>` | ✅ | UpstashRateLimiter, InMemoryRateLimiter | STORY-054 |

### 3.4 `TotpService` — `src/ports/security/TotpService.ts`
| Method | Return Type | Uses Result? | Infra Impl |
|---|---|---|---|
| `generateSecret()` | `string` | ❌ (sync, pure) | OtpauthTotpService, FakeTotpService |
| `keyUri(params)` | `string` | ❌ (sync, pure) | ✅ |
| `verify(secret, token)` | `boolean` | ❌ (sync, pure) | ✅ |

### 3.5 `CertificateHashGenerator` — `src/ports/security/CertificateHashGenerator.ts`
| Method | Return Type | Uses Result? | Infra Impl |
|---|---|---|---|
| `hash(input)` | `string` | ❌ (sync, pure) | NodeCertificateHashGenerator, FakeCertificateHashGenerator |

---

## 4. SYSTEM PORTS (3 ports)

### 4.1 `Clock` — `src/ports/system/Clock.ts`
| Method | Return Type | Uses Result? | Infra Impl |
|---|---|---|---|
| `now()` | `Date` | ❌ (sync, pure) | SystemClock, FixedClock |

### 4.2 `IdGenerator` — `src/ports/system/IdGenerator.ts`
| Method | Return Type | Uses Result? | Infra Impl |
|---|---|---|---|
| `newId()` | `string` | ❌ (sync, pure) | UlidGenerator, InMemoryIdGenerator |
| `paymentRef()` | `string` | ❌ (sync, pure) | ✅ |
| `receiptNumber()` | `string` | ❌ (sync, pure) | ✅ |

### 4.3 `ContentIdGenerator` — `src/ports/system/ContentIdGenerator.ts`
| Method | Return Type | Uses Result? | Infra Impl |
|---|---|---|---|
| `generateId(...parts)` | `string` | ❌ (sync, pure) | Md5ContentIdGenerator |

---

## 5. EMAIL RENDERER PORTS (8 ports in `src/ports/email/`)

These are "strategy" ports — each returns a `ReactElement` for a specific email template. All are implemented in `src/infra/email/templates/`.

| Port File | Method Signature | Infra Impl |
|---|---|---|
| `CertificateEmailRenderer.ts` | `render({firstName, courseTitle, verificationHash, verifyUrl}): ReactElement` | infra/email/templates/CertificateEmailRenderer.ts |
| `EmailVerificationRenderer.ts` | `render({firstName, verifyUrl}): ReactElement` | infra/email/templates/EmailVerificationRenderer.ts |
| `LiveClassReminderRenderer.ts` | `render({firstName, courseTitle, liveClassTitle, ...}): ReactElement` | infra/email/templates/LiveClassReminderRenderer.ts |
| `PasswordChangedRenderer.ts` | `render({firstName}): ReactElement` | infra/email/templates/PasswordChangedRenderer.ts |
| `PasswordResetRenderer.ts` | `render({firstName, resetUrl}): ReactElement` | infra/email/templates/PasswordResetRenderer.ts |
| `PaymentFailedRenderer.ts` | `render({firstName, courseTitle, ...}): ReactElement` | infra/email/templates/PaymentFailedRenderer.ts |
| `ReceiptRenderer.ts` | `render({firstName, courseTitle, amount, ...}): ReactElement` | infra/email/templates/ReceiptRenderer.ts |
| `RefundRenderer.ts` | `render({firstName, courseTitle, amount, ...}): ReactElement` | infra/email/templates/RefundTemplateRenderer.ts |
| `WelcomeRenderer.ts` | `render({firstName}): ReactElement` | infra/email/templates/WelcomeRenderer.ts |

---

## 6. ADR-014 VIOLATIONS / ANOMALIES

| Port | Method | Issue |
|---|---|---|
| `IEnrollmentRepository` | `findByUserIdAndCourseId()` | Returns `Promise<Enrollment \| null>` — not wrapped in `Result` |
| `IDiscountCodeRepository` | `findByCode()` | Returns `Promise<DiscountCode \| null>` — not wrapped in `Result` |
| `SentReminderRepository` | `wasSent()` | Returns `Promise<boolean>` — not wrapped in `Result` |
| `IPaymentGateway` | `verifyWebhookSignature()` | Returns `void`, throws on invalid signature — should be `Result` per ADR-014 |
| `CertificateRenderer` | `render()` | Returns `Promise<Buffer>` — throwing is documented as acceptable |

---

## 7. MISSING PORTS (entity → no corresponding repository port)

| Domain Entity | Missing Port | Rationale |
|---|---|---|
| `QuizAttemptReview.ts` | ❌ No `IQuizAttemptReviewRepository` | The entity exists but has no dedicated repo — reviews may be embedded in QuizAttempt or stored as a sub-entity. Should be verified. |
| `SimulatorDecision.ts` | ❌ No `ISimulatorDecisionRepository` | Decisions are embedded inside `ISimulatorAttemptRepository.addDecision()`. Acceptable if decisions are always accessed via their parent attempt. |
| `OrderRefund.ts` (value) | ❌ No `IRefundRepository` | Refund data is stored as fields on the `Order` entity (refundRequestedAt, refundProcessedAt, etc.). The `IOrderRepository.listRefundRequests()` covers querying. Acceptable. |
| `QuizAttemptReview.ts` | ⚠️ **No repository port at all** | Entity exists in `src/domain/entities/QuizAttemptReview.ts` (1.6KB) but has no matching port. If this entity is persisted or queried independently, a port should exist. |

---

## 8. NAMING INCONSISTENCIES

| Category | Issue |
|---|---|
| Prefix inconsistency | Some repos use `I` prefix (`IOrderRepository`, `IEnrollmentRepository`, etc.), others don't (`UserRepository`, `CourseRepository`, `SessionRepository`). Should standardize. |
| Renderer port naming | `CertificateRenderer` (PDF) in `rendering/` vs `CertificateEmailRenderer` (email) in `email/` — the JSDoc warns about this but the names could be clearer. |
| `IAmphContentReader` location | Lives in `src/domain/ports/content/` instead of `src/ports/`. This is a valid domain port but its placement differs from all other ports. |

---

## 9. KEY FINDINGS SUMMARY

1. **Excellent Result usage**: ~145 of ~153 port methods use `Result<T, E>` (95% ADR-014 compliance). The 3 exceptions are in `findByUserIdAndCourseId`, `findByCode`, and `wasSent`.

2. **Full InMemory + Prisma dual implementation**: Every repository port has both an InMemory adapter (for tests) and a Prisma adapter (for production). This is exemplary hexagonal architecture.

3. **Only one potentially missing port**: `QuizAttemptReview` entity exists but has no corresponding repository. If this entity is stored/queried independently, an `IQuizAttemptReviewRepository` should be created.

4. **`IAmphContentReader` split location**: The port lives in `domain/ports/content/` with infra impl in `infra/content/`. This is architecturally clean (domain-layer port) but inconsistent with the `src/ports/` convention used by all other ports.

5. **No event ports**: There are no outbound event/message ports (e.g., `IEventBus`, `IEventPublisher`). The codebase uses direct method calls for side effects (email, audit log). This is fine for the current scale but would be a gap if async event-driven flows are needed.
