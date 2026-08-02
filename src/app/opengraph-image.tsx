import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "Project Amazon PH Academy";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  const markSvg = readFileSync(
    join(process.cwd(), "public/brand/logos/project-amazon-ph-mark.svg"),
    "utf-8",
  );
  const markDataUri = `data:image/svg+xml;base64,${Buffer.from(markSvg).toString("base64")}`;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#FAFAF7",
      }}
    >
      <img src={markDataUri} width={220} height={220} alt="" />
      <div
        style={{
          marginTop: 40,
          fontSize: 56,
          fontWeight: 700,
          color: "#171717",
          letterSpacing: -1,
        }}
      >
        Project Amazon PH Academy
      </div>
      <div style={{ marginTop: 16, fontSize: 26, color: "#737373" }}>
        Amazon PPC training for Filipino VAs
      </div>
    </div>,
    { ...size },
  );
}
