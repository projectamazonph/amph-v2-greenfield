import Link from 'next/link';
import Image from 'next/image';
import { BRAND_NAME, BRAND_NAME_UPPER } from '@/lib/brand';
import { Badge } from '@/components/ui';
import { Icon, type PhosphorIconName } from '@/components/ui/Icon';
import { RevealSection } from '@/components/RevealSection';
import styles from './home.module.css';

interface SimMeta {
  id: 'campaign-builder' | 'bid-elevator' | 'str-triage' | 'listing-audit' | 'keyword-research';
  name: string;
  description: string;
  icon: PhosphorIconName;
  screenshot: string;
}

const SIMULATORS: SimMeta[] = [
  {
    id: 'campaign-builder',
    name: 'Campaign Builder',
    description:
      'Build Sponsored Products, Sponsored Brands, Sponsored Display, and Sponsored TV campaigns. Practice the full Amazon Ads Console campaign wizard, start to finish.',
    icon: 'Rocket',
    screenshot: '/images/tools/tool-campaign-builder.jpg',
  },
  {
    id: 'bid-elevator',
    name: 'Bid Elevator',
    description:
      'Adjust keyword bids against real performance data. Cut waste, raise your converters, defend ACoS at target.',
    icon: 'ChartLine',
    screenshot: '/images/tools/tool-bid-elevator.jpg',
  },
  {
    id: 'str-triage',
    name: 'Search Term Triage',
    description:
      'Keep, pause, negate, or re-bid search terms. Practice the weekly triage workflow every PPC specialist runs.',
    icon: 'List',
    screenshot: '/images/tools/tool-str-triage.jpg',
  },
  {
    id: 'listing-audit',
    name: 'Listing Audit',
    description:
      "Score a product listing on title, bullets, images, and A+ content. Find what's actually hurting conversion.",
    icon: 'BookOpen',
    screenshot: '/images/tools/tool-listing-audit.jpg',
  },
  {
    id: 'keyword-research',
    name: 'Keyword Research',
    description:
      'Categorize keywords as primary, secondary, or negative. Build the keyword list that drives every Sponsored Products campaign.',
    icon: 'MagnifyingGlass',
    screenshot: '/images/tools/tool-keyword-research.jpg',
  },
];

export default function HomePage() {
  return (
    <main id="main-content" className={styles.page}>
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <p className={styles.heroEyebrow}>{BRAND_NAME_UPPER}</p>
          <h1 className={styles.heroTitle}>Learn Amazon PPC the right way</h1>
          <p className={styles.heroTagline}>We turn the theoretical into the practical.</p>
          <p className={styles.heroSub}>
            Not only do you learn Amazon PPC from scratch. You turn that knowledge into
            workflows you can actually run on the job, before a client ever hands you
            their account.
          </p>
          <div className={styles.heroActions}>
            <Link href="/pricing" className={styles.btnPrimary}>
              See pricing
            </Link>
            <Link href="/tools/campaign-builder" className={styles.btnSecondary}>
              Try a tool
            </Link>
          </div>
        </div>
        <div className={styles.heroDecorative}>
          ₱60k–₱80k/mo
          <span className={styles.heroDecorativeCaption}>market rate, specialist Amazon PPC VAs</span>
        </div>
      </section>

      {/* ── Pain Points ──────────────────────────────────────── */}
      <RevealSection className={styles.painSection}>
        <h2>Where most Amazon PPC training falls apart</h2>
        <ul className={styles.painList}>
          <li className={styles.painItem}>
            You finish the lessons, but you&apos;ve never actually touched a campaign.
          </li>
          <li className={styles.painItem}>
            You know the vocabulary (ACoS, ROAS, CPC) but freeze the first time you have
            to act on it.
          </li>
          <li className={styles.painItem}>
            Clients want proof you&apos;ve used Seller Central. Nobody lets you practice
            on one first.
          </li>
          <li className={styles.painItem}>
            One mistake in a live account costs a client real money, so you never get to
            make the mistakes that actually teach you something.
          </li>
        </ul>
      </RevealSection>

      {/* ── Simulators (zig-zag) ─────────────────────────────── */}
      <RevealSection className={styles.simSection}>
        <h2>Five simulators. Five real Amazon Ads Console workflows.</h2>
        <p className={styles.simSub}>
          Each one mirrors what you&apos;d actually do inside Seller Central. No client
          account required.
        </p>
        <ul className={styles.simList}>
          {SIMULATORS.map((sim) => (
            <li key={sim.id} className={styles.simRow}>
              <div className={styles.simScreenshot}>
                <Image
                  src={sim.screenshot}
                  alt={`${sim.name} simulator screenshot`}
                  width={1000}
                  height={389}
                  sizes="(min-width: 768px) 50vw, 100vw"
                />
              </div>
              <div className={styles.simRowBody}>
                <Icon name={sim.icon} size="lg" />
                <h3>{sim.name}</h3>
                <p>{sim.description}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className={styles.simClose}>
          Not only do you learn Amazon PPC from scratch. You turn that knowledge into
          practical workflows you can apply the moment you&apos;re on the job.
        </p>
      </RevealSection>

      {/* ── Coming Soon ──────────────────────────────────────── */}
      <RevealSection className={styles.accessSection}>
        <h2>Two more tools, only for enrolled students</h2>
        <p className={styles.accessSub}>
          Still in development. Enroll now to get access the moment they launch.
        </p>
        <ul className={styles.accessGrid}>
          <li className={styles.accessItem}>
            <div className={styles.accessItemHeader}>
              <h3>Amazon Ads Console simulator</h3>
              <Badge variant="default">Coming soon · Enrollees only</Badge>
            </div>
            <p>
              A full replica of the Amazon Ads Console: build campaigns, manage keywords
              and bids, run reports, and get graded on scenario missions. The closest thing
              to Seller Central access without a client account.
            </p>
          </li>
          <li className={styles.accessItem}>
            <div className={styles.accessItemHeader}>
              <h3>Interview Lab</h3>
              <Badge variant="default">Coming soon · Enrollees only</Badge>
            </div>
            <p>
              AI mock interviews, resume review, and cover letter drafts built for the
              Amazon VA roles agencies actually hire for. Practice the interview, not just
              the skill.
            </p>
          </li>
        </ul>
      </RevealSection>

      {/* ── Pricing Preview ──────────────────────────────────── */}
      <RevealSection className={styles.pricingSection}>
        <h2>Simple, one-time pricing</h2>
        <p className={styles.pricingSub}>
          No subscriptions. No hidden fees. Pay once, learn forever.
        </p>
        <Link href="/pricing" className={styles.btnPrimary}>
          Compare tiers
        </Link>
      </RevealSection>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <RevealSection className={styles.ctaSection}>
        <h2>Ready to learn the Amazon PPC work that&apos;s in demand right now?</h2>
        <p>
          A structured course, real campaign tools, and a certificate that&apos;s part of the
          ProjectAmazonPH hiring pipeline.
        </p>
        <Link href="/auth/signup" className={styles.btnPrimary}>
          Create your account
        </Link>
      </RevealSection>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className={styles.footer}>
        <div className={styles.footerGrid}>
          <div className={styles.footerBrand}>
            <strong>{BRAND_NAME}</strong>
            <p>
              Amazon PPC training for Filipino virtual assistants.
              Learn the skill agencies and brands pay ₱60k–₱80k/month for.
            </p>
          </div>
          <div className={styles.footerCol}>
            <h3>Platform</h3>
            <ul>
              <li><Link href="/pricing">Pricing</Link></li>
              <li><Link href="/tools/campaign-builder">Tools</Link></li>
              <li><Link href="/dashboard/courses">Courses</Link></li>
            </ul>
          </div>
          <div className={styles.footerCol}>
            <h3>Account</h3>
            <ul>
              <li><Link href="/auth/signin">Sign in</Link></li>
              <li><Link href="/auth/signup">Sign up</Link></li>
            </ul>
          </div>
        </div>
      </footer>
    </main>
  );
}
