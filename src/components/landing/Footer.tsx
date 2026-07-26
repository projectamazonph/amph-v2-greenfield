import { COURSES_URL } from "./constants";
import { Logo } from "./Logo";
import shared from "./shared.module.css";
import styles from "./Footer.module.css";

const ARCHITECTURE = [
  { level: "Master", name: "Project Amazon PH", used: "Social, tools, community, this site" },
  {
    level: "Product",
    name: "Project Amazon PH Academy",
    used: "Courses, simulators, certificates, receipts",
  },
  { level: "Personal", name: "Ryan Roland Dabao", used: "LinkedIn & expert-led mentorship" },
];

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={[shared.wrap, styles.in].join(" ")}>
        <div className={styles.top}>
          <div className={styles.brand}>
            <Logo />
            <p>
              Amazon ads training that helps Filipino VAs become specialists clients can see:
              competence, not hype. One-time payment, no subscription.
            </p>
          </div>

          <div className={styles.col}>
            <h5>Course</h5>
            <a href="#method">The method</a>
            <a href="#simulator">Simulators</a>
            <a href="#curriculum">Curriculum</a>
            <a href="#pricing">Pricing</a>
          </div>

          <div className={styles.col}>
            <h5>Project</h5>
            <a href="#whofor">Who it&rsquo;s for</a>
            <a href="#mentor">Mentor</a>
            <a href="#proof">What you can show</a>
            <a href="#faq">FAQ</a>
          </div>

          <div className={styles.col}>
            <h5>Enrol</h5>
            <a href={COURSES_URL} target="_blank" rel="noopener noreferrer">
              See the courses
            </a>
            <a href="#curriculum">See what&rsquo;s inside</a>
            <a href="/login">Sign in</a>
            <a href="#top">Back to top</a>
          </div>
        </div>

        <div className={styles.arch}>
          <table>
            <thead>
              <tr>
                <th>Level</th>
                <th>Name</th>
                <th>Used for</th>
              </tr>
            </thead>
            <tbody>
              {ARCHITECTURE.map((row) => (
                <tr key={row.level}>
                  <td>{row.level}</td>
                  <td>{row.name}</td>
                  <td>{row.used}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className={styles.bottom}>
          <span>
            © 2026 Project Amazon PH · ₱2,999 / ₱5,999 / ₱9,999 · one-time via PayMongo ·{" "}
            <b>no subscription</b>
          </span>
          <span>Alt: Project Amazon PH. Amazon PPC skills and training for Filipino VAs.</span>
        </div>
      </div>
    </footer>
  );
}
