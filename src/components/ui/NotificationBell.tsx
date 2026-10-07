"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Bell } from "@phosphor-icons/react";
import type { NotificationActionResult, NotificationView } from "@/app/actions/notification.action";
import styles from "./NotificationBell.module.css";

const POLL_MS = 30_000;

interface BellState {
  notifications: NotificationView[];
  unreadCount: number;
}

export interface NotificationBellActions {
  list: () => Promise<
    NotificationActionResult<{ notifications: NotificationView[]; unreadCount: number }>
  >;
  markRead: (id: string) => Promise<NotificationActionResult<{ id: string }>>;
  markAllRead: () => Promise<NotificationActionResult<{ marked: number }>>;
}

interface NotificationBellProps {
  /**
   * Server-action bindings, passed down from a server parent
   * (StudentShell). Absent in unit tests and static renders: the
   * bell shows without a badge and never polls.
   */
  actions?: NotificationBellActions;
}

/**
 * NotificationBell — in-app notification bell (P3-87).
 *
 * Polls the list action every 30s. Shows the unread count as a
 * badge; clicking an item marks it read (best-effort, the dropdown
 * closes regardless). "Mark all read" zeroes the badge. Failures
 * are silent: the bell keeps the last good state and retries on
 * the next poll.
 */
export function NotificationBell({ actions }: NotificationBellProps) {
  const [state, setState] = useState<BellState>({ notifications: [], unreadCount: 0 });
  const [open, setOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    if (!actions) return;
    try {
      const result = await actions.list();
      if (result.ok) {
        setState({
          notifications: [...result.value.notifications],
          unreadCount: result.value.unreadCount,
        });
      }
    } catch {
      // Silent: keep last good state, retry on next poll.
    }
  }, [actions]);

  useEffect(() => {
    if (!actions) return;
    void refresh();
    timerRef.current = setInterval(() => {
      void refresh();
    }, POLL_MS);
    return () => {
      if (timerRef.current !== null) clearInterval(timerRef.current);
    };
  }, [actions, refresh]);

  async function onItemClick(id: string) {
    setOpen(false);
    if (!actions) return;
    try {
      const result = await actions.markRead(id);
      if (result.ok) {
        setState((current) => {
          // CLICK-PATH-004: only decrement when the item was actually
          // unread. Clicking an already-read item must not move the badge.
          const target = current.notifications.find((n) => n.id === id);
          if (target?.readAt) return current;
          return {
            notifications: current.notifications.map((n) =>
              n.id === id ? { ...n, readAt: new Date().toISOString() } : n,
            ),
            unreadCount: Math.max(0, current.unreadCount - 1),
          };
        });
      }
    } catch {
      // Silent: the server state is unchanged; next poll reconciles.
    }
  }

  async function onMarkAllRead() {
    if (!actions) return;
    try {
      const result = await actions.markAllRead();
      if (result.ok) {
        setState((current) => ({
          notifications: current.notifications.map((n) => ({
            ...n,
            readAt: n.readAt ?? new Date().toISOString(),
          })),
          unreadCount: 0,
        }));
      }
    } catch {
      // Silent: next poll reconciles.
    }
  }

  return (
    <div className={styles.wrapper}>
      <button
        type="button"
        className={styles.bell}
        aria-label={
          state.unreadCount > 0 ? `Notifications, ${state.unreadCount} unread` : "Notifications"
        }
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <Bell size={20} weight="bold" aria-hidden="true" />
        {state.unreadCount > 0 ? (
          <span className={styles.badge} aria-hidden="true">
            {state.unreadCount > 9 ? "9+" : state.unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className={styles.dropdown} role="dialog" aria-label="Notifications">
          <div className={styles.dropdownHead}>
            <strong>Notifications</strong>
            {state.unreadCount > 0 ? (
              <button type="button" className={styles.markAll} onClick={onMarkAllRead}>
                Mark all read
              </button>
            ) : null}
          </div>
          {state.notifications.length === 0 ? (
            <p className={styles.empty}>No notifications yet.</p>
          ) : (
            <ul className={styles.list}>
              {state.notifications.slice(0, 10).map((n) => (
                <li key={n.id} className={n.readAt === null ? styles.unread : styles.read}>
                  {n.href ? (
                    <Link
                      href={n.href}
                      className={styles.item}
                      onClick={() => void onItemClick(n.id)}
                    >
                      <span className={styles.itemTitle}>{n.title}</span>
                      <span className={styles.itemBody}>{n.body}</span>
                    </Link>
                  ) : (
                    <button
                      type="button"
                      className={styles.item}
                      onClick={() => void onItemClick(n.id)}
                    >
                      <span className={styles.itemTitle}>{n.title}</span>
                      <span className={styles.itemBody}>{n.body}</span>
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
