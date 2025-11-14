#!/usr/bin/env node

/**
 * Normalize legacy name-based assignee values to team-member document IDs
 * - Scans `organizations/{orgId}/tasks` and `organizations/{orgId}/projects`
 * - For any field that is a string matching a team member `name`, replaces it with the member `id` (or replaces entries in `assignees` arrays)
 * Safety: by default the script only previews changes. Set CONFIRM_MIGRATE=1 to actually update Firestore.
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

const ORG = process.env.ORG_ID || 'qdqpmjPv9VdKXFU0MEJel6Vcpfw2';
const CONFIRM = process.env.CONFIRM_MIGRATE === '1';

(async function main() {
  console.log(`🔁 Normalize assignees/project managers -> team-member IDs for org: ${ORG}`);

  // Load team members for mapping name -> id
  const tmSnap = await db.collection('teamMembers').where('organizationId', '==', ORG).get();
  const members = tmSnap.docs.map(d => ({ id: d.id, ...(d.data()||{}) }));
  const nameToId = new Map();
  for (const m of members) {
    if (m.name) nameToId.set(m.name, m.id);
  }
  console.log(`Found ${members.length} teamMembers, ${nameToId.size} with names`);

  // Helper to map a name to id
  const mapName = (val) => {
    if (!val || typeof val !== 'string') return null;
    return nameToId.get(val) || null;
  };

  // Collect changes
  const taskChanges = [];
  const tasksSnap = await db.collection(`organizations/${ORG}/tasks`).get();
  console.log('Scanned tasks:', tasksSnap.size);
  for (const doc of tasksSnap.docs) {
    const d = doc.data();
    const changes = {};
    // assignee can be string name or id; if string and matches name, replace with id
    if (typeof d.assignee === 'string') {
      const mapped = mapName(d.assignee);
      if (mapped && mapped !== d.assignee) changes.assignee = mapped;
    }
    // createdBy: if stored as name, try mapping (less common)
    if (typeof d.createdBy === 'string' && !d.createdBy.startsWith && !d.createdBy.match(/^[A-Za-z0-9_-]{20,}$/)) {
      const mapped = mapName(d.createdBy);
      if (mapped && mapped !== d.createdBy) changes.createdBy = mapped;
    }
    if (Object.keys(changes).length > 0) taskChanges.push({ id: doc.id, title: d.title, changes });
  }

  const projectChanges = [];
  const projSnap = await db.collection(`organizations/${ORG}/projects`).get();
  console.log('Scanned projects:', projSnap.size);
  for (const doc of projSnap.docs) {
    const d = doc.data();
    const changes = {};
    // projectManager can be name
    if (typeof d.projectManager === 'string') {
      const mapped = mapName(d.projectManager);
      if (mapped && mapped !== d.projectManager) changes.projectManager = mapped;
    }
    // assignees array may contain names
    if (Array.isArray(d.assignees) && d.assignees.length > 0) {
      const newAssignees = d.assignees.map(a => (typeof a === 'string' ? (mapName(a) || a) : a));
      // if any replacements occurred and at least one element is now an id, set
      if (JSON.stringify(newAssignees) !== JSON.stringify(d.assignees)) changes.assignees = newAssignees;
    }
    if (Object.keys(changes).length > 0) projectChanges.push({ id: doc.id, title: d.title, changes });
  }

  console.log('\nPreview:');
  console.log('Tasks to update:', taskChanges.length);
  taskChanges.forEach(t => console.log(`- ${t.id}: ${t.title} -> ${JSON.stringify(t.changes)}`));
  console.log('\nProjects to update:', projectChanges.length);
  projectChanges.forEach(p => console.log(`- ${p.id}: ${p.title} -> ${JSON.stringify(p.changes)}`));

  if (!CONFIRM) {
    console.log('\nNo changes applied. To apply updates set CONFIRM_MIGRATE=1 and re-run.');
    process.exit(0);
  }

  // Apply changes in batches
  const batchSize = 500;
  let counter = 0;
  function chunkArray(arr, size) {
    const out = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
  }

  for (const chunk of chunkArray(taskChanges, batchSize)) {
    const batch = db.batch();
    for (const t of chunk) {
      const ref = db.doc(`organizations/${ORG}/tasks/${t.id}`);
      batch.update(ref, t.changes);
      counter++;
    }
    await batch.commit();
  }
  for (const chunk of chunkArray(projectChanges, batchSize)) {
    const batch = db.batch();
    for (const p of chunk) {
      const ref = db.doc(`organizations/${ORG}/projects/${p.id}`);
      batch.update(ref, p.changes);
      counter++;
    }
    await batch.commit();
  }

  console.log(`\n✅ Applied ${counter} document updates.`);
  process.exit(0);

})().catch((e) => {
  console.error('❌ Fatal:', e);
  process.exit(1);
});
