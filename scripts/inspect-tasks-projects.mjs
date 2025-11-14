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
  console.log('🔎 Tasks (sample)');
  const tasksSnap = await db.collection('tasks').limit(50).get();
  console.log('tasks total sample:', tasksSnap.size);
  for (const doc of tasksSnap.docs) {
    const d = doc.data();
    console.log(`- ${doc.id}: ${d.title || '<no title>'}`);
    console.log(`    assignee: ${JSON.stringify(d.assignee)}`);
    console.log(`    createdBy: ${d.createdBy}`);
    console.log(`    projectId: ${d.projectId}`);
    console.log(`    status: ${d.status}`);
  }

  console.log('\n🔎 Projects (sample)');
  const projSnap = await db.collection('projects').limit(50).get();
  console.log('projects total sample:', projSnap.size);
  for (const doc of projSnap.docs) {
    const d = doc.data();
    console.log(`- ${doc.id}: ${d.title || '<no title>'}`);
    console.log(`    projectManager: ${d.projectManager}`);
    console.log(`    assignees: ${JSON.stringify(d.assignees)}`);
  }

  process.exit(0);
})().catch((e) => {
  console.error('❌ Fatal:', e);
  process.exit(1);
});
