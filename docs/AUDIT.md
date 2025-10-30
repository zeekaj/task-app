# Firestore Data Hygiene Audit

Read-only audit to surface common data quality issues so your app stays predictable, performant, and secure.

## What it checks

- Legacy roles: teamMembers with `role == "member"`
- Invalid roles: values not in `{owner, admin, technician, freelance, viewer}`
- Missing fields: `organizationId`, `createdAt`, `updatedAt`
- Duplicate emails per organization (case-insensitive)
- viewerPermissions anomalies:
  - Non-viewer has `viewerPermissions` set (should be empty)
  - Freelance has `viewerPermissions` (must be empty)
- Membership mirror issues (`organizations/{orgId}/members/{uid}`):
  - Missing mirror document for members with `userId`
  - Role mismatch between mirror doc and team member doc

## Usage

Prerequisites
- A Firebase Admin service account JSON file.
- Install Admin SDK in this workspace:
  - `npm i -D firebase-admin`
- Provide credentials in one of these ways:
  - Set env var `FIREBASE_SERVICE_ACCOUNT_PATH=/absolute/path/to/service-account.json`, or
  - Place `service-account-key.json` in the project root (gitignored).

Run
- Full audit (summaries): `npm run scripts:audit-data`
- Limit listed examples (e.g., 20): `npm run scripts:audit-data:limit`

Notes
- The audit is read-only; it performs no writes.
- Output shows totals and up to N examples per category; increase the limit flag to see more.

## Related utilities

- Role normalization: convert legacy `member` → `technician`.
  - Dry run: `npm run scripts:normalize-roles:dry`
  - Apply: `npm run scripts:normalize-roles`

## Remediation playbook

- Legacy/invalid roles: run the role normalizer; add guards in services to prevent regressions.
- Missing `organizationId`/timestamps: backfill via a one-off script; ensure services set them on create/update.
- Duplicates per org: merge strategy — pick a survivor record, move references, deactivate duplicates.
- viewerPermissions anomalies: clear for non-viewers; keep empty for freelance.
- Membership mirror: create/update mirror docs and keep them in sync on role/active changes.

## Safety checklist

- Always run in a non-production project first.
- Back up Firestore before applying any write scripts.
- Prefer idempotent writes and batch commits (<500 ops per batch).
- Log a summary of all changes.
