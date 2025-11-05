# Development Role Switcher

## Overview

A development-only tool for testing role-based features without needing to log out and back in as different users. This allows rapid testing of permission systems, role-specific UI, and multi-user workflows.

## Features

- **Quick Access:** Press `Ctrl+Shift+D` (Windows/Linux) or `Cmd+Shift+D` (Mac) to toggle
- **Visual Indicator:** Floating badge shows current impersonated user and role
- **One-Click Switching:** Select any team member to instantly become them
- **Reset to Real:** Quickly return to your actual authenticated user
- **Production Safe:** Automatically disabled in production builds

## How It Works

The role switcher intercepts the team member data that the app uses to determine:
- Current user's role (owner, admin, technician, freelance, viewer)
- Access permissions for features
- Filtered data visibility
- UI elements shown/hidden

When you switch to a team member, the app behaves exactly as if you were logged in as that person.

## Usage

### Opening the Switcher

1. **Keyboard Shortcut:** Press `Ctrl+Shift+D` (or `Cmd+Shift+D` on Mac)
2. The switcher modal will appear with all team members listed

### Switching to Another User

1. Open the switcher
2. Click on any team member in the list
3. The modal closes and a floating indicator appears showing:
   - Who you're impersonating
   - Their role (with color coding)
4. The entire app now operates as if you're that user

### Returning to Your Real User

1. Click the switch icon (↔) on the floating indicator, OR
2. Press `Ctrl+Shift+D` to reopen the modal
3. Click "Reset to Real User" button
4. You're back to your authenticated identity

## Role Color Coding

- **Owner** - Purple
- **Admin** - Blue
- **Technician** - Cyan
- **Freelance** - Yellow
- **Viewer** - Gray

## What to Test

### Owner/Admin Features
- Can see all tasks and projects (not just assigned to them)
- Can create/edit/delete any tasks or projects
- Can assign tasks to other team members
- Can edit shifts for all team members
- Access to all views and settings

### Technician/Freelance Features
- Only see tasks/projects assigned to them
- Can edit their own tasks
- Can view schedule filtered to their items
- Cannot assign tasks to others
- Limited edit permissions

### Viewer Features
- Read-only access to assigned items
- Cannot create or edit anything
- Can view schedule but not modify

## Example Testing Workflow

1. **As Owner (your real account):**
   - Create a new project with team members assigned
   - Create tasks assigned to different people

2. **Switch to Technician:**
   - Verify you only see your assigned tasks
   - Try to edit someone else's task (should be blocked)
   - Check that "All Tasks" toggle isn't available

3. **Switch to Admin:**
   - Verify you can see all tasks
   - Toggle between "My Tasks" and "All Tasks"
   - Edit various team member's tasks

4. **Switch to Viewer:**
   - Verify read-only access
   - Check that edit buttons are disabled
   - Confirm filtered schedule view works

## Technical Details

### Implementation

- Located in: `src/components/DevRoleSwitcher.tsx`
- Integrated in: `src/App.tsx`
- Environment detection: `import.meta.env?.MODE === 'development'`

### State Management

The App component maintains three pieces of state:
- `realTeamMember` - Your actual authenticated team member
- `impersonatedMember` - The team member you're pretending to be
- `teamMember` - The active member used by the app (either real or impersonated)

When you switch users, only `teamMember` changes while `realTeamMember` stays constant, allowing you to always return to your real identity.

### Data Access

**Important:** The role switcher only changes the client-side perception. Firestore security rules still validate against your real Firebase Auth user ID. This means:

✅ **What you can test:**
- UI visibility based on role
- Role-based filtering in the UI
- Feature availability
- Navigation restrictions

❌ **What you cannot test:**
- Actual Firestore security rule enforcement
- Data that requires server-side permission checks
- Features that validate the Firebase Auth UID

For complete security rule testing, you'll need to create actual test accounts or use Firebase emulators.

## Keyboard Shortcuts

- `Ctrl+Shift+D` or `Cmd+Shift+D` - Toggle switcher modal
- `Escape` - Close switcher modal

## Troubleshooting

### Switcher Doesn't Appear
- Verify you're running in development mode (`npm run dev`)
- Check console for errors
- Ensure you're logged in and have team members

### Changes Don't Take Effect
- Some cached data may persist - try refreshing the page
- Check that the component you're testing actually uses the team member role

### Production Build
- The component automatically hides in production
- The keyboard shortcut is disabled
- No performance impact on production

## Future Enhancements

Potential improvements:
- Save/restore impersonation state on page reload
- Quick role presets (switch to "any admin", "any technician", etc.)
- Session history (track which roles you've tested)
- Automated test scenarios

---

**Created:** November 5, 2025  
**Version:** 1.0
