#!/usr/bin/env node

/**
 * Tasks & Projects Data Hygiene Fixer
 *
 * Default mode is DRY RUN. Use --apply to write changes.
 * Flags:
 *   --orphaned      Fix orphaned tasks by removing invalid projectId
 *   --statuses      Fix invalid status values (set to safe defaults)
 *   --priorities    Fix invalid priority values (clamp to 0-100)
 *   --assignees     Fix invalid assignees (set to unassigned)
 *
 * Examples:
 *   node scripts/fix-tasks-projects.mjs --orphaned --statuses  # DRY RUN
 *   node scripts/fix-tasks-projects.mjs --apply --orphaned     # APPLY
 *
 * Requirements:
 *   - npm i -D firebase-admin
 *   - FIREBASE_SERVICE_ACCOUNT_PATH env var OR service-account-key.json at project root
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const args = process.argv.slice(2);
const DO_APPLY = args.includes('--apply');
const FIX_ORPHANED = args.includes('--orphaned');
const FIX_STATUSES = args.includes('--statuses');
const FIX_PRIORITIES = args.includes('--priorities');
const FIX_ASSIGNEES = args.includes('--assignees');

if (!FIX_ORPHANED && !FIX_STATUSES && !FIX_PRIORITIES && !FIX_ASSIGNEES) {
  console.log('Nothing to do. Specify one or more flags: --orphaned --statuses --priorities --assignees');
  process.exit(0);
}

const VALID_TASK_STATUSES = new Set(['not_started', 'in_progress', 'done', 'blocked', 'archived']);
const VALID_PROJECT_STATUSES = new Set(['not_started', 'planning', 'executing', 'blocked', 'post_event', 'completed', 'archived']);

// Initialize Firebase Admin
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './service-account-key.json';
let serviceAccount;
try {
  serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
} catch (e) {
  console.error('❌ Could not load service account key');
  console.error('Set FIREBASE_SERVICE_ACCOUNT_PATH or place service-account-key.json at project root');
  process.exit(1);
}
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const BATCH_LIMIT = 400;

function startBatch() {
  return { batch: db.batch(), count: 0 };
}
async function commitMaybe(state) {
  if (state.count >= BATCH_LIMIT) {
    await state.batch.commit();
    state.batch = db.batch();
    state.count = 0;
    console.log('… committed a batch');
  }
}
async function commitFinal(state) {
  if (state.count > 0) {
    await state.batch.commit();
    state.count = 0;
  }
}

(async function main() {
  console.log(`🛠  Tasks & Projects Fixer — ${DO_APPLY ? 'APPLY MODE' : 'DRY RUN'}\n`);

  const stats = {
    orphanedFixed: 0,
    taskStatusesFixed: 0,
    projectStatusesFixed: 0,
    prioritiesFixed: 0,
    assigneesFixed: 0,
  };

  // Get all unique organizationIds from teamMembers
  const tmSnap = await db.collection('teamMembers').get();
  const orgIds = new Set();
  tmSnap.forEach(doc => {
    const orgId = doc.data().organizationId;
    if (orgId) orgIds.add(orgId);
  });

  console.log(`Found ${orgIds.size} organization(s)`);

  for (const orgId of orgIds) {
    console.log(`\nProcessing organization: ${orgId}`);

    let state = startBatch();

    // Get team members for validation
    const teamMembersSnap = await db.collection('teamMembers')
      .where('organizationId', '==', orgId)
      .get();
    const validTeamMemberNames = new Set();
    const validTeamMemberIds = new Set();
    teamMembersSnap.forEach(doc => {
      const data = doc.data();
      if (data.name) validTeamMemberNames.add(data.name);
      if (data.userId) validTeamMemberIds.add(data.userId);
      validTeamMemberIds.add(doc.id);
    });

    // Get all projects
    const projectsSnap = await db.collection(`organizations/${orgId}/projects`).get();
    const validProjectIds = new Set(projectsSnap.docs.map(d => d.id));

    // Fix projects
    if (FIX_STATUSES) {
      for (const projDoc of projectsSnap.docs) {
        const data = projDoc.data();
        if (!VALID_PROJECT_STATUSES.has(data.status)) {
          stats.projectStatusesFixed++;
          const newStatus = 'not_started'; // Safe default
          console.log(`→ ${DO_APPLY ? 'Fix' : 'Would fix'} project ${projDoc.id} status: "${data.status}" → "${newStatus}"`);
          if (DO_APPLY) {
            state.batch.update(projDoc.ref, {
              status: newStatus,
              updatedAt: FieldValue.serverTimestamp()
            });
            state.count++;
            await commitMaybe(state);
          }
        }
      }
    }

    // Get all tasks
    const tasksSnap = await db.collection(`organizations/${orgId}/tasks`).get();

    // Fix tasks
    for (const taskDoc of tasksSnap.docs) {
      const data = taskDoc.data();
      const updates = {};

      // Fix orphaned tasks
      if (FIX_ORPHANED && data.projectId && !validProjectIds.has(data.projectId)) {
        stats.orphanedFixed++;
        updates.projectId = null;
        console.log(`→ ${DO_APPLY ? 'Fix' : 'Would fix'} orphaned task ${taskDoc.id}: remove invalid projectId ${data.projectId.slice(0, 8)}`);
      }

      // Fix invalid status
      if (FIX_STATUSES && !VALID_TASK_STATUSES.has(data.status)) {
        stats.taskStatusesFixed++;
        updates.status = 'not_started'; // Safe default
        console.log(`→ ${DO_APPLY ? 'Fix' : 'Would fix'} task ${taskDoc.id} status: "${data.status}" → "not_started"`);
      }

      // Fix invalid priority
      if (FIX_PRIORITIES) {
        const priority = data.priority ?? 0;
        if (typeof priority !== 'number' || priority < 0 || priority > 100) {
          stats.prioritiesFixed++;
          const newPriority = Math.max(0, Math.min(100, typeof priority === 'number' ? priority : 50));
          updates.priority = newPriority;
          console.log(`→ ${DO_APPLY ? 'Fix' : 'Would fix'} task ${taskDoc.id} priority: ${priority} → ${newPriority}`);
        }
      }

      // Fix invalid assignee
      if (FIX_ASSIGNEES && data.assignee) {
        const assignee = typeof data.assignee === 'string' ? data.assignee : data.assignee.id;
        if (assignee && !validTeamMemberNames.has(assignee) && !validTeamMemberIds.has(assignee)) {
          stats.assigneesFixed++;
          updates.assignee = null;
          console.log(`→ ${DO_APPLY ? 'Fix' : 'Would fix'} task ${taskDoc.id} assignee: remove invalid "${assignee}"`);
        }
      }

      // Apply updates if any
      if (Object.keys(updates).length > 0 && DO_APPLY) {
        updates.updatedAt = FieldValue.serverTimestamp();
        state.batch.update(taskDoc.ref, updates);
        state.count++;
        await commitMaybe(state);
      }
    }

    if (DO_APPLY) await commitFinal(state);
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Orphaned tasks ${DO_APPLY ? 'fixed' : 'would fix'}: ${stats.orphanedFixed}`);
  console.log(`Task statuses ${DO_APPLY ? 'fixed' : 'would fix'}: ${stats.taskStatusesFixed}`);
  console.log(`Project statuses ${DO_APPLY ? 'fixed' : 'would fix'}: ${stats.projectStatusesFixed}`);
  console.log(`Task priorities ${DO_APPLY ? 'fixed' : 'would fix'}: ${stats.prioritiesFixed}`);
  console.log(`Task assignees ${DO_APPLY ? 'fixed' : 'would fix'}: ${stats.assigneesFixed}`);
  console.log('='.repeat(60));

  console.log('\n✅ Done.');
  process.exit(0);
})().catch((e) => {
  console.error('❌ Fatal:', e);
  process.exit(1);
});
