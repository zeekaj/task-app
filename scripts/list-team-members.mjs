#!/usr/bin/env node

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
  const snap = await db.collection('teamMembers').get();
  console.log('teamMembers total:', snap.size);
  for (const doc of snap.docs) {
    const d = doc.data();
    console.log(`- ${doc.id}: ${d.name || '<no name>'} <${d.email || '-'}> role=${d.role} userId=${d.userId || '-'} organizationId=${d.organizationId || '-'} active=${d.active}`);
  }
  process.exit(0);
})().catch((e) => {
  console.error('❌ Fatal:', e);
  process.exit(1);
});
