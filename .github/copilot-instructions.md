# Copilot AI Agent Instructions for `task-app`

## Project Overview
- **Stack:** React + TypeScript + Vite, Tailwind CSS, Firebase (Firestore, Auth)
- **Purpose:** Multi-user task and project management for production/event management with team collaboration, blocker tracking, and activity logging
- **User Model:** Organization-based multi-user collaboration with team members including full-time staff, contractors, and freelancers
- **UI Design:** Dark glass-morphism design system with neon cyan/blue accents
- **Key Directories:**
  - `src/components/` — UI components (views, modals, layout, shared, ui primitives)
  - `src/services/` — Data/service layer for tasks, projects, blockers, activity, team, auth
  - `src/hooks/` — Custom React hooks for data fetching and state
  - `src/utils/` — Helper functions (projectStatus, urgency, firestore, logger)
  - `src/styles/` — Design tokens, typography, fonts
  - `src/firebase.ts` — Firebase config and helpers
  - `src/types.ts` — Shared TypeScript types

## Architecture & Data Flow
- **State Management:** Local React state with custom hooks for data (e.g., `useTasks`, `useProjects`, `useTeamMembers`)
- **Data Layer:** All CRUD operations for tasks, projects, blockers, team members, and activity logs are in `src/services/`. These interact with Firestore via helpers in `src/firebase.ts`
- **Authentication:** Email/password authentication via Firebase Auth; team member records link users to organizations
- **Team Structure:** 
  - Global `teamMembers` collection with `organizationId` field
  - Team members include full-time staff, contractors, and freelancers with real-time collaboration capabilities
  - Role-based access: owner, admin, technician, freelance, viewer
  - Team members linked to Firebase Auth via `userId` field for multi-user access
- **Blockers:**
  - Blockers can be attached to tasks or projects
  - Creating a blocker sets the entity's status to `blocked` and stores the previous status
  - Project status is auto-updated based on blockers and blocked tasks (see `reevaluateProjectBlockedState`)
- **Activity Logging:** All major actions (create, update, block, unblock, delete) are logged via `logActivity` in `src/services/activityHistory.ts`
- **Project Status Engine:**
  - **Purely Automatic:** Date-based transitions (not_started → planning → executing → post_event → completed)
  - **Manual Toggle:** Before prep date, users can toggle between "Not Started" and "Planning" by clicking the status badge
  - All other statuses (Executing, Post-Event, Completed) are automatic based on prep/return dates
  - Logic in `src/utils/projectStatus.ts` (`computeProjectStatus`)

## Developer Workflows
- **Start Dev Server:** `npm run dev` (Vite, port 5173)
- **Build:** `npm run build`
- **Lint:** `npm run lint` (ESLint, see `eslint.config.js`)
- **No built-in tests** (as of Oct 2025)
- **Firebase:** Uses Firestore and Auth; config in `src/firebase.ts`.

## Project Conventions & Patterns
- **TypeScript:** All logic and components are typed. Shared types in `src/types.ts`
- **Component Structure:**
  - Views in `src/components/views/` (e.g., `ProjectsView`, `TasksView`, `TeamView`, `DashboardView`)
  - Layout components in `src/components/layout/` (`AppLayout`, `TopNav`)
  - Shared UI in `src/components/shared/` (`Modal`, `Toast`, `ConfirmModal`, `Dropdown`, `FloatingDropdown`)
  - UI primitives in `src/components/ui/` (`Card`, `Badge`, `PillTabs`)
  - Modals for blockers, promotions, project completion, shift creation/editing
- **Service Layer:**
  - All Firestore access is abstracted in `src/services/`
  - Use `logActivity` for all user-facing changes
  - Services: `tasks.ts`, `projects.ts`, `blockers.ts`, `activityHistory.ts`, `teamMembers.ts`, `auth.ts`, `organizations.ts`, `shifts.ts`
- **Blocker Logic:**
  - When blocking/unblocking, always update both the entity and related project/task status
  - Use `reevaluateProjectBlockedState` after changes to blockers or tasks
- **UI Patterns:**
  - Dark glass-morphism design with Tailwind (see `tailwind.config.js` and `src/styles/tokens.css`)
  - Custom design tokens for colors, spacing, typography
  - Top navigation with tab-based routing (6 tabs: Dashboard, Team, Tasks, Projects, AI Allocation, Settings)
  - Toast notifications for user feedback (`ToastProvider` wrapping App)
  - Inline editing with visual save confirmation (green checkmarks)
  - Filter preferences saved per-view in localStorage
- **Font Hierarchy:**
  - Primary: Inter (body text, UI elements)
  - Secondary: Manrope (UI labels, metrics, captions)
  - Accent: Outfit (marketing, splash screens)

## Integration Points
- **Firebase:** All data is stored in Firestore under user-specific collections.
- **Activity Log:** All changes are tracked for audit/history.

## Examples
- To create a new project: use `createProject(uid, projectData)` in `src/services/projects.ts`
- To block a task: use `createBlocker(uid, { id, type: 'task' }, { reason, description })` in `src/services/blockers.ts`
- To update project status: use `updateProject(uid, projectId, { status })` in `src/services/projects.ts`
- To create a team member: use `createTeamMember(organizationId, memberData)` in `src/services/teamMembers.ts`
- To log an activity: use `logActivity(uid, activityData)` in `src/services/activityHistory.ts`
- To create a shift: use `createShift(orgId, createdBy, shiftData)` in `src/services/shifts.ts`
- To use floating dropdown: import `FloatingDropdown` from `src/components/shared/FloatingDropdown.tsx`

## Important Views & Features

### Projects View (`ProjectsView.tsx`)
- Three display modes: Cards, List, Kanban
- **Cards View:** Grid with status stripes, clickable status badge to toggle Not Started/Planning, context menu (archive, delete)
- **List View:** Table with inline editing (dates, PM, R2#), visual save feedback
- **Kanban View:** 5 columns by effectiveStatus (not_started, planning, executing, post_event, completed)
- Status is purely automatic based on dates (with manual toggle for Not Started/Planning before prep date)
- Filter and search functionality

### Project Detail Modal (`ProjectDetailView.tsx`)
- Tabs: Overview, Tasks, Timeline, Team, Activity
- Status badge at top; manual toggle allowed only pre-prep (Not Started/Planning)
- Tasks tab
  - Renders the same `TaskItem` rows as Tasks view for full interaction parity
  - Quick add task at top
  - Arrange controls only (no filters): Created, Status, Title, Due Date, Priority, Assignee + reverse toggle
  - Blockers built-in: open Blocker modal/manager directly from task lines
- Header shows team avatars (initials) alongside status and PM (up to 4 + overflow)
- Team tab for add/remove members (click-outside close; filters active members)
- Activity tab shows project-level history via `ActivityHistory`

### Tasks View (`TasksView.tsx`)
- All standalone tasks with advanced filtering
- Filter by status, priority, due date, assignee
- Search across task titles and descriptions
- Quick add task functionality
- Team member dropdown for assignee selection (using React Portal)

### Team View (`TeamView.tsx`)
- Manage team members with role-based access
- Create, edit, archive team members
- View skills, availability, assignments
- Roles: Owner, Admin, Technician, Freelance (read-only), Viewer

### Dashboard View (`DashboardView.tsx`)
- Overview of tasks, projects, and team activity
- Recent activity feed
- Key metrics and summaries

### Schedule View (`ScheduleView.tsx`)
- Comprehensive shift scheduling for production/event management
- Two shift types: Generic (standalone) and Project (event-related)
- Weekly calendar grid with Monday-Sunday weeks
- Team members as rows, dates as columns
- Stacked shift cards with AM/PM time display
- Hover-to-add shift functionality
- Freelancer management with temporary row system
- "New Shift" dropdown to create generic or project shifts
- Automatic modal type detection on edit (based on projectId)

### Shift Modals
- **GenericShiftModal**: Standalone shifts (crew calls, general availability)
  - Date, start/end times, break minutes, location, position
  - Employee selection via checkboxes
  - Notes field, publish toggle (draft vs offered status)
  - Emerald gradient banner when published
- **ProjectShiftModal**: Event/project-related shifts
  - All GenericShiftModal fields plus:
  - Project selection (required)
  - Call time (optional earlier arrival time)
  - Team instructions textarea
  - Auto-generates title: "{Project} - {Position}"

### Authentication Flow
- Login via email/password (`LoginView.tsx`)
- First-time password setup (`FirstTimePasswordView.tsx`)
- Admin setup flow (`AdminSetup.tsx`)
- Role-based access control (owner, admin, technician, freelance, viewer)

## Reusable Components

### FloatingDropdown (`src/components/shared/FloatingDropdown.tsx`)
- Fixed-position dropdown to escape overflow clipping
- Automatic position calculation based on trigger element
- Outside-click detection with dual-ref pattern
- Position recomputation on resize/scroll
- Controlled or uncontrolled mode
- Customizable trigger, menu styles, width calculation, offset
- **Usage Example:**
  ```tsx
  <FloatingDropdown
    open={isOpen}
    onOpenChange={setIsOpen}
    trigger={<button>Click Me</button>}
  >
    <div>Menu content</div>
  </FloatingDropdown>
  ```

## Special Notes
- **Multi-user application** — designed for teams collaborating on projects and coordinating production workflows
- **No server-side code** — all logic is client-side and in Firestore
- **No test suite** — do not expect or require tests unless added
- **Always update activity log** for user-facing changes
- **Team members are active collaborators** — supports real-time collaboration and multi-user features
- **Shift pay fields removed** — pay rates now stored in team member profiles, not individual shifts

## Documentation
- **[README.md](../README.md)** — Current project overview and developer guide
- **[docs/ARCHIVE.md](../docs/ARCHIVE.md)** — Historical documentation (auth restructure, migrations, UI evolution)
- **[docs/SECURITY_RULES.md](../docs/SECURITY_RULES.md)** — Firestore security rules configuration

---
For questions or unclear patterns, review `src/services/` and `src/components/views/` for canonical usage.
