#!/usr/bin/env node

/**
 * Create Admin Account Script
 * 
 * This script creates an admin team member account in Firestore
 * and sets up Firebase Authentication for it.
 * 
 * Usage:
 *   node scripts/create-admin.mjs
 */

import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { createInterface } from 'readline';

// Your Firebase config (from src/firebase.ts)
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || "AIzaSyCaTUZFfqjyTe6qXvPM6u7VEHv_2rbbsJs",
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "task-app-9d2fa.firebaseapp.com",
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || "task-app-9d2fa",
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "task-app-9d2fa.appspot.com",
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "467876914092",
  appId: process.env.VITE_FIREBASE_APP_ID || "1:467876914092:web:d86e1a3cb7d1cdff6eb1fc",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const rl = createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function createAdminAccount() {
  console.log('🔧 Create Admin Account\n');
  console.log('This script will create a new admin account with:');
  console.log('  - Firebase Authentication user');
  console.log('  - Team member record in Firestore');
  console.log('  - Admin role\n');

  try {
    // Get admin details
    const name = await question('Enter admin name: ');
    const email = await question('Enter admin email: ');
    const password = await question('Enter password (min 8 chars): ');

    if (!name || !email || !password) {
      console.error('❌ All fields are required');
      process.exit(1);
    }

    if (password.length < 8) {
      console.error('❌ Password must be at least 8 characters');
      process.exit(1);
    }

    console.log('\n🔄 Creating admin account...\n');

    // Step 1: Check if team member with this email already exists
    console.log('1️⃣ Checking for existing team member...');
    const membersRef = collection(db, 'teamMembers');
    const q = query(membersRef, where('email', '==', email.toLowerCase()));
    const existingSnapshot = await getDocs(q);

    if (!existingSnapshot.empty) {
      console.log('⚠️  Team member with this email already exists!');
      const existingMember = existingSnapshot.docs[0];
      console.log('   Existing member:', existingMember.data());
      
      const continueAnswer = await question('\nDo you want to create Firebase Auth for this member? (yes/no): ');
      if (continueAnswer.toLowerCase() !== 'yes') {
        console.log('Cancelled.');
        process.exit(0);
      }
    }

    // Step 2: Create Firebase Auth user
    console.log('2️⃣ Creating Firebase Authentication user...');
    let userCredential;
    try {
      userCredential = await createUserWithEmailAndPassword(auth, email, password);
      console.log('   ✅ Firebase Auth user created:', userCredential.user.uid);
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        console.error('   ❌ Firebase Auth user already exists with this email');
        console.log('   You can sign in with this email at the login page');
        process.exit(1);
      }
      throw error;
    }

    const userId = userCredential.user.uid;

    // Step 3: Create or update team member record
    if (existingSnapshot.empty) {
      console.log('3️⃣ Creating team member record...');
      
      const memberData = {
        name: name.trim(),
        email: email.toLowerCase(),
        role: 'admin',
        active: true,
        userId: userId,
        organizationId: userId, // Admin is their own organization
        hasPassword: true,
        skills: {
          audio: 5,
          graphicDesign: 5,
          truckDriving: 5,
          video: 5,
          rigging: 5,
          lighting: 5,
          stageDesign: 5,
          electric: 5,
        },
        availability: 100,
        workload: 0,
        viewerPermissions: [],
        invitedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastLoginAt: null,
      };

      const docRef = await addDoc(membersRef, memberData);
      console.log('   ✅ Team member record created:', docRef.id);
    } else {
      console.log('3️⃣ Updating existing team member record...');
      const memberDoc = existingSnapshot.docs[0];
      const { updateDoc, doc } = await import('firebase/firestore');
      await updateDoc(doc(db, 'teamMembers', memberDoc.id), {
        userId: userId,
        hasPassword: true,
        role: 'admin',
        updatedAt: serverTimestamp(),
      });
      console.log('   ✅ Team member record updated');
    }

    // Success!
    console.log('\n' + '='.repeat(60));
    console.log('✅ Admin account created successfully!');
    console.log('='.repeat(60));
    console.log('\nLogin Credentials:');
    console.log(`  Email:    ${email}`);
    console.log(`  Password: ${password}`);
    console.log(`  Role:     Admin`);
    console.log('\n📝 Next Steps:');
    console.log('  1. Start the app: npm run dev');
    console.log('  2. Navigate to the login page');
    console.log('  3. Sign in with the credentials above');
    console.log('  4. You\'ll have full admin access!\n');

  } catch (error) {
    console.error('\n❌ Error creating admin account:', error);
    console.error('\nDetails:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run the script
createAdminAccount();
