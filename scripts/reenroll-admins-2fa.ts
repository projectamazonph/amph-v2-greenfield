/**
 * CLI script to re-enroll admins who were onboarded before the requires2FA policy.
 *
 * STORY-ops-2fa-enforce / #413
 *
 * Usage:
 *   pnpm exec tsx scripts/reenroll-admins-2fa.ts
 *
 * This script:
 * 1. Finds all ADMIN users with requires2FA=true but twoFactorEnabled=false
 * 2. Generates a new TOTP secret for each
 * 3. Prints a CSV with user email, name, and QR code URL for manual setup
 */

import { buildContainer } from "@/composition/container";
import { TWO_FACTOR_ISSUER } from "@/usecases/EnableTwoFactor";

async function main() {
  const { userRepo, totpService } = buildContainer();

  // Find admins who need re-enrollment
  const allUsersResult = await userRepo.listAll();
  if (!allUsersResult.ok) {
    console.error("Failed to list users:", allUsersResult.error);
    process.exit(1);
  }

  const adminsNeeding2FA = allUsersResult.value.filter(
    (u) => u.role === "ADMIN" && u.requires2FA && !u.twoFactorEnabled,
  );

  if (adminsNeeding2FA.length === 0) {
    console.log("No admins require 2FA re-enrollment.");
    return;
  }

  console.log(`Found ${adminsNeeding2FA.length} admin(s) requiring 2FA re-enrollment:
`);
  console.log("Email,Name,QR Code URL");

  for (const user of adminsNeeding2FA) {
    const secret = totpService.generateSecret();
    const setResult = await userRepo.setTwoFactorSecret(user.id, secret);
    if (!setResult.ok) {
      console.error(`Failed to set secret for ${user.email}:`, setResult.error);
      continue;
    }

    const keyUri = totpService.keyUri({
      secret,
      accountName: user.email,
      issuer: TWO_FACTOR_ISSUER,
    });

    console.log(`"${user.email}","${user.firstName} ${user.lastName}","${keyUri}"`);
  }

  console.log("
Re-enrollment CSV generated. Admins can scan the QR codes to set up 2FA.");
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
