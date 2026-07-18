/**
 * UserCard — the user info + logout button at the bottom of NavSidebar.
 *
 * Per design spec §9.1: avatar (first letter of first name), name,
 * role badge, logout button.
 *
 * Server component. Logout is a form action — in the future, when
 * SignOut use case exists, the form will POST to a server action.
 * For now it's a placeholder button (no behavior).
 */

import type { User } from "@/domain/entities/User";
import styles from "./UserCard.module.css";

export interface UserCardProps {
  user: User;
}

function initials(user: User): string {
  return user.firstName.charAt(0).toUpperCase() + (user.lastName?.charAt(0).toUpperCase() ?? "");
}

export function UserCard({ user }: UserCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.avatar} aria-hidden>
        {initials(user)}
      </div>
      <div className={styles.info}>
        <div className={styles.name}>
          {user.firstName} {user.lastName}
        </div>
        <div className={styles.role}>{user.role}</div>
      </div>
      <form action="/api/auth/logout" method="post" className={styles.logoutForm}>
        <button type="submit" className={styles.logoutButton} aria-label="Log out">
          ⎋
        </button>
      </form>
    </div>
  );
}
