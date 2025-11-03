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

## 🎯 Near-Term Priorities

### 1. Functional Dashboard
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

### 2. AI Task Allocation Engine v1
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

### 3. Testing Infrastructure
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

## 🚀 Scheduling & Projects Enhancements

### 4. Shift Templates and Scheduling UX
**Goal:** Faster creation and management of common shift patterns

**Features:**
- [ ] Shift templates for load-in/event/strike crews
- [ ] Apply templates to a project/week with one click
- [ ] Drag-and-drop reassignment across members/days
- [ ] Copy/paste shifts and bulk edit
- [ ] Conflict detection (double-booking alerts)
- [ ] Optional notifications (in-app first)

**Deliverable:** Reduce time to build weekly schedules; prevent conflicts

### 5. Advanced Filtering & Saved Views
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

### 6. Task Comments & Notes
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

### 7. File Attachments
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

### 8. Gantt Chart View
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
