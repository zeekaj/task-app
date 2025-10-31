# Scheduling MVP — Spec (Multi-user Ready)

Date: October 31, 2025
Status: Draft (ready to implement incrementally)

## Goals
- Manage staff scheduling for tasks and events.
- Multi-user ready: org owner + team members can view and update schedules according to role.
- Minimal refactor: keep current data under `users/{orgId}/...` with org-based access; migrate later to `organizations/{orgId}/...` if desired.

## Data Model (Phase 1)

Collections scoped under `users/{orgId}/...` (owner UID as orgId):

- scheduleEvents (document per event)
  - id: string (Firestore id)
  - organizationId: string (redundant guard)
  - title: string
  - type: 'event' | 'shift' | 'task'  // lightweight categorization
  - start: Timestamp
  - end: Timestamp
  - location?: string
  - projectId?: string | null
  - taskId?: string | null
  - assignedMemberIds: string[]  // teamMembers ids
  - requiredSkills?: string[]
  - notes?: string
  - createdBy: string  // userId of creator
  - createdAt: Timestamp
  - updatedAt: Timestamp

- availability (optional, Phase 2)
  - id: string
  - organizationId: string
  - memberId: string  // teamMembers id
  - blocks: Array<{ start: Timestamp; end: Timestamp; type?: 'busy' | 'available' | 'pto' }>
  - updatedAt: Timestamp

Rationale: Using `users/{orgId}` allows immediate support for multiple users by adjusting security rules so org members can read/write within the owner’s namespace.

## Roles and Permissions
- owner/admin: full read/write on schedule events
- technician/freelance: read events; write only to confirm/accept assigned shifts if enabled later
- viewer: read-only

Rules strategy (Phase 1):
- Reuse membership mirror at `organizations/{orgId}/members/{uid}`.
- Allow `isOrgMember(orgId)` to access `users/{orgId}/**` paths.
- Fine-grained write controls can be added later based on role if needed.

## API Surface (Services)
Create `src/services/scheduling.ts` (Phase 1):
- createScheduleEvent(orgId, data)
- updateScheduleEvent(orgId, eventId, updates)
- deleteScheduleEvent(orgId, eventId)
- listScheduleEvents(orgId, options?) — query by date range, projectId, memberId

Types (in `src/types.ts`):
- ScheduleEvent
- AvailabilityBlock (Phase 2)

## Hooks
- useScheduleEvents(orgId, { start, end, memberId?, projectId? }) — subscribe to range
- useMemberSchedule(memberId, range) — convenience wrapper

## UI MVP
- New tab: “Schedule” or a sub-view within Dashboard
- Week and Month views (read-only to start)
- Create/Edit event modal
- Assignment picker (uses teamMembers)
- Filters: project, member, skill requirement

## Integrations
- Link to Task or Project if `taskId`/`projectId` set (deep-link back to detail view)
- Use existing teamMembers for assignees and skills

## Phase 2 Enhancements
- Availability management and conflict detection
- Shift confirmations and status (proposed: pending, accepted, declined)
- Auto-scheduling suggestions (use skills + workload + availability)
- Export (CSV/ICS)

## Migration Plan (Optional)
- Phase A (now): org-scoped access to `users/{orgId}/...` via rules; code uses `orgId` resolution.
- Phase B: introduce parallel writes to `organizations/{orgId}/...` collections.
- Phase C: migrate readers to new path; remove legacy `users/{orgId}` routes with a script.

## Edge Cases
- Overlapping assignments across projects
- Timezone consistency (store UTC, render in local)
- Large ranges (paginate or limit by date window)
- Inactive team members (exclude from new assignments)

## Success Criteria
- Can create, view, and update events for a given week with multiple assignees.
- Org members can access the schedule; viewers read-only.
- No breaking changes to existing single-user flows.
