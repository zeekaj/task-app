# Development Roadmap - Task Management App

Last Updated: November 3, 2025

App Type: Multi-user, organization-based production/event management with role-based access and real-time collaboration

## Core Philosophy
This is a multi-user application for organizations coordinating projects, tasks, shifts, and post-event processes. Optimize for team efficiency, operational clarity, and reliability. Preserve simplicity in the client (no server-side), leverage Firestore real-time updates, and keep role-based access tight via security rules.

---

## ✅ Completed Features (Oct–Nov 2025)

- ✅ Core task management (create, edit, archive, delete)
- ✅ Project management with date-based status transitions
- ✅ Blocker system for tasks and projects
- ✅ Activity history and audit trail
- ✅ Team member tracking for assignments
- ✅ Multiple project views (Cards, List, Kanban)
- ✅ Advanced filtering with saved preferences
- ✅ Dark glass-morphism design system
- ✅ Inline editing with visual feedback
- ✅ Undo functionality
- ✅ Search within projects

### Oct 30, 2025 — Project Detail Modal Parity
- TaskItem/TaskEditForm used inside modal for full interaction parity
- Arrange-by sorting controls with reverse toggle (no filters in modal)
- Team member avatars displayed in modal header
- Activity tab shows project-level history

### Oct 31, 2025 — Shift Scheduling System
- Data layer + hooks for real-time shifts
- Two modals: GenericShiftModal and ProjectShiftModal
- Weekly grid with team-as-rows, dates-as-columns
- Freelancer management patterns
- FloatingDropdown extracted as reusable component

### Nov 3, 2025 — Projects View Enhancements
- Real-time clients/venues via onSnapshot
- Card layout rebuilt: 5-line design, vertical left status bar, icons
- Create Project Modal parity with Autocomplete + inline entity creation
- Sign-Off visualization for `post_event` across Cards, List, Kanban

### New on October 30, 2025
- ✅ Project Detail Modal parity with Tasks view
  - TaskItem/TaskEditForm used inside modal for full interaction parity
  - Arrange-by sorting controls with reverse toggle (no filters in modal)
  - Team member avatars displayed in modal header
  - Activity tab shows project-level history

---

## 🎯 Near-Term Priorities (Top 4 - Active Development)

### 1. General vs Project-Specific Tasks
**Goal:** Distinguish between office-based "General" tasks and project-specific tasks, with proper organization and visibility

**Current State:**
- Tasks have `projectId` field (null = general task, string = project task)
- All tasks show in TasksView regardless of project association
- Project tasks can be created/viewed within Project Detail modal

**Changes Needed:**
- [ ] **UI Enhancements:**
  - [ ] Add visual grouping in TasksView: "General Tasks" section and "Project Tasks" section
  - [ ] Add badge/icon on project tasks showing project name
  - [ ] Add filter toggle: "Show General Only" / "Show Project Tasks Only" / "Show All"
  - [ ] In ProjectsView cards, show task count for each project
  - [ ] Quick-create general task from TasksView (no project selector)
  - [ ] Quick-create project task from ProjectsView (auto-set projectId)
- [ ] **Data Model:**
  - [ ] Ensure `projectId: null` for all general tasks (already supported)
  - [ ] Add computed field for UI: `isGeneralTask = projectId === null`
- [ ] **Task Management:**
  - [ ] Allow converting general task → project task (add projectId)
  - [ ] Allow converting project task → general task (set projectId to null)
  - [ ] Update activity log when task moves between general/project

**Examples:**
- General: "Achieve Dante Level 3 Certification", "Update equipment inventory"
- Project: "Finish drafting for Paycor project", "Load in audio rig for Festival X"

**Deliverable:** Clear separation between general office tasks and project-specific work, with easy organization across both types

---

### 2. Role-Based Task & Project Visibility
**Goal:** Regular users see only their tasks/projects; Owners/Admins see everything with advanced filtering

**Current State:**
- All tasks stored under `users/{uid}/tasks` (user-specific collection)
- All projects stored under `users/{uid}/projects` (user-specific collection)
- No visibility filtering based on role or assignee
- TeamMember has `role` field: "owner", "admin", "technician", "freelance", "viewer"

**Changes Needed:**
- [ ] **Data Model Migration:**
  - [ ] Move tasks from `users/{uid}/tasks` → `organizations/{orgId}/tasks`
  - [ ] Move projects from `users/{uid}/projects` → `organizations/{orgId}/projects`
  - [ ] Add `createdBy: string` field to tasks and projects
  - [ ] Add `organizationId: string` field to tasks and projects
  - [ ] Ensure all tasks/projects have proper `assignee` or `assignees[]` fields
  - [ ] Write migration script to move existing data
- [ ] **Permission System:**
  - [ ] Create `src/utils/permissions.ts` with role-based helpers
  - [ ] `canViewAllTasks(role)` → true for owner/admin
  - [ ] `canViewAllProjects(role)` → true for owner/admin
  - [ ] `canEditAnyTask(role)` → true for owner/admin
  - [ ] `canDeleteTask(role, task)` → true for owner/admin/creator
  - [ ] `canAssignToOthers(role)` → true for owner/admin
- [ ] **UI Updates:**
  - [ ] TasksView: Filter by assignee when role = technician/freelance/viewer
  - [ ] TasksView: Show "Assigned To" column for owner/admin
  - [ ] ProjectsView: Filter by project team members for non-admins
  - [ ] Add "My Tasks/Projects" vs "All Tasks/Projects" toggle for admins
  - [ ] Show assignment info prominently on cards
- [ ] **Firestore Security Rules:**
  - [ ] Update rules to check organizationId and role
  - [ ] Allow read if assignee matches uid OR role is owner/admin
  - [ ] Allow write if owner/admin OR creator

**Deliverable:** Clean, personalized views for individuals; powerful overview for managers

---

### 3. Schedule Integration for Tasks & Projects
**Goal:** Auto-populate schedule with dated tasks/projects; allow users to plan their day and track progress

**Current State:**
- Schedule has shifts and schedule events
- Tasks have `dueDate` field (string | null)
- Projects have multiple dates (prepDate, eventBeginDate, returnDate, etc.)
- No integration between schedule and tasks/projects

**Changes Needed:**
- [ ] **Auto-Population Rules:**
  - [ ] Tasks with dueDate appear on schedule on that day
  - [ ] Projects appear on schedule during active date range (prepDate → returnDate)
  - [ ] Only show tasks/projects assigned to viewed team member(s)
  - [ ] Add schedule item type: "task" and "project" (currently has "event", "shift")
  - [ ] Visual distinction: tasks (purple), projects (blue), shifts (teal)
- [ ] **Daily Schedule Planning:**
  - [ ] Add "My Day" view in ScheduleView (single day, user-specific)
  - [ ] Drag-and-drop tasks into time blocks
  - [ ] Create time-blocked schedule entries: "Work on [Task] from 2pm-4pm"
  - [ ] Add "scheduled" status to tasks (scheduled but not started)
  - [ ] Store scheduled time blocks in new `scheduleBlocks` collection
- [ ] **Progress Tracking:**
  - [ ] Add "Start Timer" button on scheduled task blocks
  - [ ] Track actual time spent vs planned time
  - [ ] Update task progress % (0-100)
  - [ ] Add notes/comments after completing time block
  - [ ] Show progress indicator on task cards
- [ ] **Data Model:**
  ```typescript
  interface ScheduleBlock {
    id: string;
    organizationId: string;
    userId: string; // who scheduled it
    taskId?: string;
    projectId?: string;
    title: string;
    startTime: Timestamp;
    endTime: Timestamp;
    plannedMinutes: number;
    actualMinutes?: number;
    completed: boolean;
    notes?: string;
  }
  ```
- [ ] **UI Components:**
  - [ ] Extend ScheduleView with task/project rendering
  - [ ] Add "Plan My Day" modal: drag tasks/projects into time slots
  - [ ] Add progress modal: timer, notes, completion checkbox
  - [ ] Show task/project cards in schedule grid alongside shifts

**Deliverable:** Seamless workflow from task assignment → scheduling → execution → completion tracking

---

### 4. Schedule Filtering & Personal Views
**Goal:** All users can view full schedule but filter to their own work; permission-based editing

**Current State:**
- ScheduleView shows all shifts for organization
- Filter by team member exists (`filterByMember`)
- No "My Schedule" quick filter
- Edit permissions not role-based

**Changes Needed:**
- [ ] **Quick Filters:**
  - [ ] Add "My Schedule" button (filters to current user's shifts/tasks/projects)
  - [ ] Add "Full Team" button (shows all org schedule)
  - [ ] Remember last filter preference in localStorage
  - [ ] Show filter state in header ("Viewing: My Schedule" / "Viewing: Full Team")
- [ ] **Monthly View Filtering:**
  - [ ] Add multi-select team member filter for monthly view
  - [ ] Highlight current user's items in different color
  - [ ] Add legend: My Items (bright), Team Items (dimmed)
- [ ] **Permission-Based Editing:**
  - [ ] Regular users can only edit their own shifts/tasks
  - [ ] Admins/Owners can create/edit shifts for anyone
  - [ ] Show "locked" icon on non-editable items
  - [ ] Disable drag-drop for items user can't edit
  - [ ] Add permission checks before opening edit modals
- [ ] **Edit Permission Logic:**
  ```typescript
  canEditScheduleItem(userId, item, userRole) {
    if (role === 'owner' || role === 'admin') return true;
    if (item.type === 'shift' && item.assignedTo.includes(userId)) return true;
    if (item.type === 'task' && item.assignee === userId) return true;
    return false;
  }
  ```
- [ ] **UI Updates:**
  - [ ] Filter controls at top of ScheduleView
  - [ ] Visual indicator for filtered view (colored border/badge)
  - [ ] Disable edit UI elements for non-permitted items
  - [ ] Show helpful tooltip: "Only admins can edit team shifts"

**Deliverable:** Flexible schedule viewing with clear personal focus and proper permission controls

---

### 5. Functional Dashboard
**Goal:** Replace placeholder data with real metrics

**Tasks:**
- [ ] Connect real task counts to KPI tiles
- [ ] Calculate team utilization from assignments
- [ ] Display recent activity from activity log
- [ ] Show upcoming deadlines (tasks/projects due within 7 days)
- [ ] Add project health indicators (on track vs behind)
- [ ] Create burn-down chart for active projects

**Deliverable:** Dashboard provides actionable insights at a glance

---

### 6. AI Task Allocation Engine v1
**Goal:** Smart task assignment based on skills and workload

**Features:**
- [ ] Skill-matching algorithm
  - Parse task descriptions/titles for skill keywords
  - Match against team member skill assessments
  - Calculate confidence scores
- [ ] Workload balancing
  - Count active tasks per team member
  - Consider task priorities and due dates
  - Suggest reassignments when overloaded
- [ ] Generate recommendations UI
  - Display top 3 candidates per unassigned task
  - Show reasoning (skills match, low workload, etc.)
  - One-click assignment from recommendations
- [ ] Historical learning (optional)
  - Track which assignments you accept
  - Improve recommendations over time

**Deliverable:** Functional AI Allocation view that saves time on task assignment

---

### 7. Testing Infrastructure
**Goal:** Add test coverage for critical business logic

**Setup:**
- [ ] Install Vitest and React Testing Library
- [ ] Configure test scripts in package.json
- [ ] Add test:watch for development
- [ ] Keep production mode (no emulation needed)

**Initial Coverage:**
- [ ] `utils/projectStatus.ts` - Status calculation logic
- [ ] `utils/urgency.ts` - Priority and urgency functions
- [ ] Service layer validation (createTask, updateProject)
- [ ] Filter logic (status filters, priority buckets)
- [ ] Blocker state management

**Target:** 60%+ coverage on business logic

**Deliverable:** Confidence in refactoring and feature additions

---

## 🚀 Mid-Term Enhancements

### 8. Shift Templates and Scheduling UX
**Goal:** Faster creation and management of common shift patterns

**Features:**
- [ ] Shift templates for load-in/event/strike crews
- [ ] Apply templates to a project/week with one click
- [ ] Drag-and-drop reassignment across members/days
- [ ] Copy/paste shifts and bulk edit
- [ ] Conflict detection (double-booking alerts)
- [ ] Optional notifications (in-app first)

**Deliverable:** Reduce time to build weekly schedules; prevent conflicts

### 9. Advanced Filtering & Saved Views
**Goal:** Find information faster

**Features:**
- [ ] Saved filter presets
  - "My High Priority Tasks"
  - "This Week's Deliverables"
  - "Blocked Items Only"
- [ ] Combined filter logic (AND/OR operators)
- [ ] Quick filter chips (one-click filtering)
- [ ] Filter by multiple assignees
- [ ] Date range picker with shortcuts
  - Next 7 days, next 30 days
  - This week, this month, this quarter
- [ ] Search improvements
  - Search across task descriptions and comments
  - Search project notes
  - Highlight search matches

**Deliverable:** Can find any task/project in < 5 seconds

---

### 10. Task Comments & Notes
**Goal:** Keep context with tasks (no collaboration features)

**Features:**
- [ ] Add comments to tasks
- [ ] Add notes to projects
- [ ] Rich text editing (basic markdown support)
- [ ] Search comments in global search
- [ ] Edit/delete comments
- [ ] Show comment count on task cards
- [ ] Activity log integration

**Note:** Team-visible comments with role-appropriate read/write; no email notifications initially

**Deliverable:** Tasks and projects contain all relevant context

---

### 11. File Attachments
**Goal:** Link files to tasks and projects

**Features:**
- [ ] Upload files to Firebase Storage
- [ ] Attach files to tasks/projects
- [ ] Display file previews (images, PDFs)
- [ ] Download attachments
- [ ] Delete attachments
- [ ] Show file count on cards
- [ ] File size limits (5MB per file)

**Future:** Dropbox integration (see Long-Term section)

**Deliverable:** All project files accessible within the app

---

### 12. Gantt Chart View
**Goal:** Visual timeline for projects

**Features:**
- [ ] Timeline view of projects with prep/install/return dates
- [ ] Task dependencies visualization
- [ ] Drag to reschedule (updates dates)
- [ ] Color-coded by status
- [ ] Zoom controls (day/week/month view)
- [ ] Highlight critical path
- [ ] Export timeline to image

**Library:** Consider `react-gantt-chart` or `frappe-gantt`

**Deliverable:** Clear visual overview of project timelines

---

## 📊 Insights & Optimization

### 9. Performance Optimization
**Goal:** Fast and responsive at scale

**Improvements:**
- [ ] Implement virtual scrolling (react-window)
  - Tasks view with 100+ tasks
  - Projects view with 50+ projects
- [ ] Add pagination to activity log
- [ ] Lazy load project details
- [ ] Memoize expensive calculations
  - Project status computation
  - Filter operations
  - Urgency calculations
- [ ] Optimize Firestore queries
  - Add composite indexes
  - Limit query results to visible items
- [ ] Loading skeletons instead of spinners
- [ ] Code splitting for views

**Deliverable:** App remains fast with 500+ tasks and 50+ projects

---

### 10. Advanced Project Features
**Goal:** More powerful project management

**Features:**
- [ ] Project templates
  - Save project structure as template
  - Quick-create from template
  - Include default tasks, dates, assignees
- [ ] Milestone tracking
  - Add milestones to projects
  - Track completion percentage
  - Milestone notifications (personal)
- [ ] Budget tracking (optional)
  - Add budget field to projects
  - Track actual costs
  - Alert when nearing budget limit
- [ ] Project dependencies
  - Link projects that depend on others
  - Visualize in Gantt view
  - Auto-adjust dates when dependencies shift

**Deliverable:** Handle complex multi-project coordination

---

### 11. Personal Insights Dashboard
**Goal:** "Problem dashboard" for identifying issues

**Features:**
- [ ] Overdue tasks widget
- [ ] Blocked items requiring attention
- [ ] Approaching deadlines (next 3 days)
- [ ] Tasks without assignees
- [ ] Projects missing critical dates
- [ ] Team members with no assignments
- [ ] Team members overloaded (5+ active tasks)
- [ ] Tasks stuck in "in progress" for > 7 days
- [ ] Projects behind schedule
- [ ] Quick action buttons to resolve issues

**Deliverable:** One view to identify and fix problems

---

## 🎨 Refinement

### 12. UI/UX Polish
**Improvements:**
- [ ] Keyboard shortcuts
  - Command palette (Cmd+K)
  - Quick add task (Cmd+N)
  - Quick search (Cmd+F)
  - Navigate tabs (Cmd+1-6)
- [ ] Bulk operations
  - Select multiple tasks
  - Bulk assign
  - Bulk status change
  - Bulk delete/archive
- [ ] Improved loading states
  - Skeleton screens
  - Progressive loading
- [ ] Drag-and-drop task reordering
- [ ] Context menu improvements
- [ ] Better empty states
- [ ] Accessibility improvements
  - ARIA labels
  - Keyboard navigation
  - Focus management

---

### 13. Advanced Search
**Features:**
- [ ] Natural language search
  - "High priority tasks due this week"
  - "John's blocked items"
- [ ] Search operators
  - status:blocked
  - priority:>70
  - assignee:john
  - due:thisweek
- [ ] Search history
- [ ] Saved searches

---

## 🔮 Long-Term / Future Considerations

### Dropbox Integration (Major Feature)
**Timeline:** 3-4 weeks dedicated effort
**Goal:** View and link project files from Dropbox

**Features:**
- [ ] OAuth authentication with Dropbox
- [ ] Browse Dropbox folders within app
- [ ] Link Dropbox files to tasks/projects
- [ ] Preview Dropbox files inline
- [ ] Sync folder structure
- [ ] Auto-detect project folders by name
- [ ] Offline access to recently viewed files

**Considerations:**
- Requires Dropbox API integration
- Handle authentication tokens securely
- File caching strategy
- Sync status indicators

---

### Time Tracking
Status: Not planned short-term

---

### Automation Rules
**Examples:**
- Auto-assign tasks based on keywords
- Auto-archive completed projects after 30 days
- Auto-escalate priority if task overdue by 3+ days
- Auto-create recurring tasks

---

## 📋 Backlog (Lower Priority)

- [ ] Custom fields for tasks/projects
- [ ] Project tags/categories
- [ ] Task templates
- [ ] Advanced statistics (velocity, cycle time)
- [ ] API webhooks (for custom integrations)
- [ ] Data visualization (charts, graphs)
- [ ] Import from other tools (CSV, Trello, Asana)

---

## 🚫 Out of Scope (for now)

- ❌ Mobile-specific design (desktop-focused)
- ❌ External email/push notifications (start with in-app only)
- ❌ Client portals
- ❌ Complex compliance tooling (GDPR exports, etc.)
- ❌ Voice/AI chat operations

---

## 🎯 Success Metrics

**After Priority 1-2 completion:**
- Can assign 10 tasks in < 2 minutes (with AI help)
- Can find any task in < 5 seconds (with filters)
- Dashboard loads in < 1 second
- Can manage 50 projects without performance issues

**After Priority 3-4 completion:**
- Zero friction adding/editing tasks
- All project data in one place (files, notes, timeline)
- Can identify and resolve bottlenecks from Problems dashboard

---

## 📝 Notes

- **Production Focus:** All testing in production mode (no emulation)
- **Iterative Approach:** Ship features incrementally, get feedback
- **Performance First:** Optimize as we scale, don't wait until it's slow
- **Simple > Complex:** Prefer simple solutions that work over complex ones

---

## Next Steps

1. ✅ Documentation aligned with multi-user app and recent changes
2. ⏭️ Start Dashboard metrics wiring
3. ⏭️ Implement shift templates and basic conflict detection
