import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./service-account-key.json', 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkTeamMembers() {
  try {
    const membersSnapshot = await db.collectionGroup('teamMembers').get();
    
    console.log(`\nFound ${membersSnapshot.size} team members:\n`);
    
    membersSnapshot.forEach(doc => {
      const member = doc.data();
      console.log('Name:', member.name);
      console.log('  ID:', doc.id);
      console.log('  Email:', member.email);
      console.log('  Role:', member.role);
      console.log('  Active:', member.active);
      console.log('');
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await admin.app().delete();
  }
}

checkTeamMembers();
