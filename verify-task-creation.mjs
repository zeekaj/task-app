#!/usr/bin/env node
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./service-account-key.json', 'utf8'));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function verifyTaskCreation() {
  console.log('🔍 Checking for tasks in organizations collection...\n');
  
  const orgId = 'qdqpmjPv9VdKXFU0MEJel6Vcpfw2'; // From earlier check
  
  try {
    const tasksSnapshot = await db.collection('organizations').doc(orgId).collection('tasks').limit(5).get();
    
    if (tasksSnapshot.empty) {
      console.log('⚠️  No tasks found in organizations/' + orgId + '/tasks');
      console.log('   Create a task in the app and run this again.\n');
    } else {
      console.log(`✅ Found ${tasksSnapshot.size} task(s) in organizations/${orgId}/tasks\n`);
      
      tasksSnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`📋 Task: ${doc.id}`);
        console.log(`   Title: ${data.title || 'N/A'}`);
        console.log(`   Status: ${data.status || 'N/A'}`);
        console.log(`   OrganizationId: ${data.organizationId || '❌ MISSING'}`);
        console.log(`   ProjectId: ${data.projectId || 'none (general task)'}`);
        console.log(`   Created: ${data.createdAt ? new Date(data.createdAt.seconds * 1000).toISOString() : 'N/A'}`);
        console.log('');
      });
    }
    
    // Also check if any accidentally went to users collection
    const usersTasksSnapshot = await db.collection('users').doc(orgId).collection('tasks').limit(1).get();
    if (!usersTasksSnapshot.empty) {
      console.log('⚠️  WARNING: Found tasks in old users/' + orgId + '/tasks path!');
      console.log('   Data should be in organizations/' + orgId + '/tasks instead.\n');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

verifyTaskCreation().then(() => process.exit(0));
