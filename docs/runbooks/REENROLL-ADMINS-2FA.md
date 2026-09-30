# Runbook: Re-enrolling Locked-Out Admins (2FA Enforcement)

## Overview

When the `requires2FA` policy is enabled for admin accounts (STORY-ops-2fa-enforce / #413),
admins who have not enrolled in 2FA will be redirected to the 2FA setup page when attempting
to access any `/admin/*` route.

This runbook covers the procedure for:
1. Re-enrolling a single locked-out admin
2. Bulk re-enrolling multiple admins
3. Emergency recovery if an admin is completely locked out

## Prerequisites

- Database access (to update User records)
- Access to the application server
- Admin credentials for at least one admin with 2FA already enabled

## Procedure A: Single Admin Re-enrollment (via UI)

1. **Admin self-service (preferred):**
   - The admin receives a redirect to `/admin/settings/2fa-setup` when trying to access any admin route
   - They follow the on-screen instructions to scan the QR code with their authenticator app
   - After entering a valid code, they are redirected back to their original destination

2. **Admin-assisted re-enrollment:**
   - Another admin (with 2FA enabled) logs in
   - Navigates to `/admin/users/[id]` for the locked-out admin
   - Clicks "Reset 2FA" (this feature needs to be implemented - see Future Work)
   - Provides the new QR code to the locked-out admin

## Procedure B: Bulk Re-enrollment (via CLI)

Use the provided CLI script to generate QR codes for all admins needing re-enrollment:

```bash
# Run the re-enrollment script
pnpm exec tsx scripts/reenroll-admins-2fa.ts
```

This outputs a CSV with columns: Email, Name, QR Code URL

### Distributing QR Codes

1. Send each admin their personal QR code URL
2. Include instructions:
   - Open authenticator app (Google Authenticator, Authy, etc.)
   - Scan the QR code OR manually enter the secret
   - Enter the 6-digit code when prompted
   - Save backup codes

3. Admins can then log in normally with their password + 2FA code

## Procedure C: Emergency Recovery (Database-Level)

If an admin is completely locked out and cannot access the UI:

1. **Connect to the database:**
   ```bash
   psql $DATABASE_URL
   ```

2. **Check the admin's 2FA status:**
   ```sql
   SELECT id, email, requires2FA, twoFactorEnabled, twoFactorSecret
   FROM "User"
   WHERE email = 'admin@example.com';
   ```

3. **Temporarily disable the requires2FA flag (if safe):**
   ```sql
   UPDATE "User"
   SET requires2FA = false
   WHERE email = 'admin@example.com';
   ```
   
   This allows the admin to log in without 2FA, then enable it via the UI.

4. **OR: Generate a new secret manually:**
   ```sql
   -- Generate a new TOTP secret (use a secure random generator)
   -- Then update the user:
   UPDATE "User"
   SET twoFactorSecret = 'NEW_SECRET_HERE', twoFactorEnabled = false
   WHERE email = 'admin@example.com';
   ```
   
   Provide the secret to the admin to scan/enter.

5. **After recovery, re-enable requires2FA:**
   ```sql
   UPDATE "User"
   SET requires2FA = true
   WHERE email = 'admin@example.com';
   ```

## Verification

After re-enrollment, verify the admin can:
- Log in with password + 2FA code
- Access all admin routes
- See the 2FA enabled badge on their profile

## Future Work

- [ ] Add "Reset 2FA" button to admin user detail page
- [ ] Add audit logging for 2FA enforcement actions
- [ ] Add email notifications for 2FA enrollment requirements
- [ ] Add admin dashboard widget showing 2FA compliance status

## Notes

- The `requires2FA` flag defaults to `false` for existing users
- New ADMIN users should have `requires2FA = true` by default
- The `twoFactorEnabled` flag is set to `true` only after successful verification via ConfirmTwoFactor
- The proxy.ts enforces the check at the edge, before any page code runs
