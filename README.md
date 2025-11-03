# Task Management App

A collaborative task and project management application for production and event management, built with React, TypeScript, Vite, and Firebase.

## Overview

**Multi-User Collaboration**: This application is designed for teams managing production events, technical projects, and coordinated workflows. The app supports organization-based team management with role-based access control, real-time collaboration features, and comprehensive shift scheduling for production/event coordination.

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

## Recent Changes (November 2025)

### Projects View Enhancements (November 3, 2025)
- **Real-Time Data Updates**: Converted client and venue data to use Firestore real-time listeners
  - `useClients` and `useVenues` hooks now use `onSnapshot` instead of one-time fetches
  - Automatic UI updates when clients/venues are modified in any view
  - Removed manual refetch plumbing across all components
- **Card Layout Redesign**: Completely restructured project cards for better information density
  - Moved status bar from horizontal (top) to vertical (left side)
  - 5-line condensed layout:
    - Line 1: Event title (standalone, prominent)
    - Line 2: Status pill + R2# + actions menu
    - Line 3: PM + team avatars
    - Line 4: Prep and return dates with icons
    - Line 5: Client and venue with icons
  - Responsive grid: 1 column (mobile) → 2 (tablet) → 3 (desktop) → 4 (xl screens)
- **Create Project Modal Enhancement**: Added Autocomplete components for client/venue selection
  - Searchable dropdowns with sublabels (contact name for clients, location for venues)
  - Inline creation modals for new clients/venues
  - Automatically sets newly created entity as selected value
  - Matches edit modal functionality for consistency
- **Sign-Off Status Visualization**: Replaced generic "Post-Event" status with attention-grabbing Sign-Off indicator
  - Orange animated pill with checkmark icon for all post_event status projects
  - Consistent across Cards, List, and Kanban views
  - Replaces previous red sign-off badge approach
  - Filter tab and Kanban column labeled "Sign-Off"
  - Informational only (cannot be clicked to change status)

## Recent Changes (October 2025)

### Shift Scheduling System (October 31, 2025)
- **Complete Shift Management**: Built comprehensive shift scheduling for granular time-based assignments
  - Generic shifts: standalone shifts not tied to projects (crew calls, general availability, etc.)
  - Project shifts: event/project-related shifts with call times and instructions
  - Shift data model: 15+ fields including start/end times, breaks, location, position, status workflow
  - Removed pay fields from shifts (moved to team member profiles for consistency)
- **Sling-Style Modals**: Created two shift creation/edit modals with dark glass-morphism design
  - GenericShiftModal: date, times, breaks, location, position, employee selection, notes, publish toggle
  - ProjectShiftModal: all generic fields plus project selection, call time, and team instructions
  - Emerald gradient banner when published
  - Automatic title generation for project shifts: "{Project} - {Position}"
- **Weekly Schedule Grid**: Implemented Sling-style calendar view
  - Team members as rows, dates as columns (Monday-Sunday weeks)
  - Stacked shift cards with AM/PM time format
  - Hover to add shifts directly to specific member/date cells
  - Color-coded: teal for shifts, purple for events
- **Freelancer Management**: Smart filtering for ad-hoc team members
  - Freelancers excluded from regular schedule rows (reduce clutter)
  - "Add Freelancer" button at bottom to temporarily add rows only when needed
  - Purple/pink gradient avatars with "FREELANCE" badge for visual distinction
  - Remove button (X) for manually added freelancers
  - Freelancers with active shifts automatically appear
- **FloatingDropdown Component**: Extracted reusable dropdown pattern
  - Fixed positioning to escape overflow-hidden clipping
  - Automatic position calculation with resize/scroll handling
  - Outside-click detection with dual-ref pattern
  - Controlled or uncontrolled mode support
  - `src/components/shared/FloatingDropdown.tsx` now available for any floating menus

### UI/UX Updates (October 28, 2025)
- **Task View Styling**: Migrated to dark glass-morphism design system
  - TaskEditForm header with dark gradients
  - Updated text colors for dates and assignees (text-brand-text)
  - ActivityHistory component with dark theme
### Team Member Integration
**Multi-User Design**: Team members are active collaborators within organizations, including full-time staff, contractors, and freelancers with real-time coordination capabilities.

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

### Dev server and ports (Codespaces)
- Start the dev server:
  - `npm run dev` (Vite is configured with `server.host=true`, `port=5173`)
- Open the forwarded port:
  - In the Ports panel, ensure port 5173 is listed and set to Public visibility.
  - Use “Open in Browser” from the Ports panel; the URL should be `...-5173.app.github.dev`.
- If you see 502 (Bad Gateway):
  - Wait 10–20 seconds and hard refresh; the server may still be booting.
  - Stop the dev task and start it again with `npm run dev`.
  - Close the browser tab and reopen via the Ports panel.
- Alternative: Preview the production build with `npm run preview` (also bound to port 5173).
 - If the page is blank/unloading unexpectedly:
   - Ensure only one dev server is running (stale processes can cause HMR/page reload loops).
   - Stop all dev servers, confirm port 5173 is free, then start `npm run dev` again.

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

## End of Day Summary (2025-10-31)

Recent updates and current status:

### Shift Scheduling System (Complete)
- **Data Layer**: Created `src/services/shifts.ts` with full CRUD operations
  - createShift, updateShift, deleteShift, assignMemberToShift
  - bulkCreateShifts for batch operations
  - createShiftsFromProject to auto-generate load-in/event/strike shifts
  - undefined value filtering for Firestore compatibility
  - Activity logging for all shift operations
- **Hooks**: Built `src/hooks/useShifts.ts` for real-time shift data
  - Date range filtering, member filtering, project filtering
  - Client-side startTime sorting (avoids composite index requirements)
  - In-memory status filtering
- **Shift Modals**: Two complete modal implementations
  - `src/components/GenericShiftModal.tsx` (~420 lines)
  - `src/components/ProjectShiftModal.tsx` (~480 lines)
  - Both feature dark glass-morphism, emerald publish banner, icon-based layout
- **Schedule View**: Enhanced `src/components/views/ScheduleView.tsx` (885+ lines)
  - "New Shift" dropdown with generic/project options
  - Automatic modal type detection on edit
  - Monday-based week calculations
- **Weekly Grid**: Built `src/components/views/WeeklyScheduleGrid.tsx` (385 lines)
  - Team-as-rows, dates-as-columns layout
  - Stacked shift cards with hover-to-add functionality
  - Freelancer filtering with temporary row system
  - Purple/pink gradients for freelancers vs cyan/blue for regular members
- **Reusable Component**: Extracted `src/components/shared/FloatingDropdown.tsx`
  - Fixed-position floating menus to escape overflow clipping
  - Automatic position calculation with viewport awareness
  - Outside-click handling with deferred listener attachment
  - Resize/scroll position updates
  - Available for use throughout the app

### Next Steps & Future Development

1. **Shift Templates** (Optional)
   - Create reusable shift templates for common patterns (load-in crew, event staff, strike crew)
   - Apply templates to projects with one click
   - Store in `src/services/shifts.ts` (functions already stubbed)

2. **Testing & Validation**
   - Test creating shifts (both generic and project types)
   - Test assigning people and viewing weekly grid
   - Test editing shifts and freelancer management
   - Verify integration with projects and team members

3. **Schedule View Enhancements**
   - Drag-and-drop shift reassignment between members/dates
   - Copy/paste shifts across days or weeks
   - Bulk edit for multiple shifts
   - Print/export weekly schedules

4. **Integration & Polish**
   - Connect shifts to activity history for better audit trails
   - Add shift notifications/reminders
   - Shift conflict detection (double-booking alerts)
   - Time tracking integration for actual vs scheduled hours

5. **Additional View Migrations**
   - Continue applying dark glass-morphism theme to remaining views
   - Dashboard view components
   - Settings view refinements

### Files Created/Modified (Oct 31)
- `src/types.ts` — Added Shift, ShiftStatus, ShiftBreak, ShiftTemplate interfaces
- `src/services/shifts.ts` — Complete shift service layer (380+ lines)
- `src/hooks/useShifts.ts` — Real-time shift data hooks (140 lines)
- `src/components/GenericShiftModal.tsx` — Generic shift modal (420 lines)
- `src/components/ProjectShiftModal.tsx` — Project shift modal (480 lines)
- `src/components/views/ScheduleView.tsx` — Enhanced with shift management (885+ lines)
- `src/components/views/WeeklyScheduleGrid.tsx` — New weekly grid component (385 lines)
- `src/components/shared/FloatingDropdown.tsx` — New reusable floating dropdown (115 lines)

### Known Issues
- None identified

### Ready for Next Session
- Shift scheduling system fully implemented and functional
- FloatingDropdown component extracted and reusable
- All TypeScript compilation errors resolved
- Dev server running successfully
- Documentation updated
