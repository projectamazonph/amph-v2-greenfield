import { Logo } from "./Logo";
import { Reveal } from "./Reveal";
import shared from "./shared.module.css";
import styles from "./Mentor.module.css";

/**
 * Stand-in for a photo the brand kit doesn't include yet (BRAND-GUIDE.md
 * explicitly steers away from generic headshot stock imagery anyway) — a
 * rendered "working notebook" sketch: a campaign structure tree, a spend
 * bar chart, and a search-term checklist, in the same ink/orange line
 * language as the rest of the page.
 */
function NotebookSketch() {
  return (
    <svg
      viewBox="0 0 320 260"
      className={styles.sketch}
      role="img"
      aria-label="A sketched campaign structure tree, a small bar chart, and a search-term checklist, as if drawn in a working notebook."
    >
      <rect x="0" y="0" width="320" height="260" fill="#FFFFFF" />
      {[36, 66, 96, 126, 156, 186, 216, 246].map((y) => (
        <line key={y} x1="0" y1={y} x2="320" y2={y} stroke="#E5E5E0" strokeWidth="1" />
      ))}
      <line x1="34" y1="0" x2="34" y2="260" stroke="#FFE5D9" strokeWidth="2" />

      {/* campaign structure tree */}
      <g stroke="#171717" strokeWidth="1.6" fill="none" strokeLinecap="round">
        <circle cx="72" cy="46" r="5" fill="#171717" />
        <path d="M72 51 V70" />
        <path d="M72 70 H132" />
        <path d="M72 70 V88" />
        <path d="M132 70 V88" />
        <circle cx="72" cy="90" r="4" />
        <circle cx="132" cy="90" r="4" fill="#FF6B35" stroke="#FF6B35" />
        <path d="M132 94 V108 H182" />
        <circle cx="182" cy="110" r="4" />
      </g>
      <text x="86" y="49" fontFamily="JetBrains Mono, monospace" fontSize="8" fill="#737373">
        campaign
      </text>
      <text x="138" y="93" fontFamily="JetBrains Mono, monospace" fontSize="7.5" fill="#E55A2B">
        ad group · exact
      </text>

      {/* spend / sales bars */}
      <g>
        {[
          { x: 44, h: 18 },
          { x: 60, h: 30 },
          { x: 76, h: 14 },
          { x: 92, h: 34 },
          { x: 108, h: 22 },
          { x: 124, h: 28 },
        ].map((bar, i) => (
          <rect
            key={bar.x}
            x={bar.x}
            y={148 - bar.h}
            width="10"
            height={bar.h}
            fill={i % 2 === 0 ? "#171717" : "#FF6B35"}
          />
        ))}
        <line x1="40" y1="150" x2="140" y2="150" stroke="#E5E5E0" strokeWidth="1" />
      </g>
      <text x="150" y="132" fontFamily="JetBrains Mono, monospace" fontSize="7.5" fill="#737373">
        spend vs
        <tspan x="150" dy="9">
          sales, wk
        </tspan>
      </text>

      {/* search-term checklist */}
      <g fontFamily="JetBrains Mono, monospace" fontSize="8" fill="#404040">
        {[
          { y: 182, done: true, label: "running shoes men → exact" },
          { y: 198, done: true, label: "sponsored products bid → exact" },
          { y: 214, done: false, label: "best ppc tool → negate" },
          { y: 230, done: false, label: "free ppc audit → negate" },
        ].map((row) => (
          <g key={row.y}>
            {row.done ? (
              <path
                d={`M44 ${row.y - 3} l3 3 l6 -6`}
                stroke="#FF6B35"
                strokeWidth="1.6"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : (
              <circle
                cx="49"
                cy={row.y - 1}
                r="4.5"
                stroke="#737373"
                strokeWidth="1.4"
                fill="none"
              />
            )}
            <text x="62" y={row.y}>
              {row.label}
            </text>
          </g>
        ))}
      </g>
    </svg>
  );
}

export function Mentor() {
  return (
    <section
      className={shared.sec}
      id="mentor"
      style={{ background: "linear-gradient(180deg, rgba(255,107,53,0.035), transparent)" }}
    >
      <div className={shared.wrap}>
        <div className={shared.secHead}>
          <div className={shared.stickyCol}>
            <span className={shared.secNum}>§06 / THE MENTOR</span>
            <h2 className={shared.secTitle}>Direct, grounded in real account work.</h2>
          </div>
          <p className={shared.secLede}>
            Ryan Roland Dabao leads the mentorship and the weekly live classes in the Ultimate tier.
            The voice you get is a working operator&rsquo;s — plain, specific, and honest about what
            the data can and can&rsquo;t promise.
          </p>
        </div>

        <Reveal className={styles.grid}>
          <div className={styles.photoCol}>
            <figure className={[shared.plate, styles.figure].join(" ")}>
              <span className={[shared.corner, shared.cornerTl].join(" ")} />
              <span className={[shared.corner, shared.cornerTr].join(" ")} />
              <span className={[shared.corner, shared.cornerBl].join(" ")} />
              <span className={[shared.corner, shared.cornerBr].join(" ")} />
              <NotebookSketch />
              <figcaption className={shared.plateCap}>
                FIG. 02 — a mentor&rsquo;s working notebook
              </figcaption>
            </figure>
            <div className={styles.stamp}>Field notes, not slides</div>
          </div>

          <div>
            <blockquote className={styles.quote}>
              <span className={styles.tl}>&ldquo;</span>PPC isn&rsquo;t about clicking buttons
              faster. It&rsquo;s about making fewer, better decisions — and being able to explain
              them when a client asks <em>why</em>.<span className={styles.tl}>&rdquo;</span>
            </blockquote>
            <div className={styles.by}>
              <Logo size={30} />
              <span className={styles.byText}>
                <b>Ryan Roland Dabao</b>
                <small>Mentor · Amazon PPC Senior Manager</small>
              </span>
            </div>
            <div className={styles.points}>
              <div className={styles.point}>
                <small>Live classes</small>
                <p>Ultimate tier — live with Ryan, every week. Real accounts, real calls.</p>
              </div>
              <div className={styles.point}>
                <small>1:1 review</small>
                <p>Ultimate tier — one portfolio review of the decisions you actually made.</p>
              </div>
              <div className={styles.point}>
                <small>Support</small>
                <p>
                  Stuck? Email us — we reply within 1 business day. Ultimate gets a faster line.
                </p>
              </div>
              <div className={styles.point}>
                <small>Certificate</small>
                <p>
                  Listed on your profile and recognized in our hiring pipeline — we hire from this
                  audience.
                </p>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
