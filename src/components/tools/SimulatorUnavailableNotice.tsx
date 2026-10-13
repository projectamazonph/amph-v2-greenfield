import Link from "next/link";
import { Card } from "@astryxdesign/core";
import styles from "./SimulatorUnavailableNotice.module.css";

interface SimulatorUnavailableNoticeProps {
  readonly simulatorName: string;
}

export function SimulatorUnavailableNotice({ simulatorName }: SimulatorUnavailableNoticeProps) {
  return (
    <Card padding={6}>
      <div className={styles.stateBlock}>
        <p className={styles.title}>{simulatorName} is being set up</p>
        <p className={styles.body}>
          This simulator has no published scenario yet, so there is nothing to practice against.
          Your progress and saved work are unchanged. Check back after the next content release.
        </p>
        <Link href="/tools" className={styles.link}>
          Back to all tools
        </Link>
      </div>
    </Card>
  );
}
