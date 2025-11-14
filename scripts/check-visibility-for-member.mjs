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

const ORG = process.env.ORG_ID || 'qdqpmjPv9VdKXFU0MEJel6Vcpfw2';
const MEMBER_ID = process.env.MEMBER_ID || 'hSOHXNjVNltU8HBGQtds'; // Loren Turner by default

(async function main() {
  const membersSnap = await db.collection('teamMembers').get();
  const members = membersSnap.docs.map(d => ({ id: d.id, ...(d.data()||{}) }));
  const me = members.find(m => m.id === MEMBER_ID);
  if (!me) {
    console.error('Member not found:', MEMBER_ID);
    process.exit(1);
  }
  console.log('Checking visibility for:', me.name, MEMBER_ID, me.role);

  const projSnap = await db.collection(`organizations/${ORG}/projects`).get();
  const projects = projSnap.docs.map(d => ({ id: d.id, ...(d.data()||{}) }));

  // Determine userProjectIds by matching id or name
  const userProjectIds = projects.filter(p => {
    const pmMatch = p.projectManager === MEMBER_ID || p.projectManager === me.name;
    const ownerMatch = p.owner === MEMBER_ID || p.owner === me.name;
    const assigneeMatch = (Array.isArray(p.assignees) && (p.assignees.includes(MEMBER_ID) || p.assignees.includes(me.name)));
    return pmMatch || ownerMatch || assigneeMatch;
  }).map(p => p.id);

  console.log('User project IDs:', userProjectIds);

  const tasksSnap = await db.collection(`organizations/${ORG}/tasks`).get();
  const tasks = tasksSnap.docs.map(d => ({ id: d.id, ...(d.data()||{}) }));

  const visible = tasks.filter(t => {
    if (t.createdBy === MEMBER_ID) return true;
    if (t.assignee === MEMBER_ID) return true;
    if (typeof t.assignee === 'string' && t.assignee === me.name) return true;
    if (t.projectId && userProjectIds.includes(t.projectId)) return true;
    return false;
  });

  console.log('\nVisible tasks for', me.name, ':');
  visible.forEach(t => console.log(`- ${t.id}: ${t.title} (assignee=${JSON.stringify(t.assignee)} projectId=${t.projectId})`));

  console.log('\nHidden tasks (sample):');
  tasks.filter(t => !visible.includes(t)).forEach(t => console.log(`- ${t.id}: ${t.title} (assignee=${JSON.stringify(t.assignee)} projectId=${t.projectId})`));

  process.exit(0);
})().catch((e)=>{console.error('Fatal', e); process.exit(1);});
