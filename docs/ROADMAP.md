# Development Roadmap - Task Management App

**Last Updated:** October 30, 2025  
**App Type:** Single-user productivity tool for production/event management

## Core Philosophy
This is a personal productivity application designed for one user to manage production events, technical projects, and team coordination. All features should focus on individual efficiency, not collaboration.

---

## ✅ Completed Features (October 2025)

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

### New on October 30, 2025
- ✅ Project Detail Modal parity with Tasks view
  - TaskItem/TaskEditForm used inside modal for full interaction parity
  - Arrange-by sorting controls with reverse toggle (no filters in modal)
  - Team member avatars displayed in modal header
  - Activity tab shows project-level history

---

## 🎯 Priority 1: Foundation & Polish (Weeks 1-4)

### 1. Functional Dashboard (Week 1)
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

### 2. AI Task Allocation Engine v1 (Weeks 2-3)
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

### 3. Testing Infrastructure (Week 4)
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

## 🚀 Priority 2: Enhanced Productivity (Weeks 5-8)

### 4. Advanced Filtering & Saved Views (Week 5)
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

### 5. Task Comments & Notes (Week 6)
**Goal:** Keep context with tasks (no collaboration features)

**Features:**
- [ ] Add comments to tasks
- [ ] Add notes to projects
- [ ] Rich text editing (basic markdown support)
- [ ] Search comments in global search
- [ ] Edit/delete comments
- [ ] Show comment count on task cards
- [ ] Activity log integration

**Note:** No @mentions, no notifications - just personal notes

**Deliverable:** Tasks and projects contain all relevant context

---

### 6. File Attachments (Week 7)
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

### 7. Gantt Chart View (Week 8)
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

## 📊 Priority 3: Insights & Optimization (Weeks 9-12)

### 8. Performance Optimization (Week 9)
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

### 9. Advanced Project Features (Week 10)
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

### 10. Personal Insights Dashboard (Week 11)
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

## 🎨 Priority 4: Refinement (Weeks 12-14)

### 11. UI/UX Polish
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

### 12. Advanced Search
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
**Status:** Not desired at this time

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

## 🚫 Out of Scope

These features are **not planned** based on single-user focus:

- ❌ Real-time collaboration
- ❌ User presence indicators
- ❌ Team chat/messaging
- ❌ Shared team workspaces
- ❌ Permission management (beyond single owner)
- ❌ Mobile-specific design
- ❌ Push notifications (no multi-device)
- ❌ Email notifications to others
- ❌ Multi-organization support
- ❌ Client portals
- ❌ GDPR compliance features
- ❌ Two-factor authentication

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

1. ✅ Update documentation to reflect single-user design
2. ⏭️ Start Priority 1, Week 1: Functional Dashboard
3. ⏭️ Set up project tracking (use this app to manage this app!)
