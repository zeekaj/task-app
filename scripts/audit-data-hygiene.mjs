#!/usr/bin/env node

/**
 * Firestore Data Hygiene Audit (Read-only)
 *
 * Checks (current):
 *  - teamMembers with legacy role "member"
 *  - teamMembers with invalid role values
 *  - teamMembers missing organizationId, createdAt, updatedAt
 *  - Duplicate teamMembers emails per organization (case-insensitive)
 *  - viewerPermissions anomalies (non-viewer should have empty; freelance must be empty)
 *  - Org membership mirror mismatches (organizations/{orgId}/members/{uid})
 *
 * Usage:
 *   node scripts/audit-data-hygiene.mjs                # full audit (summaries)
 *   node scripts/audit-data-hygiene.mjs --limit 20     # limit listed examples per category
 *
 * Requirements:
 *   - npm i -D firebase-admin
 *   - FIREBASE_SERVICE_ACCOUNT_PATH env var set OR service-account-key.json at project root
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const args = process.argv.slice(2);
const limitIdx = args.indexOf('--limit');
const LIST_LIMIT = limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) || 50 : 50;

const ALLOWED_ROLES = new Set(['owner', 'admin', 'technician', 'freelance', 'viewer']);

// Initialize Firebase Admin
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './service-account-key.json';
let serviceAccount;
try {
  serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
} catch (e) {
  console.error('❌ Could not load service account key');
  console.error('Set FIREBASE_SERVICE_ACCOUNT_PATH or place service-account-key.json at project root');
  process.exit(1);
}
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

aSyncMain().catch((err) => { console.error('❌ Audit failed:', err); process.exit(1); });

async function aSyncMain() {
  console.log('🔍 Starting Firestore Data Hygiene Audit (read-only)');
  console.log(`Listing up to ${LIST_LIMIT} examples per category\n`);

  const tmSnap = await db.collection('teamMembers').get();
  console.log(`teamMembers total: ${tmSnap.size}`);

  const issues = {
    legacyMemberRole: [],
    invalidRole: [],
    missingOrg: [],
    missingCreatedAt: [],
    missingUpdatedAt: [],
    dupEmails: [],
    viewerPermsNonViewer: [],
    freelancePermsNonEmpty: [],
    memberMirrorMissing: [],
    memberMirrorRoleMismatch: [],
  };

  // Pass 1: per-doc checks and gather for duplicates and mirror
  const byOrgEmail = new Map(); // key: orgId|emailLower -> [doc]

  for (const d of tmSnap.docs) {
    const data = d.data();
    const id = d.id;
    const role = (data.role || '').toString();
    const orgId = data.organizationId || null;
    const email = (data.email || '').toString().trim().toLowerCase();
    const viewerPermissions = Array.isArray(data.viewerPermissions) ? data.viewerPermissions : [];

    if (role === 'member') issues.legacyMemberRole.push({ id, email, orgId });
    if (!ALLOWED_ROLES.has(role)) issues.invalidRole.push({ id, role, email, orgId });
    if (!orgId) issues.missingOrg.push({ id, email });
    if (!data.createdAt) issues.missingCreatedAt.push({ id, email, orgId });
    if (!data.updatedAt) issues.missingUpdatedAt.push({ id, email, orgId });

    if (role !== 'viewer' && viewerPermissions.length > 0) {
      issues.viewerPermsNonViewer.push({ id, role, count: viewerPermissions.length, orgId });
    }
    if (role === 'freelance' && viewerPermissions.length > 0) {
      issues.freelancePermsNonEmpty.push({ id, count: viewerPermissions.length, orgId });
    }

    if (orgId && email) {
      const key = `${orgId}|${email}`;
      const arr = byOrgEmail.get(key) || [];
      arr.push({ id, email, orgId, role });
      byOrgEmail.set(key, arr);
    }
  }

  // Duplicates per org by email
  for (const [key, arr] of byOrgEmail.entries()) {
    if (arr.length > 1) {
      issues.dupEmails.push({ key, docs: arr.map(a => a.id) });
    }
  }

  // Membership mirror checks
  // For each member with userId and orgId, ensure organizations/{orgId}/members/{userId} exists and role matches
  const memberDocs = tmSnap.docs;
  for (const d of memberDocs) {
    const data = d.data();
    const orgId = data.organizationId;
    const uid = data.userId;
    const role = data.role;
    if (!orgId || !uid) continue;

    try {
      const mirrorRef = db.doc(`organizations/${orgId}/members/${uid}`);
      const mirrorSnap = await mirrorRef.get();
      if (!mirrorSnap.exists) {
        issues.memberMirrorMissing.push({ teamMemberId: d.id, orgId, uid, role });
      } else {
        const m = mirrorSnap.data();
        const mirrorRole = m?.role;
        if (mirrorRole !== role) {
          issues.memberMirrorRoleMismatch.push({ teamMemberId: d.id, orgId, uid, role, mirrorRole });
        }
      }
    } catch (e) {
      // continue and report as missing if access fails
      issues.memberMirrorMissing.push({ teamMemberId: d.id, orgId, uid, role, error: e.message });
    }
  }

  // Print summaries with capped examples
  function printSection(title, arr, formatter) {
    console.log(`\n— ${title}: ${arr.length}`);
    if (arr.length === 0) return;
    const sample = arr.slice(0, LIST_LIMIT);
    for (const item of sample) console.log('  •', formatter(item));
    if (arr.length > sample.length) console.log(`  … and ${arr.length - sample.length} more`);
  }

  printSection('Legacy role = member', issues.legacyMemberRole, (i) => `${i.id} org=${i.orgId} ${i.email || ''}`);
  printSection('Invalid role values', issues.invalidRole, (i) => `${i.id} role=${i.role} org=${i.orgId}`);
  printSection('Missing organizationId', issues.missingOrg, (i) => `${i.id} ${i.email || ''}`);
  printSection('Missing createdAt', issues.missingCreatedAt, (i) => `${i.id} org=${i.orgId}`);
  printSection('Missing updatedAt', issues.missingUpdatedAt, (i) => `${i.id} org=${i.orgId}`);
  printSection('Duplicate emails within org', issues.dupEmails, (i) => `${i.key} -> [${i.docs.join(', ')}]`);
  printSection('viewerPermissions present on non-viewer', issues.viewerPermsNonViewer, (i) => `${i.id} role=${i.role} org=${i.orgId} count=${i.count}`);
  printSection('freelance with viewerPermissions', issues.freelancePermsNonEmpty, (i) => `${i.id} org=${i.orgId} count=${i.count}`);
  printSection('Membership mirror missing', issues.memberMirrorMissing, (i) => `${i.teamMemberId} org=${i.orgId} uid=${i.uid} role=${i.role}${i.error ? ' err=' + i.error : ''}`);
  printSection('Membership mirror role mismatch', issues.memberMirrorRoleMismatch, (i) => `${i.teamMemberId} org=${i.orgId} uid=${i.uid} role=${i.role} mirrorRole=${i.mirrorRole}`);

  console.log('\n✅ Audit complete (no writes performed).');
}
