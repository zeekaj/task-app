#!/usr/bin/env node
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./service-account-key.json', 'utf8'));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function checkData() {
  console.log('🔍 Detailed data check...\n');
  
  // Check users collection and subcollections
  const usersSnapshot = await db.collection('users').get();
  console.log(`👥 Users collection: ${usersSnapshot.size} documents`);
  
  for (const userDoc of usersSnapshot.docs) {
    console.log(`\n  User: ${userDoc.id}`);
    const subcollections = await userDoc.ref.listCollections();
    for (const subcol of subcollections) {
      const subSnapshot = await subcol.get();
      console.log(`    - ${subcol.id}: ${subSnapshot.size} documents`);
    }
  }
  
  // Check organizations collection
  const orgsSnapshot = await db.collection('organizations').get();
  console.log(`\n🏢 Organizations collection: ${orgsSnapshot.size} documents`);
  
  for (const orgDoc of orgsSnapshot.docs) {
    console.log(`\n  Org: ${orgDoc.id}`);
    const subcollections = await orgDoc.ref.listCollections();
    for (const subcol of subcollections) {
      const subSnapshot = await subcol.get();
      console.log(`    - ${subcol.id}: ${subSnapshot.size} documents`);
    }
  }
  
  // Check team members
  const teamSnapshot = await db.collection('teamMembers').get();
  console.log(`\n👨‍👩‍👧‍👦 Team Members: ${teamSnapshot.size} documents`);
  const orgIds = new Set();
  teamSnapshot.docs.forEach(doc => {
    const data = doc.data();
    if (data.organizationId) orgIds.add(data.organizationId);
  });
  console.log(`   Unique organization IDs: ${Array.from(orgIds).join(', ')}`);
}

checkData()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
