# Priority 2: Role-Based Visibility & Permissions - Progress Tracker

**Status:** In Progress  
**Branch:** `feature/priority-2-role-based-visibility`  
**Started:** November 5, 2025

## Overview
Migrating from per-user data structure to organization-based collections to enable role-based visibility and permissions.

## Migration Plan

### Phase 1: Data Migration
- [ ] Create migration script for tasks
- [ ] Create migration script for projects
- [ ] Create migration script for blockers
- [ ] Create migration script for activity history
- [ ] Create migration script for clients
- [ ] Create migration script for venues
- [ ] Test migration on development data
- [ ] Run migration on production

### Phase 2: Permission System
- [ ] Create `src/utils/permissions.ts` with role-based functions
- [ ] Implement `canViewAllTasks(role)`
- [ ] Implement `canViewAllProjects(role)`
- [ ] Implement `canEditAnyTask(role, task, userId)`
- [ ] Implement `canDeleteTask(role, task, userId)`
- [ ] Implement `canAssignToOthers(role)`

### Phase 3: Service Layer Updates
- [ ] Update `src/services/tasks.ts` for org collections
- [ ] Update `src/services/projects.ts` for org collections
- [ ] Update `src/services/blockers.ts` for org collections
- [ ] Update `src/services/activityHistory.ts` for org collections
- [ ] Update `src/services/clients.ts` for org collections
- [ ] Update `src/services/venues.ts` for org collections

### Phase 4: Hook Updates
- [ ] Update `src/hooks/useTasks.ts` with role-based filtering
- [ ] Update `src/hooks/useProjects.ts` with role-based filtering
- [ ] Update `src/hooks/useBlockers.ts`
- [ ] Add `src/hooks/useOrganizationId.ts`

### Phase 5: UI Updates
- [ ] Add My Tasks / All Tasks toggle for admins
- [ ] Update TasksView with role-based display
- [ ] Update ProjectsView with role-based display
- [ ] Update ScheduleView with role-based filtering
- [ ] Hide assignee controls for non-admins

### Phase 6: Security Rules
- [ ] Update Firestore security rules for org collections
- [ ] Add role-based read rules
- [ ] Add role-based write rules
- [ ] Test security rules with different roles

### Phase 7: Testing
- [ ] Test as Owner (full access)
- [ ] Test as Admin (full access)
- [ ] Test as Technician (assigned only)
- [ ] Test as Freelance (read-only)
- [ ] Test with DevRoleSwitcher
- [ ] Verify no data leaks between users

## Notes
- Keep backward compatibility during migration
- Document any breaking changes
- Consider data backup before running migration

## Rollback Plan
If migration fails:
1. Switch to `main` branch: `git checkout main`
2. Restore from backup (if needed)
3. Delete feature branch: `git branch -D feature/priority-2-role-based-visibility`
