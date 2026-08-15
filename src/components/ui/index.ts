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

// H-07 fix: extend the barrel so consumers stop deep-importing the
// remaining UI primitives. The rule of thumb from AGENTS.md is "if AMPH
// already has it, use the AMPH component". That requires a complete
// public API surface - a missing export pushes consumers toward the
// deep-import path. Round 9 wires Breadcrumb, CommandPalette,
// ConfirmDialog, EmptyState, MobileNavToggle, PrintButton, RouteError,
// ScrollToTop, and every Skeleton primitive through the barrel with
// their prop types.

export { Breadcrumb } from "./Breadcrumb";
export type { BreadcrumbItem, BreadcrumbProps } from "./Breadcrumb";

export { CommandPalette } from "./CommandPalette";
export type { CommandItem, CommandPaletteProps } from "./CommandPalette";

export { ConfirmDialog } from "./ConfirmDialog";
export type { ConfirmDialogProps } from "./ConfirmDialog";

export { EmptyState } from "./EmptyState";
export type { EmptyStateProps } from "./EmptyState";

export { MobileNavToggle } from "./MobileNavToggle";
export type { MobileNavToggleProps } from "./MobileNavToggle";

export { PrintButton } from "./PrintButton";

// RouteErrorProps is intentionally kept unexported from the source module
// (encapsulation: only this wrapper needs to type the digest/withinMain
// shape). Consumers get the component from the barrel; the type stays
// internal to keep the public surface minimal.
export { RouteError } from "./RouteError";

export { ScrollToTop } from "./ScrollToTop";

export {
  SkeletonBlock,
  SkeletonText,
  SkeletonRow,
  SkeletonCard,
  SkeletonTable,
  SkeletonStatTile,
  SkeletonForm,
} from "./Skeleton";
export type { SkeletonBlockProps } from "./Skeleton";
