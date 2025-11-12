#!/usr/bin/env node

/**
 * Firestore Structure Inspector
 * Explores the actual structure to understand the data model
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
  console.log('🔍 Inspecting Firestore Structure\n');

  // Check root collections
  const collections = await db.listCollections();
  console.log('Root collections:', collections.map(c => c.id).join(', '));

  // Sample each collection
  for (const col of collections) {
    const snap = await col.limit(1).get();
    console.log(`\n${col.id}: ${snap.size} sample doc(s)`);
    if (snap.size > 0) {
      const doc = snap.docs[0];
      const data = doc.data();
      console.log(`  Sample ID: ${doc.id}`);
      console.log(`  Fields:`, Object.keys(data).join(', '));
      
      // Check for subcollections
      const subcols = await doc.ref.listCollections();
      if (subcols.length > 0) {
        console.log(`  Subcollections:`, subcols.map(c => c.id).join(', '));
      }
    }
  }

  // Check teamMembers structure
  const tmSnap = await db.collection('teamMembers').get();
  console.log(`\nteamMembers total: ${tmSnap.size}`);
  if (tmSnap.size > 0) {
    const sample = tmSnap.docs[0];
    console.log('Sample teamMember:', sample.id);
    console.log('  organizationId:', sample.data().organizationId);
    console.log('  userId:', sample.data().userId);
    console.log('  role:', sample.data().role);
  }

  process.exit(0);
})().catch((e) => {
  console.error('❌ Fatal:', e);
  process.exit(1);
});
