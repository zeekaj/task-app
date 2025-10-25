#!/usr/bin/env node

/**
 * Migration Script: Move team members from per-user subcollections to global collection
 * 
 * BEFORE RUNNING:
 * 1. Backup your Firestore database
 * 2. Set FIREBASE_SERVICE_ACCOUNT_PATH environment variable
 * 3. Test on a development/staging environment first
 * 
 * Usage:
 *   node scripts/migrate-team-members.mjs --dry-run  # Test without making changes
 *   node scripts/migrate-team-members.mjs             # Perform actual migration
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');

// Initialize Firebase Admin
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './service-account-key.json';
let serviceAccount;

try {
  serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
} catch (error) {
  console.error('❌ Error: Could not load service account key');
  console.error('Please set FIREBASE_SERVICE_ACCOUNT_PATH environment variable or place service-account-key.json in project root');
  process.exit(1);
}

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

/**
 * Migrate team members from users/{uid}/teamMembers to global teamMembers collection
 */
async function migrateTeamMembers() {
  console.log('🚀 Starting team members migration...');
  console.log(isDryRun ? '📋 DRY RUN MODE - No changes will be made\n' : '⚠️  LIVE MODE - Database will be modified\n');

  let totalUsers = 0;
  let totalMembers = 0;
  let successfulMigrations = 0;
  let skippedMembers = 0;
  let errors = 0;

  try {
    // Get all users
    const usersSnapshot = await db.collection('users').get();
    totalUsers = usersSnapshot.size;

    console.log(`Found ${totalUsers} users\n`);

    // Iterate through each user
    for (const userDoc of usersSnapshot.docs) {
      const organizationId = userDoc.id;
      console.log(`\n📂 Processing user: ${organizationId}`);

      // Get team members subcollection
      const membersSnapshot = await userDoc.ref.collection('teamMembers').get();
      
      if (membersSnapshot.empty) {
        console.log('  ℹ️  No team members found');
        continue;
      }

      console.log(`  Found ${membersSnapshot.size} team members`);

      // Migrate each team member
      for (const memberDoc of membersSnapshot.docs) {
        totalMembers++;
        const memberData = memberDoc.data();
        const memberId = memberDoc.id;

        console.log(`  → Migrating member: ${memberData.name || memberData.email || memberId}`);

        try {
          // Check if already exists in global collection
          const globalMemberRef = db.collection('teamMembers').doc(memberId);
          const existingDoc = await globalMemberRef.get();

          if (existingDoc.exists) {
            console.log(`    ⚠️  Already exists in global collection - skipping`);
            skippedMembers++;
            continue;
          }

          // Prepare migration data
          const migrationData = {
            ...memberData,
            organizationId,
            // Ensure timestamp fields are preserved
            createdAt: memberData.createdAt || FieldValue.serverTimestamp(),
            updatedAt: memberData.updatedAt || FieldValue.serverTimestamp(),
            invitedAt: memberData.invitedAt || memberData.createdAt || FieldValue.serverTimestamp(),
            // Initialize auth fields if not present
            userId: memberData.userId || null,
            hasPassword: memberData.hasPassword || false,
            lastLoginAt: memberData.lastLoginAt || null,
          };

          if (isDryRun) {
            console.log('    ✓ Would migrate with data:', JSON.stringify({
              ...migrationData,
              createdAt: '<<timestamp>>',
              updatedAt: '<<timestamp>>',
              invitedAt: '<<timestamp>>',
              lastLoginAt: migrationData.lastLoginAt ? '<<timestamp>>' : null
            }, null, 2));
          } else {
            // Write to global collection
            await globalMemberRef.set(migrationData);
            console.log(`    ✅ Successfully migrated to global collection`);
          }

          successfulMigrations++;
        } catch (error) {
          console.error(`    ❌ Error migrating member ${memberId}:`, error.message);
          errors++;
        }
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Migration Summary');
    console.log('='.repeat(60));
    console.log(`Total users processed:        ${totalUsers}`);
    console.log(`Total members found:          ${totalMembers}`);
    console.log(`Successfully migrated:        ${successfulMigrations}`);
    console.log(`Skipped (already exists):     ${skippedMembers}`);
    console.log(`Errors:                       ${errors}`);
    console.log('='.repeat(60));

    if (isDryRun) {
      console.log('\n📋 This was a DRY RUN. No changes were made to the database.');
      console.log('To perform the actual migration, run without --dry-run flag');
    } else {
      console.log('\n✅ Migration completed!');
      console.log('\n⚠️  IMPORTANT NEXT STEPS:');
      console.log('1. Verify the data in the global teamMembers collection');
      console.log('2. Test the application thoroughly');
      console.log('3. Once verified, you can optionally delete the old teamMembers subcollections');
      console.log('   (Keep backups before deleting!)');
    }

  } catch (error) {
    console.error('\n❌ Fatal error during migration:', error);
    process.exit(1);
  }
}

/**
 * Optional: Clean up old subcollections (only run after verifying migration success)
 */
async function cleanupOldSubcollections() {
  console.log('\n🧹 Starting cleanup of old teamMembers subcollections...');
  console.log('⚠️  WARNING: This will permanently delete data!');
  console.log('Only run this after verifying the migration was successful.\n');

  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    readline.question('Are you sure you want to delete old subcollections? (yes/no): ', async (answer) => {
      readline.close();

      if (answer.toLowerCase() !== 'yes') {
        console.log('Cleanup cancelled.');
        resolve();
        return;
      }

      try {
        const usersSnapshot = await db.collection('users').get();
        let deletedCount = 0;

        for (const userDoc of usersSnapshot.docs) {
          const membersSnapshot = await userDoc.ref.collection('teamMembers').get();
          
          if (!membersSnapshot.empty) {
            console.log(`Deleting ${membersSnapshot.size} members for user ${userDoc.id}`);
            
            for (const memberDoc of membersSnapshot.docs) {
              await memberDoc.ref.delete();
              deletedCount++;
            }
          }
        }

        console.log(`\n✅ Cleanup complete. Deleted ${deletedCount} old team member documents.`);
      } catch (error) {
        console.error('❌ Error during cleanup:', error);
      }

      resolve();
    });
  });
}

// Run migration
(async () => {
  try {
    await migrateTeamMembers();
    
    // Optionally run cleanup (commented out by default for safety)
    // if (!isDryRun) {
    //   await cleanupOldSubcollections();
    // }

    process.exit(0);
  } catch (error) {
    console.error('Script failed:', error);
    process.exit(1);
  }
})();
