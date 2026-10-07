"use client";

import { useTheme } from "@/hooks/useTheme";
import { Sun, Moon } from "@phosphor-icons/react/dist/ssr";
import styles from "./ThemeToggle.module.css";

export function ThemeToggle() {
  const [theme, setTheme] = useTheme();

  return (
    <button
      type="button"
      className={styles.button}
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
      title={theme === "light" ? "Dark mode" : "Light mode"}
    >
      <span className={styles.icon} aria-hidden>
        <Sun size={18} weight="regular" />
      </span>
      <span className={styles.icon} aria-hidden>
        <Moon size={18} weight="regular" />
      </span>
    </button>
  );
}
