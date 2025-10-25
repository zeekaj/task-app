# Task App — Historical Documentation Archive

This file contains documentation from earlier iterations of the app that is no longer relevant to current development but may be useful for historical reference.

---

## Authentication Restructure (Completed 2025)

### Overview
The authentication system was restructured from Google OAuth to email/password authentication with team member authorization.

### Key Changes Implemented
- **Authentication Services** (`src/services/auth.ts`) with email/password auth
- **Login Interface** (`src/components/views/LoginView.tsx`) with form validation
- **First-Time Password Setup** (`src/components/views/FirstTimePasswordView.tsx`)
- **TeamMember Data Model** extended with auth fields (userId, hasPassword, invitedAt, lastLoginAt)
- **Global Collection Migration** — team members moved from `users/{uid}/teamMembers/{memberId}` to `teamMembers/{memberId}` with `organizationId` field

### Benefits
- Can check email authorization before login
- Enables pre-login team member verification
- Supports email/password authentication flow
- Simplifies queries and access patterns

---

## Team Members Migration (Completed)

### Old Structure
```
users/{uid}/teamMembers/{memberId}
```

### New Structure
```
teamMembers/{memberId}
  - organizationId: string  // Links to the organization owner (uid)
  - userId: string | null   // Firebase Auth UID
  - hasPassword: boolean
  - invitedAt: Timestamp
  - lastLoginAt: Timestamp | null
  - ... other fields
```

### Migration Process
Migration script at `scripts/migrate-team-members.mjs` handled the data migration. The script:
- Migrated all team members to the global `teamMembers` collection
- Added `organizationId` field to link members to their organization
- Preserved all existing data (skills, roles, availability, etc.)
- Initialized auth fields (`userId`, `hasPassword`, `lastLoginAt`, `invitedAt`)

---

## Admin Setup (Initial Configuration)

### Firestore Rules Setup
Initial admin setup required updating Firestore security rules to allow the first admin account creation.

**Temporary Setup Rules** (for initial admin creation):
```javascript
match /teamMembers/{memberId} {
  allow read: if request.auth != null;
  allow create: if request.auth != null;
  allow update, delete: if request.auth != null && 
    (get(/databases/$(database)/documents/teamMembers/$(request.auth.uid)).data.role == 'admin' ||
     resource.data.userId == request.auth.uid);
}
```

**Production Rules** (after admin created):
```javascript
function getTeamMember(uid) {
  return get(/databases/$(database)/documents/teamMembers/$(uid)).data;
}

function isAdmin() {
  return request.auth != null && getTeamMember(request.auth.uid).role == 'admin';
}

match /teamMembers/{memberId} {
  allow read: if request.auth != null;
  allow create: if isAdmin();
  allow update: if isAdmin() || (request.auth != null && resource.data.userId == request.auth.uid);
  allow delete: if isAdmin();
}
```

---

## UI Evolution Notes

### Projects Tab Rebuild (October 2025)
Complete rebuild of the Projects view with three modes:
1. **Cards View** — Grid layout with glass cards, status stripes, context menus
2. **List View** — Table with inline editing, visual "saved" checkmarks
3. **Kanban View** — 5 columns by effectiveStatus (drag-and-drop planned but not implemented)

### Status Engine
- **Automatic Status Mode** — Date-based transitions: not_started → planning → executing → post_event → completed
- **Manual Status Mode** — PM can override and set status manually
- Implemented via `computeProjectStatus()` and `getAllowedStatusTransitions()` in `src/utils/projectStatus.ts`

### Dark Glass-Morphism Design System
- Pure black background with glass cards
- Neon cyan/blue accents
- Custom design tokens (`src/styles/tokens.css`)
- Reusable UI primitives: Card, Badge, StatusBadge, PillTabs, Modal

### Layout Changes
- Replaced sidebar with top tab navigation
- 6 main tabs: Dashboard, Team, Tasks, Projects, AI Allocation, Settings
- `AppLayout` wrapper with `TopNav` component

---

## Deprecated Features

### Drag-and-Drop
Earlier versions used `@dnd-kit/core` for drag-and-drop functionality. References to drag-and-drop in code comments are historical. Current UI does not implement drag-and-drop reordering.

### Google OAuth
App originally used Google OAuth for authentication. Replaced with email/password authentication in the auth restructure (2025).

---

## Historical Progress Tracking (2025)

### October 24, 2025
- Font hierarchy updated: Inter primary, Manrope secondary (UI labels), Outfit accent
- Files changed: `src/styles/tokens.css`, `tailwind.config.js`, `src/styles/typography.css`, `src/components/views/StyleGuideView.tsx`
- Next steps: Replace placeholder logo, consider self-hosting fonts, migrate to brand utilities

### Earlier October 2025
- UI redesign foundation completed
- Top navigation layout implemented
- Projects tab complete rebuild with three view modes
- Status engine and business logic implemented
- Toast notifications system added
- Inline save feedback with visual checkmarks
- Actions menu with archive/delete
- Activity logging for all project changes

---

## Migration Scripts (Historical Reference)

### migrate-team-members.mjs
Located at `scripts/migrate-team-members.mjs`. Migrated team members from per-user subcollections to global collection.

**Usage:**
```bash
# Dry run
node scripts/migrate-team-members.mjs --dry-run

# Actual migration
node scripts/migrate-team-members.mjs
```

**Prerequisites:**
- Firebase Admin SDK service account key (`service-account-key.json`)
- Node.js 18+
- Firebase Admin SDK installed

---

## End of Archive

For current documentation, see:
- [`README.md`](../README.md) — Current project overview and developer guide
- [`docs/SECURITY_RULES.md`](SECURITY_RULES.md) — Firestore security rules documentation
- `.github/copilot-instructions.md` — AI coding assistant guidance
