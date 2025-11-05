# [Archived] Priority 2: Migration Strategy & Rollout Plan

> Note: This strategy document is archived. The organization-scoped collections and related service updates are now implemented in the codebase. For current state and remaining work, see:
> - `../PRIORITY_2_PROGRESS.md`
> - `../EOD_2025-11-05.md` (pickup plan)
> - `../ROADMAP.md`

## Problem
We need to migrate from `users/{uid}/*` to `organizations/{orgId}/*` while:
- Minimizing downtime
- Ensuring data integrity
- Allowing rollback if issues occur
- Supporting both structures during transition

## Solution: Phased Migration

### Phase A: Preparation (CURRENT)
- [x] Create migration script with dry-run mode
- [x] Create permissions utility
- [x] Create UserContext provider
- [ ] Update all services to accept `organizationId` parameter
- [ ] **Keep both data access patterns working (dual-read)**

### Phase B: Testing & Validation
- [ ] Test updated services locally with development data
- [ ] Run migration script with `--dry-run` to validate
- [ ] Review dry-run output for any issues
- [ ] Fix any data inconsistencies before actual migration

### Phase C: Migration Execution
- [ ] Backup Firestore database
- [ ] Run migration script on production
- [ ] Verify migrated data integrity
- [ ] Test application with migrated data

### Phase D: Code Deployment
- [ ] Deploy code updates to use organization-based paths
- [ ] Monitor for errors
- [ ] Keep old `users/{uid}/*` data as backup for 30 days

### Phase E: Cleanup (After 30 days)
- [ ] Verify no issues in production
- [ ] Archive/delete old `users/{uid}/*` collections
- [ ] Update Firestore security rules to remove old paths

## Service Update Pattern

For each service function, we'll:

1. **Change signature**: `uid: string` → `organizationId: string, userId?: string`
   - `organizationId`: The org to query data from
   - `userId`: Optional, only needed for permission checks

2. **Update Firestore paths**:
   ```typescript
   // OLD:
   const ref = doc(db, `users/${uid}/tasks/${taskId}`);
   
   // NEW:
   const ref = doc(db, `organizations/${organizationId}/tasks/${taskId}`);
   ```

3. **Add permission checks** (where appropriate):
   ```typescript
   import { canEditTask } from '../utils/permissions';
   
   if (!canEditTask(userRole, task, userId)) {
     throw new Error('Permission denied');
   }
   ```

4. **Add organizationId to created documents**:
   ```typescript
   const docData = {
     ...taskData,
     organizationId, // Add this field
     createdAt: serverTimestamp()
   };
   ```

## Services to Update

1. **tasks.ts** - All CRUD operations for tasks
2. **projects.ts** - All CRUD operations for projects  
3. **blockers.ts** - Blocker management
4. **activityHistory.ts** - Activity logging
5. **clients.ts** - Client management
6. **venues.ts** - Venue management
7. **shifts.ts** - Shift scheduling (already uses organizations)

## Hooks to Update

1. **useTasks.ts** - Use `organizationId` instead of `uid`
2. **useProjects.ts** - Use `organizationId` instead of `uid`
3. **useBlockers.ts** - Use `organizationId` instead of `uid`
4. (clients, venues, activity already use organization pattern)

## Components to Update

- All components that call service functions need to pass `organizationId`
- Use `useUserContext()` hook to get `organizationId`, `userId`, and `role`
- Apply permission checks in UI (hide/disable actions based on role)

## Security Rules

Update `firestore.rules` to:
- Allow org-based access: `organizations/{orgId}/*`
- Remove or deprecate user-based access: `users/{uid}/*`
- Use `organizations/{orgId}/members/{uid}` for authorization

## Testing Checklist

- [ ] Owner role: Can see and edit everything
- [ ] Admin role: Can see and edit everything  
- [ ] Technician role: Can see all, edit own items
- [ ] Freelance role: Can only see/edit assigned items
- [ ] Viewer role: Can see all, edit nothing
- [ ] Data isolation: User A cannot see User B's organization data
- [ ] Migration: All data correctly moved with organizationId field

## Rollback Plan

If critical issues occur:
1. Keep migration script in place (data is copied, not moved)
2. Revert code deployment to previous version
3. Old `users/{uid}/*` paths still exist and work
4. Investigate issues, fix, retry

---

**Status**: Phase A in progress
**Next**: Update service signatures and paths