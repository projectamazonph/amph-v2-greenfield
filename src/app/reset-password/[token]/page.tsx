/**
 * /reset-password/[token] — STORY-008.
 *
 * The user lands here from the link in the reset email. The
 * form embeds the token in a hidden field and posts to the
 * resetPasswordAction with the new password.
 */

import { ResetConfirmForm } from "@/components/auth/ResetConfirmForm";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ token: string }>;
}

export default async function ResetConfirmPage({ params }: Props) {
  const { token } = await params;
  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Set a new password</h1>
      <p className={styles.body}>
        Choose a password at least 8 characters long with a mix of
        letters, numbers, and ideally a symbol.
      </p>
      <ResetConfirmForm token={token} />
    </main>
  );
}
