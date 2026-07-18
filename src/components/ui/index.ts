/**
 * src/components/ui/index.ts — barrel export.
 *
 * STORY-046-prep-3: base component library.
 *
 * Consumers import from `@/components/ui`:
 *   import { Button, Card, Input, Badge } from "@/components/ui";
 *
 * Not all components from the design spec §5 are here yet — only the
 * four the admin stories need first. Modal, Toast, Tabs, NavSidebar,
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
