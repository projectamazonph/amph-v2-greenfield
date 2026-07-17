/**
 * gen-secret.js — generate a cryptographically strong secret for .env.
 *
 * Usage:
 *   pnpm gen-secret
 *   # or
 *   pnpm gen-secret --env JWT_SECRET
 *
 * Outputs a 64-character URL-safe base64 string and (with --env) writes to .env.
 */
import { randomBytes } from "node:crypto";

const arg = process.argv.find((a) => a.startsWith("--env="));
const envName = arg ? arg.split("=")[1] : null;

const secret = randomBytes(48).toString("base64url");

if (envName) {
  // Lazy-load fs only when writing
  const { readFileSync, writeFileSync, existsSync } = await import("node:fs");
  const path = ".env";
  let content = existsSync(path) ? readFileSync(path, "utf8") : "";
  const line = `${envName}="${secret}"`;
  if (new RegExp(`^${envName}=`, "m").test(content)) {
    content = content.replace(new RegExp(`^${envName}=.*$`, "m"), line);
  } else {
    content += (content.endsWith("\n") || !content ? "" : "\n") + line + "\n";
  }
  writeFileSync(path, content);
  console.log(`Wrote ${envName} to .env`);
} else {
  console.log(secret);
}
