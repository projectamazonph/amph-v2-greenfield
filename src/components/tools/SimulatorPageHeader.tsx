import { getSimulatorCopy, type SimulatorCopyId } from "@/lib/copy/simulatorCopy";
import styles from "./SimulatorPageHeader.module.css";

interface Props {
  readonly simulatorId: SimulatorCopyId;
  readonly title: string;
  readonly description: string;
}

export function SimulatorPageHeader({ simulatorId, title, description }: Props) {
  const copy = getSimulatorCopy(simulatorId);

  return (
    <header className={styles.header}>
      <span className={styles.eyebrow}>{copy.label}</span>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.brief}>{description}</p>
      <p className={styles.outcome}>
        <strong>Practice goal.</strong> {copy.outcome}
      </p>
    </header>
  );
}
