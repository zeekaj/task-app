import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./service-account-key.json', 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkTasks() {
  try {
    // Get all tasks from all organizations
    const orgsSnapshot = await db.collectionGroup('tasks').limit(10).get();
    
    console.log(`\nFound ${orgsSnapshot.size} tasks:\n`);
    
    orgsSnapshot.forEach(doc => {
      const task = doc.data();
      console.log('Task:', task.title);
      console.log('  ID:', doc.id);
      console.log('  createdBy:', task.createdBy || 'NOT SET');
      console.log('  assignee:', task.assignee || 'none');
      console.log('  projectId:', task.projectId || 'standalone');
      console.log('  organizationId:', task.organizationId);
      console.log('');
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

checkTasks();
