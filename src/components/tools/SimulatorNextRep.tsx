import { getSimulatorCopy, type SimulatorCopyId } from "@/lib/copy/simulatorCopy";
import styles from "./SimulatorNextRep.module.css";

interface Props {
  readonly simulatorId: SimulatorCopyId;
}

export function SimulatorNextRep({ simulatorId }: Props) {
  const copy = getSimulatorCopy(simulatorId);

  return (
    <p className={styles.nextRep}>
      <strong>Next rep.</strong> {copy.nextRep}
    </p>
  );
}
