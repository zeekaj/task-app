# Task Management App

A personal task and project management application for production and event management, built with React, TypeScript, Vite, and Firebase.

## Overview

**Single-User Design**: This is a personal productivity tool designed for one user managing production events, technical projects, and team coordination. While the data model includes team member records for assignment tracking, the app is optimized for solo use without real-time collaboration features.

## Features

- **Task Management**: Create, edit, archive, and organize tasks with priority levels, due dates, and assignees
- **Project Management**: Group tasks into projects with install dates, R2 numbers, and ownership tracking
- **Blocker System**: Track and manage blockers for both tasks and projects with resolution tracking
- **Multiple Views**: 
  - Tasks View: All standalone tasks with advanced filtering
  - Projects View: All projects with task summaries (Cards, List, Kanban modes)
  - Team View: Manage team member records for assignment tracking
  - Dashboard: Overview of activity and metrics
- **Advanced Filtering**: Filter by status, priority, due date, assignee with saved preferences per view
- **Activity History**: Complete audit trail of all changes
- **Search**: Full-text search across tasks and projects
- **Undo**: Revert the last change to any task or project

## Recent Changes (October 2025)

### UI/UX Updates (October 28, 2025)
- **Task View Styling**: Migrated to dark glass-morphism design system
  - TaskEditForm header with dark gradients
  - Updated text colors for dates and assignees (text-brand-text)
  - ActivityHistory component with dark theme
### Team Member Integration
**Note**: Team members are tracked for assignment purposes but represent contractors, freelancers, or team members you coordinate with. The app is designed for single-user operation without real-time collaboration features.

- Assignee fields now use dropdown populated from team members
- Custom dropdown with React Portal to escape overflow constraints
- Shows team member names and titles
- Works in both TaskItem (inline edit) and TaskEditForm (modal)
- **Project Status Management**:
  - Removed manual/auto mode toggle buttons (status is now purely automatic based on dates)
  - Added clickable status badge on project cards to toggle between "Not Started" and "Planning"
  - All other statuses (Executing, Post-Event, Completed) are automatic based on prep/return dates
  - Removed "Toggle" button and manual status controls from list view

### Bug Fixes
- **TechsView Filters**: Fixed filters not applying correctly to tasks (status and priority filtering now work)
- **Task Edit Form**: Fixed subtasks and dependencies disappearing when typing by resolving useEffect race conditions
- **Dropdown Z-Index**: Fixed dropdowns being clipped by parent containers using fixed positioning
- **Project View R2#**: Fixed focus loss when typing in R2# and Install Date fields using onBlur pattern
- **Assignee Dropdown**: Fixed native select dropdown being clipped by overflow-hidden containers

### Feature Improvements
- **Blocker Modal in Blocked View**: Clicking blocked badge now opens blocker management modal
- **Dynamic Blocker Modal Titles**: Modal now shows "Task Blockers" vs "Project Blockers" based on entity type
- **Undo Button**: Added undo button to TaskItem for reverting recent changes
- **Description Change Tracking**: Activity log now properly tracks description field changes (including empty strings)
- **Unsaved Changes Warning**: Task edit form now warns before discarding unsaved changes
- **Search in Project View**: Added search bar to filter tasks within a project
- **Hidden Tasks Indicator**: Shows count of tasks hidden by active filters with tooltip
- **Keyboard Shortcuts**: Ctrl/Cmd+Enter to save, Escape to cancel in task edit form

### Project Edit Modal Enhancements (October 30, 2025)
- Tasks tab now uses the same TaskItem/TaskEditForm components as the main Tasks view
  - Full parity: status menu, assignee dropdown with Portal, priority slider, blockers, inline title edit, undo
  - Quick Add Task at the top remains
- Added Arrange controls (no filters in modal)
  - Sort by Created, Status, Title, Due Date, Priority, or Assignee
  - Reverse order toggle
- Team visibility in header
  - Team member avatars (initials) now appear in the modal header next to the status badge and PM
  - Shows up to 4 avatars with “+N” overflow indicator
- Activity tab in the modal
  - New Activity tab shows project-level activity history (status changes, field updates, archive/unarchive)
- Blockers inside the modal
  - Start/manage blockers for tasks directly from the modal via BlockerModal and BlockerManagerModal

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

## End of Day Summary (2025-10-28)

Recent updates and current status:

### Typography & Branding (Oct 24-28)
- **Font hierarchy**: Inter (primary) for headings/body, Manrope (secondary) for UI labels/metrics, Outfit (accent) for marketing
- **Self-hosted fonts**: Migrated from Google Fonts CDN to `@fontsource` packages for better performance and privacy
- **Logo implementation**: Added cropped Momentum logo (h-14/56px) with "Momentum" text in Inter font (text-2xl, gray-300, 2px gap)
- **TopNav enhancements**: Added responsive sizing, smooth hover effects (scale/color transitions), optimized mobile breakpoints

### Tasks View Redesign (Oct 28, 2025)
- **Dark glass-morphism theme**: TaskEditForm, TaskItem, and ActivityHistory fully migrated to dark design system
- **Team member dropdowns**: Assignee fields now use custom dropdowns with React Portal
  - Populated from `useTeamMembers` hook
  - Escapes overflow constraints with fixed positioning
  - Shows team member names and titles
  - Works in both inline editing (TaskItem) and modal (TaskEditForm)
- **Assignee field expansion**: Width increased from 70-75px to 110px to prevent text wrapping

### Projects View Status Management (Oct 28, 2025)
- **Removed manual/auto mode toggle**: Status is now purely automatic based on dates
- **Clickable status badges**: In Cards view, click the status badge to toggle between "Not Started" and "Planning"
- **Automatic status transitions**: Executing, Post-Event, and Completed statuses are automatically set by prep/return dates
- **Cleaned up UI**: Removed Mode column from List view, removed Toggle button

### Files Updated
- `src/styles/fonts.css` — now imports @fontsource packages instead of Google Fonts
- `src/styles/tokens.css` — Inter primary, Manrope secondary font definitions
- `tailwind.config.js` — updated font family order and utilities
- `src/styles/typography.css` — complete type scale with Inter/Manrope assignments
- `src/components/layout/TopNav.tsx` — logo, responsive design, hover effects
- `src/components/TaskItem.tsx` — assignee dropdown with Portal, dark theme, expanded width
- `src/components/TaskEditForm.tsx` — dark theme header, assignee dropdown
- `src/components/ActivityHistory.tsx` — dark theme styling
- `src/components/views/ProjectsView.tsx` — removed mode toggles, added clickable status badges
- `src/components/views/StyleGuideView.tsx` — living documentation of design system
- `src/assets/` — added Logo Only-cropped.png, Logo Only.png, Logo with BrandMark.png

### Next Steps

1. **Additional view migrations** — Continue applying dark glass-morphism theme to remaining views:
   - Dashboard view components
   - Team view components
   - Blocked view
   - Calendar view
   
2. **Documentation cleanup** — Review and update archived docs for outdated references

3. **Optional enhancements**:
   - Add CI smoke tests for style guide page
   - Consider dark/light mode brand color variants
   - Explore animation system for micro-interactions
   - Add keyboard shortcuts documentation

---

## Session Summary (Oct 28, 2025 - End of Day)

### Completed Today
✅ **Tasks View Complete Redesign**
- Migrated TaskItem, TaskEditForm, and ActivityHistory to dark glass-morphism theme
- Implemented team member dropdowns with React Portal for assignee selection
- Fixed dropdown clipping issues with overflow-hidden containers
- Expanded assignee field width for better UX

✅ **Projects View Status Improvements**
- Removed all manual/auto mode toggle buttons
- Added clickable status badges for Not Started/Planning toggle
- Simplified UI by removing Mode column from List view
- Status now purely automatic based on dates (with exception for pre-prep manual toggle)

✅ **Documentation Updates**
- Updated README.md with all recent changes
- Updated .github/copilot-instructions.md with new patterns
- Documented team member integration patterns

### Known Issues
- None identified

### Ready for Next Session
- All changes tested and working
- Documentation up to date
- No blocking issues

## End of Day Summary (2025-10-30)

Recent updates and current status:

### Project Edit Modal Parity
- Replaced simple lists with full TaskItem rows and TaskEditForm for edits
- Added Arrange-by dropdown with reverse toggle (no filters in modal)
- Integrated Blocker modals for in-modal block/unblock flows
- Added team avatars to the header for quick visibility
- Added Activity tab to view project-level history in place

### Files Updated
- `src/components/views/ProjectDetailView.tsx` — TaskItem parity, sorting controls, header avatars, Activity tab, blocker modals
- `src/components/TaskItem.tsx` — minor lint cleanup (unused state removed)
- `src/services/tasks.ts` — lint cleanup in catch blocks

### Known Issues
- None identified

### Ready for Next Session
- All changes linted and integrated
- Documentation updated
- No blocking issues
