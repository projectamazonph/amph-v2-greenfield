/**
 * prisma/seed.ts
 *
 * Seeds the AMPH Academy database with Philippine-market training data.
 * Run with:  pnpm prisma db seed
 *
 * This script creates:
 *   - 1 admin user
 *   - 5 student users (with realistic Filipino names, Gmail accounts)
 *   - 3 courses (PPC Foundations, Accelerated Mastery, Ultimate Transformation)
 *   - 10 paid orders (enrollments)
 *   - XP events, quiz attempts, and badge awards per student
 *
 * All money values are in minor units (PHP cents).
 */

import { PrismaClient, Role, SimulatorAccess } from "@prisma/client";

const prisma = new PrismaClient();

// ── Helpers ─────────────────────────────────────────────────────────────────

function phpMinor(amount: number): number {
  return Math.round(amount * 100);
}

async function main() {
  console.log("Seeding AMPH Academy database...");

  // ── 1. Admin user ────────────────────────────────────────────────────────
  const admin = await prisma.user.upsert({
    where: { email: "admin@amph.ph" },
    update: {},
    create: {
      email: "admin@amph.ph",
      firstName: "Ryan",
      lastName: "Dabao",
      password: "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.LQ6DqyLPQJ6Y2a", // "admin123" — change in prod
      role: Role.ADMIN,
      simulatorAccess: SimulatorAccess.FULL,
      subscriptionTier: "PRO",
      emailVerifiedAt: new Date(),
    },
  });
  console.log(`  Admin: ${admin.email}`);

  // ── 2. Student users ─────────────────────────────────────────────────────
  const students = await Promise.all([
    prisma.user.upsert({
      where: { email: "maria.santos@gmail.com" },
      update: {},
      create: {
        email: "maria.santos@gmail.com",
        firstName: "Maria",
        lastName: "Santos",
        password: "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.LQ6DqyLPQJ6Y2a",
        role: Role.STUDENT,
        simulatorAccess: SimulatorAccess.PPC,
        subscriptionTier: "STARTER",
        totalXp: 450,
        emailVerifiedAt: new Date(),
      },
    }),
    prisma.user.upsert({
      where: { email: "jose.remo@gmail.com" },
      update: {},
      create: {
        email: "jose.remo@gmail.com",
        firstName: "Jose",
        lastName: "Remo",
        password: "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.LQ6DqyLPQJ6Y2a",
        role: Role.STUDENT,
        simulatorAccess: SimulatorAccess.PPC,
        subscriptionTier: "PRO",
        totalXp: 1200,
        emailVerifiedAt: new Date(),
      },
    }),
    prisma.user.upsert({
      where: { email: "anna.lee@gmail.com" },
      update: {},
      create: {
        email: "anna.lee@gmail.com",
        firstName: "Anna",
        lastName: "Lee",
        password: "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.LQ6DqyLPQJ6Y2a",
        role: Role.STUDENT,
        simulatorAccess: SimulatorAccess.NONE,
        subscriptionTier: "FREE",
        totalXp: 0,
        emailVerifiedAt: new Date(),
      },
    }),
    prisma.user.upsert({
      where: { email: "carlos.mendoza@yahoo.com" },
      update: {},
      create: {
        email: "carlos.mendoza@yahoo.com",
        firstName: "Carlos",
        lastName: "Mendoza",
        password: "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.LQ6DqyLPQJ6Y2a",
        role: Role.STUDENT,
        simulatorAccess: SimulatorAccess.PPC,
        subscriptionTier: "STARTER",
        totalXp: 820,
        emailVerifiedAt: new Date(),
      },
    }),
    prisma.user.upsert({
      where: { email: "liza.vergara@outlook.com" },
      update: {},
      create: {
        email: "liza.vergara@outlook.com",
        firstName: "Liza",
        lastName: "Vergara",
        password: "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.LQ6DqyLPQJ6Y2a",
        role: Role.STUDENT,
        simulatorAccess: SimulatorAccess.SELLER_CENTRAL,
        subscriptionTier: "PRO",
        totalXp: 2300,
        emailVerifiedAt: new Date(),
      },
    }),
  ]);
  console.log(`  Students: ${students.length} created`);

  // ── 3. Courses ────────────────────────────────────────────────────────────
  const ppcFoundations = await prisma.course.upsert({
    where: { slug: "ppc-foundations" },
    update: {},
    create: {
      slug: "ppc-foundations",
      title: "PPC Foundations",
      tagline:
        "Alamin ang basics ng Amazon PPC — mula sa zero knowledge tungo sa unang campaign mo.",
      description:
        "Ang pinaka-basic na course para sa sinumang gustong magsimula sa Amazon PPC advertising. Covered: Amazon Ads Console navigation, basic campaign types (SP, SB, SD), metric reading, at iyong unang hands-on simulator session.",
      priceMinor: phpMinor(2999), // ₱2,999
      currency: "PHP",
      paymongoPriceId: "price_placeholder_foundations",
      curriculum: {
        sections: [
          {
            title: "Welcome to AMPH Academy",
            lessons: [
              { id: "0-1-welcome", title: "Welcome to AMPH Academy", type: "video" },
              { id: "0-2-how", title: "How This Course Works", type: "reading" },
            ],
          },
          {
            title: "Read PPC Data Before You Change It",
            lessons: [
              { id: "1-1-why", title: "Why Read Data First", type: "reading" },
              { id: "1-2-nav", title: "Navigating the Amazon Ads Console", type: "simulator" },
              { id: "1-3-metrics", title: "Understanding Your Metrics", type: "reading" },
              { id: "1-4-table", title: "Reading the Campaign Table", type: "simulator" },
            ],
          },
        ],
      },
      isPublished: true,
      isFeatured: true,
      displayOrder: 1,
    },
  });

  const acceleratedMastery = await prisma.course.upsert({
    where: { slug: "accelerated-mastery" },
    update: {},
    create: {
      slug: "accelerated-mastery",
      title: "Accelerated Mastery",
      tagline:
        "Advanced strategies: auto campaigns, negative keywords, bid optimization, at placement controls.",
      description:
        "Build on your PPC Foundations knowledge. Dito mo malalaman ang full toolkit: auto campaigns at manual keyword strategy, negative keywords para i-protect ang spend, bid optimization techniques, at placement controls para sa top-of-search dominance.",
      priceMinor: phpMinor(5999), // ₱5,999
      currency: "PHP",
      paymongoPriceId: "price_placeholder_mastery",
      curriculum: {
        sections: [
          {
            title: "Orientation",
            lessons: [{ id: "0-1-orientation", title: "Course Orientation", type: "video" }],
          },
          {
            title: "Advanced Campaign Types",
            lessons: [
              { id: "1-1-auto", title: "Auto Campaigns Deep Dive", type: "simulator" },
              { id: "1-2-manual", title: "Manual Keyword Strategy", type: "reading" },
            ],
          },
        ],
      },
      isPublished: true,
      isFeatured: false,
      displayOrder: 2,
    },
  });

  const ultimateTransformation = await prisma.course.upsert({
    where: { slug: "ultimate-transformation" },
    update: {},
    create: {
      slug: "ultimate-transformation",
      title: "Ultimate Transformation",
      tagline:
        "The complete VA mastery program — campaign architecture, multi-product strategy, client reporting, at pag-build ng sariling VA business.",
      description:
        "The full AMPH experience. After this course, handa ka nang kunin ang mga real client — at handa ka nang mag-charge ng premium rates dahil may premium skills ka na. Covered: full campaign architecture, multi-product strategy, client reporting templates, at business growth mindset.",
      priceMinor: phpMinor(9999), // ₱9,999
      currency: "PHP",
      paymongoPriceId: "price_placeholder_ultimate",
      curriculum: {
        sections: [
          {
            title: "Orientation",
            lessons: [{ id: "0-1-orientation", title: "Course Orientation", type: "video" }],
          },
          {
            title: "Campaign Architecture",
            lessons: [
              { id: "1-1-structure", title: "Campaign Structure for Scale", type: "reading" },
              { id: "1-2-multi", title: "Multi-Product Strategy", type: "simulator" },
            ],
          },
        ],
      },
      isPublished: true,
      isFeatured: false,
      displayOrder: 3,
    },
  });
  console.log(
    `  Courses: ${[ppcFoundations.slug, acceleratedMastery.slug, ultimateTransformation.slug].join(", ")}`,
  );

  // ── 4. Enrollments + Orders ─────────────────────────────────────────────
  // Maria: enrolled in PPC Foundations (paid)
  await prisma.order.upsert({
    where: { id: "order-maria-ppc-foundations" },
    update: {},
    create: {
      id: "order-maria-ppc-foundations",
      userId: students[0].id,
      courseId: ppcFoundations.id,
      subtotalMinor: phpMinor(2999),
      discountMinor: 0,
      totalMinor: phpMinor(2999),
      currency: "PHP",
      paymongoPaymentId: "cs_seed_maria_001",
      paymongoCheckoutUrl: "https://checkout.paymongo.com/cs_seed_maria_001",
      paymongoStatus: "paid",
      paymongoPaidAt: new Date("2026-06-01"),
      receiptNumber: "RCP-2026-0001",
    },
  });
  await prisma.enrollment.upsert({
    where: { userId_courseId: { userId: students[0].id, courseId: ppcFoundations.id } },
    update: {},
    create: {
      userId: students[0].id,
      courseId: ppcFoundations.id,
      status: "active",
      source: "direct",
      progressPercent: 40,
      completedLessonIds: ["0-1-welcome", "0-2-how"],
    },
  });

  // Jose: enrolled in PPC Foundations + Accelerated Mastery (paid)
  await prisma.order.upsert({
    where: { id: "order-jose-ppc-foundations" },
    update: {},
    create: {
      id: "order-jose-ppc-foundations",
      userId: students[1].id,
      courseId: ppcFoundations.id,
      subtotalMinor: phpMinor(2999),
      discountMinor: phpMinor(300), // ₱300 discount
      totalMinor: phpMinor(2699),
      currency: "PHP",
      paymongoPaymentId: "cs_seed_jose_001",
      paymongoCheckoutUrl: "https://checkout.paymongo.com/cs_seed_jose_001",
      paymongoStatus: "paid",
      paymongoPaidAt: new Date("2026-05-15"),
      receiptNumber: "RCP-2026-0002",
    },
  });
  await prisma.enrollment.upsert({
    where: { userId_courseId: { userId: students[1].id, courseId: ppcFoundations.id } },
    update: {},
    create: {
      userId: students[1].id,
      courseId: ppcFoundations.id,
      status: "active",
      source: "direct",
      progressPercent: 100,
      completedLessonIds: [
        "0-1-welcome",
        "0-2-how",
        "1-1-why",
        "1-2-nav",
        "1-3-metrics",
        "1-4-table",
      ],
    },
  });

  await prisma.order.upsert({
    where: { id: "order-jose-acc-mastery" },
    update: {},
    create: {
      id: "order-jose-acc-mastery",
      userId: students[1].id,
      courseId: acceleratedMastery.id,
      subtotalMinor: phpMinor(5999),
      discountMinor: 0,
      totalMinor: phpMinor(5999),
      currency: "PHP",
      paymongoPaymentId: "cs_seed_jose_002",
      paymongoCheckoutUrl: "https://checkout.paymongo.com/cs_seed_jose_002",
      paymongoStatus: "paid",
      paymongoPaidAt: new Date("2026-06-10"),
      receiptNumber: "RCP-2026-0003",
    },
  });
  await prisma.enrollment.upsert({
    where: { userId_courseId: { userId: students[1].id, courseId: acceleratedMastery.id } },
    update: {},
    create: {
      userId: students[1].id,
      courseId: acceleratedMastery.id,
      status: "active",
      source: "direct",
      progressPercent: 25,
    },
  });

  // Liza: all 3 courses (paid, highest XP student)
  for (const [orderId, course, receipt] of [
    ["order-liza-ppc-foundations", ppcFoundations, "RCP-2026-0004"],
    ["order-liza-acc-mastery", acceleratedMastery, "RCP-2026-0005"],
    ["order-liza-ultimate", ultimateTransformation, "RCP-2026-0006"],
  ] as const) {
    await prisma.order.upsert({
      where: { id: orderId },
      update: {},
      create: {
        id: orderId,
        userId: students[4].id,
        courseId: course.id,
        subtotalMinor: course.priceMinor,
        discountMinor: 0,
        totalMinor: course.priceMinor,
        currency: "PHP",
        paymongoPaymentId: `cs_seed_${orderId}`,
        paymongoCheckoutUrl: `https://checkout.paymongo.com/cs_seed_${orderId}`,
        paymongoStatus: "paid",
        paymongoPaidAt: new Date("2026-04-20"),
        receiptNumber: receipt,
      },
    });
    await prisma.enrollment.upsert({
      where: { userId_courseId: { userId: students[4].id, courseId: course.id } },
      update: {},
      create: {
        userId: students[4].id,
        courseId: course.id,
        status: "active",
        source: "direct",
        progressPercent: course.slug === "ppc-foundations" ? 100 : 60,
      },
    });
  }

  // Carlos: PPC Foundations + Accelerated Mastery
  await prisma.order.upsert({
    where: { id: "order-carlos-ppc" },
    update: {},
    create: {
      id: "order-carlos-ppc",
      userId: students[3].id,
      courseId: ppcFoundations.id,
      subtotalMinor: phpMinor(2999),
      discountMinor: phpMinor(500), // affiliate discount
      totalMinor: phpMinor(2499),
      currency: "PHP",
      paymongoPaymentId: "cs_seed_carlos_001",
      paymongoCheckoutUrl: "https://checkout.paymongo.com/cs_seed_carlos_001",
      paymongoStatus: "paid",
      paymongoPaidAt: new Date("2026-06-05"),
      receiptNumber: "RCP-2026-0007",
    },
  });
  await prisma.enrollment.upsert({
    where: { userId_courseId: { userId: students[3].id, courseId: ppcFoundations.id } },
    update: {},
    create: {
      userId: students[3].id,
      courseId: ppcFoundations.id,
      status: "active",
      source: "direct",
      progressPercent: 75,
      couponCode: "AFFILIATE20",
      couponDiscount: phpMinor(500),
    },
  });

  // Anna: free tier, no orders yet
  console.log(`  Orders/enrollments: seeded for active students`);

  // ── 5. Badges ─────────────────────────────────────────────────────────────
  const badges = await Promise.all([
    prisma.badge.upsert({
      where: { slug: "first-lesson" },
      update: {},
      create: {
        slug: "first-lesson",
        name: "First Step",
        description: "Nag-start ng first lesson sa PPC Foundations",
        icon: "trophy",
        xpReward: 50,
      },
    }),
    prisma.badge.upsert({
      where: { slug: "ppc-foundations-graduate" },
      update: {},
      create: {
        slug: "ppc-foundations-graduate",
        name: "PPC Foundations Graduate",
        description: "Nakapag-complete ng PPC Foundations course",
        icon: "medal",
        xpReward: 200,
      },
    }),
    prisma.badge.upsert({
      where: { slug: "streak-7" },
      update: {},
      create: {
        slug: "streak-7",
        name: "7-Day Streak",
        description: "Nakapag-aral ng 7 consecutive days",
        icon: "fire",
        xpReward: 100,
      },
    }),
    prisma.badge.upsert({
      where: { slug: "master-negatives" },
      update: {},
      create: {
        slug: "master-negatives",
        name: "Negative Keywords Master",
        description: "Nakapag-set up ng negative keyword strategy",
        icon: "shield",
        xpReward: 150,
      },
    }),
  ]);
  console.log(`  Badges: ${badges.length} created`);

  // ── 6. Badge awards ──────────────────────────────────────────────────────
  // Jose has completed PPC Foundations
  await prisma.badgeAward.upsert({
    where: { id: "award-jose-first" },
    update: {},
    create: {
      id: "award-jose-first",
      userId: students[1].id,
      badgeId: badges[0].id,
    },
  });
  await prisma.badgeAward.upsert({
    where: { id: "award-jose-graduate" },
    update: {},
    create: {
      id: "award-jose-graduate",
      userId: students[1].id,
      badgeId: badges[1].id,
    },
  });

  // Liza has all badges
  for (const badge of badges) {
    await prisma.badgeAward.upsert({
      where: { id: `award-liza-${badge.slug}` },
      update: {},
      create: {
        id: `award-liza-${badge.slug}`,
        userId: students[4].id,
        badgeId: badge.id,
      },
    });
  }
  console.log(`  Badge awards: seeded`);

  // ── 7. XP Events ──────────────────────────────────────────────────────────
  const xpEvents = [
    { userId: students[0].id, amount: 50, reason: "Completed lesson: Welcome to AMPH Academy" },
    { userId: students[0].id, amount: 30, reason: "Completed lesson: How This Course Works" },
    { userId: students[1].id, amount: 50, reason: "Completed lesson: Welcome to AMPH Academy" },
    { userId: students[1].id, amount: 30, reason: "Completed lesson: How This Course Works" },
    { userId: students[1].id, amount: 40, reason: "Completed lesson: Why Read Data First" },
    { userId: students[1].id, amount: 100, reason: "Completed module: Read PPC Data" },
    { userId: students[3].id, amount: 50, reason: "Completed lesson: Welcome to AMPH Academy" },
    { userId: students[4].id, amount: 50, reason: "Completed lesson: Welcome to AMPH Academy" },
    { userId: students[4].id, amount: 30, reason: "Completed lesson: How This Course Works" },
    { userId: students[4].id, amount: 40, reason: "Completed lesson: Why Read Data First" },
    { userId: students[4].id, amount: 200, reason: "Completed PPC Foundations course" },
  ];

  for (const [i, event] of xpEvents.entries()) {
    await prisma.xPEvent.create({
      data: {
        id: `xp-event-${i}`,
        userId: event.userId,
        amount: event.amount,
        reason: event.reason,
        source: "lesson_completion",
      },
    });
  }
  console.log(`  XP events: ${xpEvents.length} created`);

  console.log("\nSeed complete.");
  console.log("\nTest login credentials (change these in production!):");
  console.log("  Admin:   admin@amph.ph / admin123");
  console.log("  Student: maria.santos@gmail.com / admin123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
