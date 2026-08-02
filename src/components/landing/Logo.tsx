import Image from "next/image";
import shared from "./Logo.module.css";

interface LogoProps {
  size?: number;
  tagline?: string;
  className?: string;
}

/**
 * Square mark + wordmark, per BRAND-GUIDE.md: the mark variant is for
 * "avatar, favicon, app icon, compact navbar", paired here with live text
 * rather than the baked-in wordmark SVG so the tagline can change per spot.
 */
export function Logo({ size = 34, tagline, className }: LogoProps) {
  return (
    <span className={[shared.logo, className].filter(Boolean).join(" ")}>
      <Image
        src="/brand/logos/project-amazon-ph-mark.png"
        alt=""
        width={size}
        height={size}
        className={shared.mark}
      />
      <span className={shared.wordmark}>
        Project Amazon PH
        {tagline ? <small className={shared.tagline}>{tagline}</small> : null}
      </span>
    </span>
  );
}
