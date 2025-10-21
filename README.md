# Task Management App

A comprehensive task and project management application built with React, TypeScript, Vite, and Firebase.

## Features

- **Task Management**: Create, edit, archive, and organize tasks with priority levels, due dates, and assignees
- **Project Management**: Group tasks into projects with install dates, R2 numbers, and ownership tracking
- **Blocker System**: Track and manage blockers for both tasks and projects with resolution tracking
- **Multiple Views**: 
  - Tasks View: All standalone tasks with advanced filtering
  - Projects View: All projects with task summaries
  - Techs View: Tasks and projects grouped by technician
  - Blocked View: All blocked items in one place
  - Calendar View: Visual timeline of tasks and deadlines
- **Advanced Filtering**: Filter by status, priority, due date, assignee with saved preferences per view
- **Activity History**: Complete audit trail of all changes
- **Search**: Full-text search across tasks and projects
- **Undo**: Revert the last change to any task or project

## Recent Changes (October 2025)

### Bug Fixes
- **TechsView Filters**: Fixed filters not applying correctly to tasks (status and priority filtering now work)
- **Task Edit Form**: Fixed subtasks and dependencies disappearing when typing by resolving useEffect race conditions
- **Dropdown Z-Index**: Fixed dropdowns being clipped by parent containers using fixed positioning
- **Project View R2#**: Fixed focus loss when typing in R2# and Install Date fields using onBlur pattern

### Feature Improvements
- **Blocker Modal in Blocked View**: Clicking blocked badge now opens blocker management modal
- **Dynamic Blocker Modal Titles**: Modal now shows "Task Blockers" vs "Project Blockers" based on entity type
- **Undo Button**: Added undo button to TaskItem for reverting recent changes
- **Description Change Tracking**: Activity log now properly tracks description field changes (including empty strings)
- **Unsaved Changes Warning**: Task edit form now warns before discarding unsaved changes
- **Search in Project View**: Added search bar to filter tasks within a project
- **Hidden Tasks Indicator**: Shows count of tasks hidden by active filters with tooltip
- **Keyboard Shortcuts**: Ctrl/Cmd+Enter to save, Escape to cancel in task edit form

## Tech Stack

- **Frontend**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with custom dark mode
- **Backend**: Firebase (Firestore, Auth)
- **State Management**: React hooks and context
- **Drag & Drop**: @dnd-kit

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Development Notes

### Filter System
- Status filter includes "active" pseudo-status mapping to not_started + in_progress
- Priority filter uses buckets (0-4) mapping to ranges: 0-20, 21-40, 41-60, 61-80, 81-100
- Filter preferences are saved per-view in localStorage
- "Show All" toggle bypasses all filters

### Blocker System
- Blockers can be attached to tasks or projects
- Creating a blocker automatically sets entity status to "blocked" and saves previous status
- Project status auto-updates based on task blockers (see `reevaluateProjectBlockedState`)
- All blocker operations are logged in activity history

### Activity Logging
- All major actions (create, update, block, unblock, delete) are logged via `logActivity`
- Changes tracked include from/to values with type information
- Used for undo functionality and audit trails

### Code Organization
- `src/components/` — UI components (views, modals, shared)
- `src/services/` — Data layer for Firestore operations
- `src/hooks/` — Custom React hooks for data fetching
- `src/utils/` — Helper functions (urgency, logger, firestore)
- `src/types.ts` — Shared TypeScript types

## Contributing

When making changes:
1. Always log activities for user-facing changes using `logActivity`
2. Update both entity status and related project/task status when blocking/unblocking
3. Use `reevaluateProjectBlockedState` after changes to blockers or tasks
4. Follow existing patterns for useEffect dependency arrays to avoid race conditions
5. Test with filters active to ensure no data is unintentionally hidden

## Firebase Configuration

Create a `.env` file with your Firebase config:

```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-auth-domain
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-storage-bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

## License

MIT
