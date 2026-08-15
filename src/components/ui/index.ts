/**
 * src/components/ui/index.ts — barrel export.
 *
 * STORY-046-prep-3: base component library.
 *
 * Consumers import from `@/components/ui`:
 *   import { Button, Card, Input, Badge, Toast, ToastContainer } from "@/components/ui";
 *
 * Not all components from the design spec §5 are here yet — only the
 * ones that have shipped with their stories. Modal, Tabs, NavSidebar,
 * TopBar, BottomNav, Table, RevealSection land as their own prep
 * stories.
 */

export { Button } from "./Button";
export type { ButtonProps, ButtonVariant, ButtonSize } from "./Button";

export { Card } from "./Card";
export type { CardProps, CardVariant, CardPadding } from "./Card";

export { Input } from "./Input";
export type { InputProps, InputSize } from "./Input";

export { Badge } from "./Badge";
export type { BadgeProps, BadgeVariant, BadgeShape } from "./Badge";

export { SubmitButton } from "./SubmitButton";
export type { SubmitButtonProps } from "./SubmitButton";

// M-06 fix: Toast component ships with role="alert" and aria-live="polite";
// expose it from the barrel so consumers wire it through the public API
// instead of deep-importing @/components/ui/Toast.
export { Toast, ToastContainer } from "./Toast";
export type { ToastType, ToastProps, ToastContainerProps } from "./Toast";
