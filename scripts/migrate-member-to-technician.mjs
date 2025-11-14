#!/usr/bin/env node

/**
 * Migrate all teamMembers with role === 'member' to role === 'technician'
 * This is an explicit migration you should run once in your dev/staging/production environment
 * Use with care — it will update documents in your Firestore.
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './service-account-key.json';
let serviceAccount;
try {
  serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
} catch (e) {
  console.error('❌ Could not load service account key');
  process.exit(1);
}
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

(async function main() {
  console.log('🔁 Migrate teamMembers: member -> technician');
  const snap = await db.collection('teamMembers').where('role', '==', 'member').get();
  console.log('Found', snap.size, 'member records');
  if (snap.empty) {
    console.log('No records to update. Exiting.');
    process.exit(0);
  }

  const confirmEnv = process.env.CONFIRM_MIGRATE || null;
  if (!confirmEnv) {
    console.log('Safety: Set environment variable CONFIRM_MIGRATE=1 to actually perform updates.');
    console.log('Listing affected docs:');
    for (const d of snap.docs) {
      const data = d.data();
      console.log(`- ${d.id}: ${data.name || '<no name>'} <${data.email || '-'}>`);
    }
    process.exit(0);
  }

  const batch = db.batch();
  for (const doc of snap.docs) {
    const ref = doc.ref;
    batch.update(ref, { role: 'technician', updatedAt: new Date() });
    console.log('Queued update for', doc.id);
  }
  await batch.commit();
  console.log('✅ Migration committed. Updated', snap.size, 'documents.');
  process.exit(0);
})().catch((e) => {
  console.error('❌ Fatal:', e);
  process.exit(1);
});
