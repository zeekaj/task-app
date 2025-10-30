#!/usr/bin/env node

/**
 * Firestore Data Hygiene Fixer (idempotent, batched)
 *
 * Default mode is DRY RUN. Use --apply to write changes.
 * Granular flags (run any combination):
 *   --roles           Fix legacy role "member" → "technician"
 *   --timestamps      Backfill missing createdAt/updatedAt
 *   --viewer-perms    Clear viewerPermissions for non-viewers; enforce empty for freelance
 *   --mirrors         Sync organizations/{orgId}/members/{uid} with teamMembers
 *   --dedupe-emails   Deactivate duplicate emails per org (keep earliest as primary)
 *
 * Examples:
 *   node scripts/fix-data-hygiene.mjs --roles --timestamps              # DRY RUN
 *   node scripts/fix-data-hygiene.mjs --apply --roles --viewer-perms    # APPLY
 *   node scripts/fix-data-hygiene.mjs --apply --mirrors
 *   node scripts/fix-data-hygiene.mjs --apply --dedupe-emails
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
const FIX_ROLES = args.includes('--roles');
const FIX_TIMESTAMPS = args.includes('--timestamps');
const FIX_VIEWER_PERMS = args.includes('--viewer-perms');
const FIX_MIRRORS = args.includes('--mirrors');
const FIX_DEDUPE = args.includes('--dedupe-emails');

if (!FIX_ROLES && !FIX_TIMESTAMPS && !FIX_VIEWER_PERMS && !FIX_MIRRORS && !FIX_DEDUPE) {
  console.log('Nothing to do. Specify one or more flags: --roles --timestamps --viewer-perms --mirrors --dedupe-emails');
  process.exit(0);
}

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

const BATCH_LIMIT = 400; // safe margin under 500

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
  console.log(`🛠  Firestore Fixer — ${DO_APPLY ? 'APPLY MODE' : 'DRY RUN'}\n`);

  const tmSnap = await db.collection('teamMembers').get();
  console.log(`teamMembers total: ${tmSnap.size}`);

  // Cache for mirrors if needed
  let mirrorOps = { created: 0, updated: 0, errors: 0 };

  // 1) Roles
  if (FIX_ROLES) {
    let changed = 0;
    let errors = 0;
    let state = startBatch();

    for (const d of tmSnap.docs) {
      const data = d.data();
      if (data.role === 'member') {
        changed++;
        console.log(`→ ${DO_APPLY ? 'Fix' : 'Would fix'} role for ${d.id}: member → technician`);
        if (DO_APPLY) {
          state.batch.update(d.ref, { role: 'technician', updatedAt: FieldValue.serverTimestamp() });
          state.count++;
          await commitMaybe(state);
        }
      }
    }

    if (DO_APPLY) await commitFinal(state);
    console.log(`Roles: ${DO_APPLY ? 'Updated' : 'Would update'} ${changed}, errors: ${errors}`);
  }

  // 2) Timestamps
  if (FIX_TIMESTAMPS) {
    let createdBackfill = 0;
    let updatedBackfill = 0;
    let state = startBatch();

    for (const d of tmSnap.docs) {
      const data = d.data();
      const updates = {};
      if (!data.createdAt) updates.createdAt = FieldValue.serverTimestamp();
      if (!data.updatedAt) updates.updatedAt = FieldValue.serverTimestamp();
      const need = Object.keys(updates).length > 0;
      if (need) {
        createdBackfill += updates.createdAt ? 1 : 0;
        updatedBackfill += updates.updatedAt ? 1 : 0;
        console.log(`→ ${DO_APPLY ? 'Backfill' : 'Would backfill'} timestamps for ${d.id}`);
        if (DO_APPLY) {
          state.batch.update(d.ref, updates);
          state.count++;
          await commitMaybe(state);
        }
      }
    }

    if (DO_APPLY) await commitFinal(state);
    console.log(`Timestamps: ${DO_APPLY ? 'Backfilled' : 'Would backfill'} createdAt=${createdBackfill}, updatedAt=${updatedBackfill}`);
  }

  // 3) Viewer permissions
  if (FIX_VIEWER_PERMS) {
    let cleared = 0;
    let state = startBatch();

    for (const d of tmSnap.docs) {
      const data = d.data();
      const role = data.role;
      const vp = Array.isArray(data.viewerPermissions) ? data.viewerPermissions : [];
      if (role !== 'viewer' && vp.length > 0) {
        cleared++;
        console.log(`→ ${DO_APPLY ? 'Clear' : 'Would clear'} viewerPermissions for ${d.id} (role=${role}, had=${vp.length})`);
        if (DO_APPLY) {
          state.batch.update(d.ref, { viewerPermissions: [], updatedAt: FieldValue.serverTimestamp() });
          state.count++;
          await commitMaybe(state);
        }
      }
    }

    if (DO_APPLY) await commitFinal(state);
    console.log(`ViewerPermissions: ${DO_APPLY ? 'Cleared' : 'Would clear'} ${cleared}`);
  }

  // 4) Membership mirrors
  if (FIX_MIRRORS) {
    let state = startBatch();

    for (const d of tmSnap.docs) {
      const data = d.data();
      const orgId = data.organizationId;
      const uid = data.userId;
      if (!orgId || !uid) continue;

      try {
        const mirrorRef = db.doc(`organizations/${orgId}/members/${uid}`);
        const mirrorSnap = await mirrorRef.get();
        if (!mirrorSnap.exists) {
          console.log(`→ ${DO_APPLY ? 'Create' : 'Would create'} mirror for ${d.id} → org=${orgId}/uid=${uid}`);
          if (DO_APPLY) {
            state.batch.set(mirrorRef, {
              role: data.role,
              active: data.active !== false,
              createdAt: FieldValue.serverTimestamp(),
              updatedAt: FieldValue.serverTimestamp()
            });
            state.count++;
            mirrorOps.created++;
            await commitMaybe(state);
          }
        } else {
          const m = mirrorSnap.data();
          const updates = {};
          if (m.role !== data.role) updates.role = data.role;
          const shouldBeActive = data.active !== false;
          if ((m.active ?? true) !== shouldBeActive) updates.active = shouldBeActive;
          if (Object.keys(updates).length > 0) {
            console.log(`→ ${DO_APPLY ? 'Update' : 'Would update'} mirror for ${d.id} (role/active)`);
            if (DO_APPLY) {
              updates.updatedAt = FieldValue.serverTimestamp();
              state.batch.update(mirrorRef, updates);
              state.count++;
              mirrorOps.updated++;
              await commitMaybe(state);
            }
          }
        }
      } catch (e) {
        console.error(`❌ Mirror op failed for ${d.id}:`, e.message);
        mirrorOps.errors++;
      }
    }

    if (DO_APPLY) await commitFinal(state);
    console.log(`Mirrors: ${DO_APPLY ? 'Created' : 'Would create'} ${mirrorOps.created}, ${DO_APPLY ? 'Updated' : 'Would update'} ${mirrorOps.updated}, errors: ${mirrorOps.errors}`);
  }

  // 5) De-duplicate emails per organization
  if (FIX_DEDUPE) {
    // Build map org|email -> docs sorted by createdAt asc (fallback to id)
    const byOrgEmail = new Map();
    for (const d of tmSnap.docs) {
      const data = d.data();
      if (!data.organizationId || !data.email) continue;
      const key = `${data.organizationId}|${String(data.email).toLowerCase().trim()}`;
      const arr = byOrgEmail.get(key) || [];
      arr.push({ id: d.id, ref: d.ref, createdAt: data.createdAt, active: data.active !== false });
      byOrgEmail.set(key, arr);
    }

    let deactivated = 0;
    let state = startBatch();

    for (const [key, arr] of byOrgEmail.entries()) {
      if (arr.length <= 1) continue;
      // Sort by createdAt asc, undefined last
      arr.sort((a, b) => {
        const ta = a.createdAt?.toMillis?.() ?? Number.MAX_SAFE_INTEGER;
        const tb = b.createdAt?.toMillis?.() ?? Number.MAX_SAFE_INTEGER;
        return ta - tb || a.id.localeCompare(b.id);
      });
      const primary = arr[0];
      const duplicates = arr.slice(1);

      for (const dup of duplicates) {
        // Only deactivate if currently active
        if (!dup.active) continue;
        console.log(`→ ${DO_APPLY ? 'Deactivate' : 'Would deactivate'} duplicate ${dup.id} (primary=${primary.id}) key=${key}`);
        deactivated++;
        if (DO_APPLY) {
          state.batch.update(dup.ref, { active: false, duplicateOf: primary.id, updatedAt: FieldValue.serverTimestamp() });
          state.count++;
          await commitMaybe(state);
        }
      }
    }

    if (DO_APPLY) await commitFinal(state);
    console.log(`De-duplication: ${DO_APPLY ? 'Deactivated' : 'Would deactivate'} ${deactivated} active duplicates`);
  }

  console.log('\n✅ Done.');
  process.exit(0);
})().catch((e) => {
  console.error('❌ Fatal:', e);
  process.exit(1);
});
