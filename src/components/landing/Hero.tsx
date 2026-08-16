import Image from "next/image";
import Link from "next/link";
import { CheckIcon } from "./Icons";
import { Reveal } from "./Reveal";
import shared from "./shared.module.css";
import styles from "./Hero.module.css";
import { PUBLIC_CURRICULUM_CLAIMS } from "@/domain/curriculum/PublicCurriculumClaims";

export function Hero() {
  return (
    <section className={styles.hero} id="top" aria-labelledby="hero-headline">
      <div className={[shared.wrap, styles.grid].join(" ")}>
        <Reveal className={styles.left}>
          <span className={[shared.label, styles.eyebrow].join(" ")}>
            Amazon ads training · for Filipino VAs
          </span>
          <h1 id="hero-headline" className={styles.headline}>
            Amazon ads,
            <br />
            <span className={styles.pen}>taught for VAs new to the platform.</span>
          </h1>
          <p className={styles.body}>
            {PUBLIC_CURRICULUM_CLAIMS.modules.length} modules and {Object.keys(PUBLIC_CURRICULUM_CLAIMS.simulators).length} practice
            tools. You work with illustrative campaign shapes before a client sees your work.
          </p>
          <p className={styles.hook}>
            If you&rsquo;re at <b>₱25k / month now</b>, the next step is ₱60k&ndash;₱80k. This is the path.
          </p>
          <div className={styles.ctaRow}>
            <Link href="/#pricing" className={[shared.btn, shared.btnPrimary].join(" ")}>
              See the three tiers <span className={shared.arr}>→</span>
            </Link>
            <Link href="/#simulator" className={[shared.btn, shared.btnGhost].join(" ")}>
              Preview a simulator
            </Link>
          </div>
          <p className={styles.note}>
            <CheckIcon />
            {PUBLIC_CURRICULUM_CLAIMS.certificate.label} · skills for VAs who run ads for clients ·
            PayMongo (Card + GCash).
          </p>
          <div className={styles.chips}>
            <span className={shared.chip}>
              3 tiers · <b>pay once</b>
            </span>
            <span className={shared.chip}>
              PayMongo · <b>GCash</b>
            </span>
            <span className={shared.chip}>
              5 scored <b>simulators</b>
            </span>
            <span className={shared.chip}>No subscription</span>
          </div>
        </Reveal>

        <Reveal className={styles.right}>
          <figure className={[shared.plate, styles.figure].join(" ")}>
            <span className={[shared.corner, shared.cornerTl].join(" ")} />
            <span className={[shared.corner, shared.cornerTr].join(" ")} />
            <span className={[shared.corner, shared.cornerBl].join(" ")} />
            <span className={[shared.corner, shared.cornerBr].join(" ")} />
            <Image
              src="/brand/photography/field-desk-hero.png"
              alt="Top-down view of an operator's desk: a laptop showing a campaign dashboard beside notebooks and a pencil."
              width={1672}
              height={941}
              sizes="(max-width: 900px) calc(100vw - 36px), 46vw"
              className={[shared.plateImg, styles.img].join(" ")}
              priority
            />
            <figcaption className={shared.plateCap}>
              FIG. 01: operator&rsquo;s desk / live campaign view
            </figcaption>
            <div className={styles.stat}>
              <small>Sample ACoS</small>
              <b>24.3%</b> <span className={styles.statDelta}>▼ on target</span>
            </div>
          </figure>
        </Reveal>
      </div>
    </section>
  );
}
