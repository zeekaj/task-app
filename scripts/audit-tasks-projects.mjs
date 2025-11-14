#!/usr/bin/env node

/**
 * Tasks & Projects Data Hygiene Audit
 *
 * Checks:
 *  - Orphaned tasks (projectId references non-existent projects)
 *  - Tasks with invalid/missing assignees
 *  - Tasks with invalid status values
 *  - Projects with invalid status values
 *  - Projects with invalid/missing PM assignments
 *  - Tasks with invalid priority values (should be 0-100)
 *
 * Usage:
 *   node scripts/audit-tasks-projects.mjs
 *
 * Requirements:
 *   - npm i -D firebase-admin
 *   - FIREBASE_SERVICE_ACCOUNT_PATH env var set OR service-account-key.json at project root
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

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

(async function main() {
  console.log('🔍 Starting Tasks & Projects Data Hygiene Audit\n');

  // Get all unique organizationIds from teamMembers
  const tmSnap = await db.collection('teamMembers').get();
  const orgIds = new Set();
  tmSnap.forEach(doc => {
    const orgId = doc.data().organizationId;
    if (orgId) orgIds.add(orgId);
  });

  console.log(`Found ${orgIds.size} organization(s) from teamMembers`);

  const allIssues = {
    orphanedTasks: [],
    invalidTaskStatus: [],
    invalidTaskPriority: [],
    invalidTaskAssignee: [],
    invalidProjectStatus: [],
    invalidProjectPM: [],
  };

  for (const orgId of orgIds) {
    console.log(`\nChecking organization: ${orgId}`);

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
      validTeamMemberIds.add(doc.id); // Also add doc ID as valid
    });

    console.log(`  Team members: ${teamMembersSnap.size}`);

    // Get all projects
    const projectsSnap = await db.collection(`organizations/${orgId}/projects`).get();
    const validProjectIds = new Set(projectsSnap.docs.map(d => d.id));
    console.log(`  Projects: ${projectsSnap.size}`);

    // Check projects
    let projectIssuesCount = 0;
    for (const projDoc of projectsSnap.docs) {
      const data = projDoc.data();
      const id = projDoc.id;

      // Check status
      if (!VALID_PROJECT_STATUSES.has(data.status)) {
        allIssues.invalidProjectStatus.push({
          orgId,
          projectId: id,
          title: data.title,
          status: data.status
        });
        projectIssuesCount++;
      }

      // Check PM assignment
      if (data.pm && !validTeamMemberNames.has(data.pm) && !validTeamMemberIds.has(data.pm)) {
        allIssues.invalidProjectPM.push({
          orgId,
          projectId: id,
          title: data.title,
          pm: data.pm
        });
        projectIssuesCount++;
      }
    }

    // Get all tasks
    const tasksSnap = await db.collection(`organizations/${orgId}/tasks`).get();
    console.log(`  Tasks: ${tasksSnap.size}`);

    // Check tasks
    let taskIssuesCount = 0;
    for (const taskDoc of tasksSnap.docs) {
      const data = taskDoc.data();
      const id = taskDoc.id;

      // Check for orphaned tasks
      if (data.projectId && !validProjectIds.has(data.projectId)) {
        allIssues.orphanedTasks.push({
          orgId,
          taskId: id,
          title: data.title,
          projectId: data.projectId
        });
        taskIssuesCount++;
      }

      // Check status
      if (!VALID_TASK_STATUSES.has(data.status)) {
        allIssues.invalidTaskStatus.push({
          orgId,
          taskId: id,
          title: data.title,
          status: data.status
        });
        taskIssuesCount++;
      }

      // Check priority
      const priority = data.priority ?? 0;
      if (typeof priority !== 'number' || priority < 0 || priority > 100) {
        allIssues.invalidTaskPriority.push({
          orgId,
          taskId: id,
          title: data.title,
          priority
        });
        taskIssuesCount++;
      }

      // Check assignee
      if (data.assignee) {
        const assignee = typeof data.assignee === 'string' ? data.assignee : data.assignee.id;
        if (assignee && !validTeamMemberNames.has(assignee) && !validTeamMemberIds.has(assignee)) {
          allIssues.invalidTaskAssignee.push({
            orgId,
            taskId: id,
            title: data.title,
            assignee
          });
          taskIssuesCount++;
        }
      }
    }

    console.log(`  Issues found: ${taskIssuesCount + projectIssuesCount}`);
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('AUDIT SUMMARY');
  console.log('='.repeat(60));

  function printIssues(title, issues, formatter) {
    console.log(`\n${title}: ${issues.length}`);
    if (issues.length > 0) {
      const sample = issues.slice(0, 20);
      for (const issue of sample) {
        console.log('  •', formatter(issue));
      }
      if (issues.length > sample.length) {
        console.log(`  … and ${issues.length - sample.length} more`);
      }
    }
  }

  printIssues(
    'Orphaned Tasks (projectId references non-existent project)',
    allIssues.orphanedTasks,
    (i) => `org=${i.orgId} task=${i.taskId.slice(0, 8)} "${i.title}" → missing project ${i.projectId.slice(0, 8)}`
  );

  printIssues(
    'Tasks with Invalid Status',
    allIssues.invalidTaskStatus,
    (i) => `org=${i.orgId} task=${i.taskId.slice(0, 8)} "${i.title}" status="${i.status}"`
  );

  printIssues(
    'Tasks with Invalid Priority',
    allIssues.invalidTaskPriority,
    (i) => `org=${i.orgId} task=${i.taskId.slice(0, 8)} "${i.title}" priority=${i.priority}`
  );

  printIssues(
    'Tasks with Invalid Assignee',
    allIssues.invalidTaskAssignee,
    (i) => `org=${i.orgId} task=${i.taskId.slice(0, 8)} "${i.title}" assignee="${i.assignee}"`
  );

  printIssues(
    'Projects with Invalid Status',
    allIssues.invalidProjectStatus,
    (i) => `org=${i.orgId} proj=${i.projectId.slice(0, 8)} "${i.title}" status="${i.status}"`
  );

  printIssues(
    'Projects with Invalid PM',
    allIssues.invalidProjectPM,
    (i) => `org=${i.orgId} proj=${i.projectId.slice(0, 8)} "${i.title}" pm="${i.pm}"`
  );

  const totalIssues = Object.values(allIssues).reduce((sum, arr) => sum + arr.length, 0);
  console.log(`\n${'='.repeat(60)}`);
  console.log(`TOTAL ISSUES: ${totalIssues}`);
  console.log(`${'='.repeat(60)}\n`);

  if (totalIssues > 0) {
    console.log('💡 To fix these issues, run:');
    console.log('   node scripts/fix-tasks-projects.mjs --apply --orphaned --statuses --priorities --assignees');
  } else {
    console.log('✅ No issues found!');
  }

  process.exit(0);
})().catch((e) => {
  console.error('❌ Fatal:', e);
  process.exit(1);
});
