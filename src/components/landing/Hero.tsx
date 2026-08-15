import Image from "next/image";
import Link from "next/link";
import { CheckIcon } from "./Icons";
import { Reveal } from "./Reveal";
import shared from "./shared.module.css";
import styles from "./Hero.module.css";

export function Hero() {
  return (
    <section className={styles.hero} id="top" aria-labelledby="hero-headline">
      <div className={[shared.wrap, styles.grid].join(" ")}>
        <Reveal className={styles.left}>
          <span className={[shared.label, styles.eyebrow].join(" ")}>
            Amazon ads training · for Filipino VAs
          </span>
          <h1 id="hero-headline" className={styles.headline}>
            Learn PPC by
            <br />
            <span className={styles.pen}>doing the work.</span>
          </h1>
          <p className={styles.body}>
            Three tiers, one-time payment, no subscription. Build real campaign decisions across
            eight modules and five scored simulators before a client account is on the line.
          </p>
          <p className={styles.hook}>
            Built for VAs aiming at <b>₱60k–₱80k / month</b>, not staying at ₱25k.
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
            Certificates recognized in our hiring pipeline · agency-side work · PayMongo (Card +
            GCash).
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
