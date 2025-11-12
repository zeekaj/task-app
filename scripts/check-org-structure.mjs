#!/usr/bin/env node

/**
 * Check user-based subcollections for tasks/projects
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
  console.log('🔍 Checking for user-based data structure\n');

  // Get all team members with organizationId
  const tmSnap = await db.collection('teamMembers').get();
  const orgIds = new Set();
  tmSnap.forEach(doc => {
    const orgId = doc.data().organizationId;
    if (orgId) orgIds.add(orgId);
  });

  console.log(`Found ${orgIds.size} unique organizationId(s): ${Array.from(orgIds).join(', ')}\n`);

  // Check if there are tasks/projects under the organization path
  for (const orgId of orgIds) {
    console.log(`Checking organizations/${orgId}/...`);
    
    // Try to get tasks
    const tasksSnap = await db.collection(`organizations/${orgId}/tasks`).limit(5).get();
    console.log(`  tasks: ${tasksSnap.size} sample`);
    if (tasksSnap.size > 0) {
      const sample = tasksSnap.docs[0];
      console.log(`    Sample: ${sample.id}`);
      console.log(`    Fields: ${Object.keys(sample.data()).join(', ')}`);
    }

    // Try to get projects
    const projSnap = await db.collection(`organizations/${orgId}/projects`).limit(5).get();
    console.log(`  projects: ${projSnap.size} sample`);
    if (projSnap.size > 0) {
      const sample = projSnap.docs[0];
      console.log(`    Sample: ${sample.id}`);
      console.log(`    Fields: ${Object.keys(sample.data()).join(', ')}`);
    }

    // Try to get activities
    const actSnap = await db.collection(`organizations/${orgId}/activities`).limit(5).get();
    console.log(`  activities: ${actSnap.size} sample`);
  }

  process.exit(0);
})().catch((e) => {
  console.error('❌ Fatal:', e);
  process.exit(1);
});
