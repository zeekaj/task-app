# Task App

A modern task and project management application built with React, TypeScript, Vite, and Firebase.

## Features

### Core Functionality
- **Task Management**: Create, edit, archive, and organize tasks with priority levels, due dates, and assignees
- **Project Management**: Manage projects with automatic status transitions based on prep/return dates, or manual status control
- **Blocker System**: Track and manage blockers for both tasks and projects with resolution tracking
- **Activity History**: Complete audit trail of all changes with undo capability
- **Team Management**: Multi-user support with role-based access control (admin, member, viewer)

### Views
- **Dashboard**: Overview of tasks, projects, and team activity
- **Tasks View**: All standalone tasks with advanced filtering and search
- **Projects View**: Three display modes (Cards, List, Kanban) with inline editing
- **Team View**: Manage team members, roles, and assignments
- **AI Allocation**: Smart task and project assignment recommendations
- **Settings**: User preferences and app configuration

### Advanced Features
- **Smart Filtering**: Filter by status, priority, due date, assignee with saved preferences per view
- **Full-Text Search**: Search across tasks and projects
- **Project Status Engine**: Automatic status transitions (not_started → planning → executing → post_event → completed) based on dates, or manual override
- **Inline Editing**: Edit project fields directly in list view with visual save confirmation
- **Keyboard Shortcuts**: Ctrl/Cmd+Enter to save, Escape to cancel in forms
- **Toast Notifications**: Visual feedback for all actions

## Tech Stack

- **Frontend**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with custom dark glass-morphism design system
- **Backend**: Firebase (Firestore, Auth, Storage)
- **State Management**: React hooks with custom data hooks
- **UI Components**: Custom components with @dnd-kit for future drag-and-drop

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

## Development Notes

### Code Organization
- `src/components/` — UI components (views, modals, shared)
- `src/services/` — Data layer for Firestore operations
- `src/hooks/` — Custom React hooks for data fetching
- `src/utils/` — Helper functions (urgency, logger, firestore, projectStatus)
- `src/types.ts` — Shared TypeScript types

### Filter System
- Status filter includes "active" pseudo-status mapping to not_started + in_progress
- Priority filter uses buckets (0-4) mapping to ranges: 0-20, 21-40, 41-60, 61-80, 81-100
- Filter preferences are saved per-view in localStorage
- "Show All" toggle bypasses all filters

### Blocker System
- Blockers can be attached to tasks or projects
- Creating a blocker automatically sets entity status to "blocked" and saves previous status
- Project status auto-updates based on task blockers (see `reevaluateProjectBlockedState` in `src/services/projects.ts`)
- All blocker operations are logged in activity history

### Activity Logging
- All major actions (create, update, block, unblock, delete) are logged via `logActivity` in `src/services/activityHistory.ts`
- Changes tracked include from/to values with type information
- Used for undo functionality and audit trails

### Project Status Engine
- **Automatic Mode**: Status auto-transitions based on prepDate and returnDate
  - not_started → planning (manual toggle before prep date)
  - planning → executing (on prep date)
  - executing → post_event (on return date)
  - post_event → completed (manual)
- **Manual Mode**: PM can override and set any allowed status
- Logic in `src/utils/projectStatus.ts`

## Contributing

When making changes:
1. Always log activities for user-facing changes using `logActivity`
2. Update both entity status and related project/task status when blocking/unblocking
3. Use `reevaluateProjectBlockedState` after changes to blockers or tasks
4. Follow existing patterns for useEffect dependency arrays to avoid race conditions
5. Test with filters active to ensure no data is unintentionally hidden

## Documentation

- **[docs/ARCHIVE.md](docs/ARCHIVE.md)** — Historical documentation (auth restructure, migrations, UI evolution)
- **[docs/SECURITY_RULES.md](docs/SECURITY_RULES.md)** — Firestore security rules configuration
- **[.github/copilot-instructions.md](.github/copilot-instructions.md)** — AI coding assistant guidance

## License

MIT
