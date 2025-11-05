#!/usr/bin/env node

/**
 * Migration Script: Move all data from users/{uid}/* to organizations/{orgId}/*
 * 
 * BEFORE RUNNING:
 * 1. Backup your Firestore database
 * 2. Set FIREBASE_SERVICE_ACCOUNT_PATH environment variable
 * 3. Test on a development/staging environment first
 * 
 * This script migrates:
 * - tasks: users/{uid}/tasks → organizations/{orgId}/tasks
 * - projects: users/{uid}/projects → organizations/{orgId}/projects
 * - blockers: users/{uid}/blockers → organizations/{orgId}/blockers
 * - activityHistory: users/{uid}/activityHistory → organizations/{orgId}/activityHistory
 * - shifts: organizations/{orgId}/shifts (already correct)
 * - clients: users/{uid}/clients → organizations/{orgId}/clients
 * - venues: users/{uid}/venues → organizations/{orgId}/venues
 * 
 * Usage:
 *   node scripts/migrate-to-organizations.mjs --dry-run  # Test without making changes
 *   node scripts/migrate-to-organizations.mjs             # Perform actual migration
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

// Statistics tracking
const stats = {
  users: 0,
  tasks: { total: 0, migrated: 0, errors: 0 },
  projects: { total: 0, migrated: 0, errors: 0 },
  blockers: { total: 0, migrated: 0, errors: 0 },
  activityHistory: { total: 0, migrated: 0, errors: 0 },
  clients: { total: 0, migrated: 0, errors: 0 },
  venues: { total: 0, migrated: 0, errors: 0 }
};

/**
 * Get the organizationId for a given userId
 * Looks up the user's team member record to find their organization
 */
async function getOrganizationIdForUser(uid) {
  try {
    const teamMembersSnapshot = await db.collection('teamMembers')
      .where('userId', '==', uid)
      .where('active', '==', true)
      .limit(1)
      .get();
    
    if (teamMembersSnapshot.empty) {
      console.warn(`⚠️  No active team member found for user ${uid}`);
      return null;
    }

    const teamMember = teamMembersSnapshot.docs[0].data();
    return teamMember.organizationId;
  } catch (error) {
    console.error(`❌ Error finding organization for user ${uid}:`, error.message);
    return null;
  }
}

/**
 * Migrate tasks from users/{uid}/tasks to organizations/{orgId}/tasks
 */
async function migrateTasks(uid, orgId) {
  const tasksRef = db.collection('users').doc(uid).collection('tasks');
  const tasksSnapshot = await tasksRef.get();
  
  stats.tasks.total += tasksSnapshot.size;
  console.log(`  📋 Found ${tasksSnapshot.size} tasks`);

  for (const taskDoc of tasksSnapshot.docs) {
    try {
      const taskData = taskDoc.data();
      const newTaskData = {
        ...taskData,
        organizationId: orgId,
        migratedFrom: `users/${uid}/tasks/${taskDoc.id}`,
        migratedAt: FieldValue.serverTimestamp()
      };

      if (!isDryRun) {
        await db.collection('organizations').doc(orgId).collection('tasks').doc(taskDoc.id).set(newTaskData);
      }
      
      stats.tasks.migrated++;
      console.log(`    ✅ Migrated task: ${taskData.title || taskDoc.id}`);
    } catch (error) {
      stats.tasks.errors++;
      console.error(`    ❌ Error migrating task ${taskDoc.id}:`, error.message);
    }
  }
}

/**
 * Migrate projects from users/{uid}/projects to organizations/{orgId}/projects
 */
async function migrateProjects(uid, orgId) {
  const projectsRef = db.collection('users').doc(uid).collection('projects');
  const projectsSnapshot = await projectsRef.get();
  
  stats.projects.total += projectsSnapshot.size;
  console.log(`  📁 Found ${projectsSnapshot.size} projects`);

  for (const projectDoc of projectsSnapshot.docs) {
    try {
      const projectData = projectDoc.data();
      const newProjectData = {
        ...projectData,
        organizationId: orgId,
        migratedFrom: `users/${uid}/projects/${projectDoc.id}`,
        migratedAt: FieldValue.serverTimestamp()
      };

      if (!isDryRun) {
        await db.collection('organizations').doc(orgId).collection('projects').doc(projectDoc.id).set(newProjectData);
      }
      
      stats.projects.migrated++;
      console.log(`    ✅ Migrated project: ${projectData.title || projectDoc.id}`);
    } catch (error) {
      stats.projects.errors++;
      console.error(`    ❌ Error migrating project ${projectDoc.id}:`, error.message);
    }
  }
}

/**
 * Migrate blockers from users/{uid}/blockers to organizations/{orgId}/blockers
 */
async function migrateBlockers(uid, orgId) {
  const blockersRef = db.collection('users').doc(uid).collection('blockers');
  const blockersSnapshot = await blockersRef.get();
  
  stats.blockers.total += blockersSnapshot.size;
  console.log(`  🚫 Found ${blockersSnapshot.size} blockers`);

  for (const blockerDoc of blockersSnapshot.docs) {
    try {
      const blockerData = blockerDoc.data();
      const newBlockerData = {
        ...blockerData,
        organizationId: orgId,
        migratedFrom: `users/${uid}/blockers/${blockerDoc.id}`,
        migratedAt: FieldValue.serverTimestamp()
      };

      if (!isDryRun) {
        await db.collection('organizations').doc(orgId).collection('blockers').doc(blockerDoc.id).set(newBlockerData);
      }
      
      stats.blockers.migrated++;
      console.log(`    ✅ Migrated blocker: ${blockerDoc.id}`);
    } catch (error) {
      stats.blockers.errors++;
      console.error(`    ❌ Error migrating blocker ${blockerDoc.id}:`, error.message);
    }
  }
}

/**
 * Migrate activity history from users/{uid}/activityHistory to organizations/{orgId}/activityHistory
 */
async function migrateActivityHistory(uid, orgId) {
  const activityRef = db.collection('users').doc(uid).collection('activityHistory');
  const activitySnapshot = await activityRef.get();
  
  stats.activityHistory.total += activitySnapshot.size;
  console.log(`  📊 Found ${activitySnapshot.size} activity records`);

  for (const activityDoc of activitySnapshot.docs) {
    try {
      const activityData = activityDoc.data();
      const newActivityData = {
        ...activityData,
        organizationId: orgId,
        migratedFrom: `users/${uid}/activityHistory/${activityDoc.id}`,
        migratedAt: FieldValue.serverTimestamp()
      };

      if (!isDryRun) {
        await db.collection('organizations').doc(orgId).collection('activityHistory').doc(activityDoc.id).set(newActivityData);
      }
      
      stats.activityHistory.migrated++;
    } catch (error) {
      stats.activityHistory.errors++;
      console.error(`    ❌ Error migrating activity ${activityDoc.id}:`, error.message);
    }
  }
  
  if (activitySnapshot.size > 0) {
    console.log(`    ✅ Migrated ${stats.activityHistory.migrated} activity records`);
  }
}

/**
 * Migrate clients from users/{uid}/clients to organizations/{orgId}/clients
 */
async function migrateClients(uid, orgId) {
  const clientsRef = db.collection('users').doc(uid).collection('clients');
  const clientsSnapshot = await clientsRef.get();
  
  stats.clients.total += clientsSnapshot.size;
  console.log(`  🏢 Found ${clientsSnapshot.size} clients`);

  for (const clientDoc of clientsSnapshot.docs) {
    try {
      const clientData = clientDoc.data();
      const newClientData = {
        ...clientData,
        organizationId: orgId,
        migratedFrom: `users/${uid}/clients/${clientDoc.id}`,
        migratedAt: FieldValue.serverTimestamp()
      };

      if (!isDryRun) {
        await db.collection('organizations').doc(orgId).collection('clients').doc(clientDoc.id).set(newClientData);
      }
      
      stats.clients.migrated++;
      console.log(`    ✅ Migrated client: ${clientData.name || clientDoc.id}`);
    } catch (error) {
      stats.clients.errors++;
      console.error(`    ❌ Error migrating client ${clientDoc.id}:`, error.message);
    }
  }
}

/**
 * Migrate venues from users/{uid}/venues to organizations/{orgId}/venues
 */
async function migrateVenues(uid, orgId) {
  const venuesRef = db.collection('users').doc(uid).collection('venues');
  const venuesSnapshot = await venuesRef.get();
  
  stats.venues.total += venuesSnapshot.size;
  console.log(`  📍 Found ${venuesSnapshot.size} venues`);

  for (const venueDoc of venuesSnapshot.docs) {
    try {
      const venueData = venueDoc.data();
      const newVenueData = {
        ...venueData,
        organizationId: orgId,
        migratedFrom: `users/${uid}/venues/${venueDoc.id}`,
        migratedAt: FieldValue.serverTimestamp()
      };

      if (!isDryRun) {
        await db.collection('organizations').doc(orgId).collection('venues').doc(venueDoc.id).set(newVenueData);
      }
      
      stats.venues.migrated++;
      console.log(`    ✅ Migrated venue: ${venueData.name || venueDoc.id}`);
    } catch (error) {
      stats.venues.errors++;
      console.error(`    ❌ Error migrating venue ${venueDoc.id}:`, error.message);
    }
  }
}

/**
 * Migrate all data for a single user
 */
async function migrateUserData(uid) {
  console.log(`\n👤 Processing user: ${uid}`);
  
  // Find the user's organization
  const orgId = await getOrganizationIdForUser(uid);
  if (!orgId) {
    console.log(`  ⏭️  Skipping user (no organization found)\n`);
    return;
  }
  
  console.log(`  🏢 Organization: ${orgId}`);
  
  // Migrate each collection
  await migrateTasks(uid, orgId);
  await migrateProjects(uid, orgId);
  await migrateBlockers(uid, orgId);
  await migrateActivityHistory(uid, orgId);
  await migrateClients(uid, orgId);
  await migrateVenues(uid, orgId);
}

/**
 * Main migration function
 */
async function runMigration() {
  console.log('🚀 Starting organization data migration...');
  console.log(isDryRun ? '📋 DRY RUN MODE - No changes will be made\n' : '⚠️  LIVE MODE - Database will be modified\n');

  try {
    // Get all users who have data to migrate
    const usersSnapshot = await db.collection('users').get();
    stats.users = usersSnapshot.size;
    console.log(`📊 Found ${stats.users} users\n`);

    // Process each user
    for (const userDoc of usersSnapshot.docs) {
      await migrateUserData(userDoc.id);
    }

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Mode: ${isDryRun ? 'DRY RUN' : 'LIVE'}`);
    console.log(`Users processed: ${stats.users}`);
    console.log('\nTasks:');
    console.log(`  Total found: ${stats.tasks.total}`);
    console.log(`  Migrated: ${stats.tasks.migrated}`);
    console.log(`  Errors: ${stats.tasks.errors}`);
    console.log('\nProjects:');
    console.log(`  Total found: ${stats.projects.total}`);
    console.log(`  Migrated: ${stats.projects.migrated}`);
    console.log(`  Errors: ${stats.projects.errors}`);
    console.log('\nBlockers:');
    console.log(`  Total found: ${stats.blockers.total}`);
    console.log(`  Migrated: ${stats.blockers.migrated}`);
    console.log(`  Errors: ${stats.blockers.errors}`);
    console.log('\nActivity History:');
    console.log(`  Total found: ${stats.activityHistory.total}`);
    console.log(`  Migrated: ${stats.activityHistory.migrated}`);
    console.log(`  Errors: ${stats.activityHistory.errors}`);
    console.log('\nClients:');
    console.log(`  Total found: ${stats.clients.total}`);
    console.log(`  Migrated: ${stats.clients.migrated}`);
    console.log(`  Errors: ${stats.clients.errors}`);
    console.log('\nVenues:');
    console.log(`  Total found: ${stats.venues.total}`);
    console.log(`  Migrated: ${stats.venues.migrated}`);
    console.log(`  Errors: ${stats.venues.errors}`);
    console.log('='.repeat(60));

    if (isDryRun) {
      console.log('\n✅ Dry run completed. Run without --dry-run to perform actual migration.');
    } else {
      console.log('\n✅ Migration completed!');
      console.log('\n⚠️  IMPORTANT: Update Firestore security rules before deploying app changes.');
      console.log('⚠️  IMPORTANT: Test thoroughly before marking old collections for deletion.');
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
runMigration()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
