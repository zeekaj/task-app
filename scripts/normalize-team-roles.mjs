#!/usr/bin/env node

/**
 * Normalize Team Roles: Convert legacy role "member" to "technician" in global teamMembers
 *
 * BEFORE RUNNING:
 * 1) Backup your Firestore database
 * 2) Ensure firebase-admin is installed in this workspace: npm i -D firebase-admin
 * 3) Provide a service account key and set FIREBASE_SERVICE_ACCOUNT_PATH, or place
 *    service-account-key.json at the project root
 *
 * Usage:
 *   node scripts/normalize-team-roles.mjs --dry-run  # preview changes only
 *   node scripts/normalize-team-roles.mjs            # apply updates
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');

// Initialize Firebase Admin
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './service-account-key.json';
let serviceAccount;

try {
  serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
} catch (error) {
  console.error('❌ Error: Could not load service account key');
  console.error('Please set FIREBASE_SERVICE_ACCOUNT_PATH or place service-account-key.json in project root');
  process.exit(1);
}

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function normalizeRoles() {
  console.log('🔎 Scanning teamMembers for legacy role "member"...');
  console.log(isDryRun ? '📋 DRY RUN MODE - No changes will be made\n' : '⚠️  LIVE MODE - Database will be modified\n');

  const snap = await db.collection('teamMembers').where('role', '==', 'member').get();
  const total = snap.size;
  console.log(`Found ${total} team member(s) with role = "member"`);

  if (total === 0) {
    console.log('✅ Nothing to update.');
    return;
  }

  let processed = 0;
  let updated = 0;
  let errors = 0;

  let batch = db.batch();
  let batchCount = 0;
  const BATCH_LIMIT = 400; // safe under 500 limit

  for (const doc of snap.docs) {
    processed++;
    const data = doc.data();
    const display = data.name || data.email || doc.id;

    if (isDryRun) {
      console.log(`→ Would update ${display} (${doc.id}) role: member → technician`);
      continue;
    }

    try {
      batch.update(doc.ref, {
        role: 'technician',
        updatedAt: FieldValue.serverTimestamp(),
      });
      batchCount++;
      updated++;

      if (batchCount >= BATCH_LIMIT) {
        await batch.commit();
        batch = db.batch();
        batchCount = 0;
        console.log('… committed a batch of updates');
      }
    } catch (e) {
      console.error(`❌ Failed to queue update for ${display} (${doc.id}):`, e.message);
      errors++;
    }
  }

  if (!isDryRun && batchCount > 0) {
    await batch.commit();
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Normalize Roles Summary');
  console.log('='.repeat(60));
  console.log(`Total legacy records scanned: ${processed}`);
  console.log(`Updated to technician:        ${isDryRun ? 0 : updated}`);
  console.log(`Errors:                       ${errors}`);
  console.log('='.repeat(60));

  if (isDryRun) {
    console.log('\n📋 This was a DRY RUN. No changes were made.');
    console.log('Run without --dry-run to apply updates.');
  } else {
    console.log('\n✅ Normalization completed.');
  }
}

normalizeRoles().catch((err) => {
  console.error('❌ Script error:', err);
  process.exit(1);
});
