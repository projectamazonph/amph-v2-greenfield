# Security Policy

## Supported Versions

This is the greenfield rebuild of `amph-v2`. Only the `main` branch receives
security updates. Older branches (if any) are not supported.

| Branch | Supported          |
|--------|--------------------|
| main   | :white_check_mark: |

## Reporting a Vulnerability

Please **do not open a public GitHub issue** for security vulnerabilities.

Email: **projectamazonph@gmail.com**

Include:
- A clear description of the issue and the impact you observed
- Steps to reproduce (proof of concept, screenshots, or a recorded run)
- The commit SHA or release tag where you observed the issue
- Your contact information for follow-up questions

You should receive an acknowledgment within 48 hours. We aim to triage and
provide a fix-or-mitigation plan within 7 days for high-severity issues.

## Scope

In scope:
- Authentication bypass
- Authorization bypass (cross-tenant data access)
- Payment integrity (PayMongo webhook spoofing, refund replay)
- PII exposure (logs, error reports, public endpoints)
- Remote code execution or command injection
- Stored or reflected XSS in user-facing pages

Out of scope:
- Denial of service
- Rate-limit edge cases that do not result in data loss
- Best-practice violations without a working exploit
- Reports against the legacy `amph-v2` (separate repository, separate policy)

## Disclosure

We follow coordinated disclosure. Please give us a reasonable window
(typically 90 days) before any public disclosure. We will credit reporters
in the fix commit unless you ask to remain anonymous.
