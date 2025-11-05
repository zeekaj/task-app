# Migration Execution Checklist

## Pre-Migration

- [ ] **Backup Firestore Database**
  - Go to Firebase Console → Firestore Database
  - Click "Import/Export" → "Export"
  - Save export location for rollback
  - Or use: `gcloud firestore export gs://[BUCKET_NAME]/[EXPORT_PREFIX]`

- [ ] **Get Service Account Key**
  - Download from Firebase Console → Project Settings → Service Accounts
  - Place at `/workspaces/task-app/service-account-key.json`
  - Verify: `ls -la service-account-key.json`

- [ ] **Verify Current Data**
  - Check Firestore Console: `users/{uid}/tasks` should have data
  - Note down total document counts for validation

## Migration Steps

### 1. Dry Run (TEST MODE)
```bash
cd /workspaces/task-app
node scripts/migrate-to-organizations.mjs --dry-run
```

**Review the output:**
- [ ] All users found and processed
- [ ] Document counts look correct
- [ ] No unexpected errors
- [ ] Organization IDs resolved correctly

### 2. Actual Migration (LIVE MODE)
```bash
# Take a deep breath! 
node scripts/migrate-to-organizations.mjs
```

**Expected output:**
- Users processed: X
- Tasks migrated: X/X (no errors)
- Projects migrated: X/X (no errors)
- Blockers migrated: X/X (no errors)
- Activity history migrated: X/X (no errors)
- Clients migrated: X/X (no errors)
- Venues migrated: X/X (no errors)

### 3. Verification
```bash
# Check Firestore Console manually
```

In Firebase Console:
- [ ] Navigate to `organizations/{orgId}/tasks` - should have data
- [ ] Navigate to `organizations/{orgId}/projects` - should have data
- [ ] Check that `organizationId` field exists on documents
- [ ] Old `users/{uid}/*` data still exists (backup)

### 4. Deploy Updated Code

**Update Firestore Security Rules:**
```bash
# Edit firestore.rules to add organizations/* access
# Deploy: firebase deploy --only firestore:rules
```

**Deploy Application:**
```bash
npm run build
# Deploy to your hosting platform
```

### 5. Testing

- [ ] Test as **Owner**: Can see and edit everything
- [ ] Test as **Admin**: Can see and edit everything
- [ ] Test as **Technician**: Can see all, edit own items
- [ ] Test as **Freelance**: Can only see assigned items
- [ ] Test as **Viewer**: Can see all, cannot edit

Use `DevRoleSwitcher` component for quick role switching.

## Rollback Plan (If Needed)

If critical issues occur:

### Quick Rollback (Revert Code)
```bash
git revert HEAD~3  # Revert last 3 commits
git push origin feature/priority-2-role-based-visibility --force
# Redeploy old code
```

Your old data at `users/{uid}/*` is still intact!

### Full Rollback (Restore Database)
```bash
# Import from backup
gcloud firestore import gs://[BUCKET_NAME]/[EXPORT_PREFIX]
```

## Post-Migration Cleanup (After 30 Days)

Once verified everything works:

- [ ] Delete old `users/{uid}/tasks` collections
- [ ] Delete old `users/{uid}/projects` collections
- [ ] Delete old `users/{uid}/blockers` collections
- [ ] Delete old `users/{uid}/activityHistory` collections
- [ ] Delete old `users/{uid}/clients` collections
- [ ] Delete old `users/{uid}/venues` collections
- [ ] Remove old security rules for `users/*` paths

---

## Emergency Contacts

- Firebase Support: https://firebase.google.com/support
- Project Owner: [Your contact info]
- Backup Location: [GCS bucket or export location]

---

**Created:** November 5, 2025
**Status:** Ready for migration execution
