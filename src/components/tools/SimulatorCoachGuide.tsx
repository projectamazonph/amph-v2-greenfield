import { getSimulatorCopy, type SimulatorCopyId } from "@/lib/copy/simulatorCopy";
import styles from "./SimulatorCoachGuide.module.css";

interface Props {
  readonly simulatorId: SimulatorCopyId;
}

export function SimulatorCoachGuide({ simulatorId }: Props) {
  const copy = getSimulatorCopy(simulatorId);

  return (
    <section className={styles.guide} aria-labelledby={`${simulatorId}-coach-heading`}>
      <h2 id={`${simulatorId}-coach-heading`} className={styles.title}>
        Your task
      </h2>
      <p className={styles.task}>{copy.task}</p>
      <details className={styles.details}>
        <summary>Coach note</summary>
        <p>{copy.coachNote}</p>
      </details>
    </section>
  );
}
