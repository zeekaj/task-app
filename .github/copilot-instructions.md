# Copilot AI Agent Instructions for `task-app`

## Project Overview
- **Stack:** React + TypeScript + Vite, Tailwind CSS, Firebase (Firestore, Auth)
- **Purpose:** Task and project management with blockers, quick tasks, and activity logging.
- **Key Directories:**
  - `src/components/` — UI components (including modals, views, sidebar)
  - `src/services/` — Data/service layer for tasks, projects, blockers, activity
  - `src/hooks/` — Custom React hooks for data fetching and state
  - `src/firebase.ts` — Firebase config and helpers
  - `src/types.ts` — Shared TypeScript types

## Architecture & Data Flow
- **State Management:** Mostly local React state, with custom hooks for data (e.g., `useTasks`, `useProjects`).
- **Data Layer:** All CRUD operations for tasks, projects, blockers, and activity logs are in `src/services/`. These interact with Firestore via helpers in `src/firebase.ts`.
- **Blockers:**
  - Blockers can be attached to tasks or projects.
  - Creating a blocker sets the entity's status to `blocked` and stores the previous status.
  - Project status is auto-updated based on blockers and blocked tasks (see `reevaluateProjectBlockedState`).
- **Activity Logging:** All major actions (create, update, block, unblock, delete) are logged via `logActivity` in `src/services/activityHistory.ts`.

## Developer Workflows
- **Start Dev Server:** `npm run dev` (Vite, port 5173)
- **Build:** `npm run build`
- **Lint:** `npm run lint` (ESLint, see `eslint.config.js`)
- **No built-in tests** (as of Oct 2025)
- **Firebase:** Uses Firestore and Auth; config in `src/firebase.ts`.

## Project Conventions & Patterns
- **TypeScript:** All logic and components are typed. Shared types in `src/types.ts`.
- **Component Structure:**
  - Views in `src/components/views/` (e.g., `ProjectView`, `TasksView`)
  - Shared UI in `src/components/shared/`
  - Modals for blockers, promotions, etc.
- **Service Layer:**
  - All Firestore access is abstracted in `src/services/`.
  - Use `logActivity` for all user-facing changes.
- **Blocker Logic:**
  - When blocking/unblocking, always update both the entity and related project/task status.
  - Use `reevaluateProjectBlockedState` after changes to blockers or tasks.
- **UI Patterns:**
  - Uses Tailwind for styling (see `tailwind.config.js` for custom colors).
  - Drag-and-drop via `@dnd-kit/core` (for tasks/projects).

## Integration Points
- **Firebase:** All data is stored in Firestore under user-specific collections.
- **Activity Log:** All changes are tracked for audit/history.

## Examples
- To create a new project: use `createProject(uid, title)` in `src/services/projects.ts`.
- To block a task: use `createBlocker(uid, { id, type: 'task' }, { reason })` in `src/services/blockers.ts`.
- To update project status: use `updateProject(uid, projectId, { status })`.

## Special Notes
- **No server-side code** — all logic is client-side and in Firestore.
- **No test suite** — do not expect or require tests unless added.
- **Always update activity log** for user-facing changes.

---
For questions or unclear patterns, review `src/services/` and `src/components/views/` for canonical usage.
