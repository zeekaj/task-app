#!/usr/bin/env node
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./service-account-key.json', 'utf8'));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function checkStructure() {
  console.log('🔍 Checking Firestore structure...\n');
  
  // Check top-level collections
  const collections = await db.listCollections();
  console.log('📚 Top-level collections:');
  for (const col of collections) {
    const snapshot = await col.limit(5).get();
    console.log(`  - ${col.id} (${snapshot.size} docs shown, may have more)`);
    
    // Show first doc structure
    if (snapshot.size > 0) {
      const firstDoc = snapshot.docs[0];
      console.log(`    Sample doc: ${firstDoc.id}`);
      console.log(`    Fields: ${Object.keys(firstDoc.data()).join(', ')}`);
      
      // Check for subcollections
      const subcols = await firstDoc.ref.listCollections();
      if (subcols.length > 0) {
        console.log(`    Subcollections: ${subcols.map(c => c.id).join(', ')}`);
      }
    }
  }
}

checkStructure()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
