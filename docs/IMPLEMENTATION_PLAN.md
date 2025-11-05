# Implementation Plan: Multi-User Task & Project Management
**Created:** November 5, 2025  
**Status:** Planning Phase

## Executive Summary

This document outlines the technical implementation strategy for transforming the task-app into a comprehensive multi-user task and project management system with seamless schedule integration. The plan addresses four key priorities:

1. **General vs Project-Specific Tasks** - Clear separation and organization
2. **Role-Based Visibility** - Personalized views with manager oversight
3. **Schedule Integration** - Auto-population and daily planning
4. **Schedule Filtering** - Personal focus with flexible team views

---

## Current State Analysis

### Architecture Overview
- **Client-Only App:** All logic in React/TypeScript, no backend server
- **Data Storage:** Firestore with per-user collections (`users/{uid}/tasks`, `users/{uid}/projects`)
- **Authentication:** Firebase Auth with email/password
- **Team Model:** Organization-based with `teamMembers` collection
- **Roles:** owner, admin, technician, freelance, viewer

### Data Structure (Current)
```
users/
  {uid}/
    tasks/          ← All tasks for this user
      {taskId}
    projects/       ← All projects for this user
      {projectId}
    blockers/
    activityHistory/
    clients/
    venues/
    shifts/
```

### Key Components
- **TasksView:** Lists all tasks with filtering
- **ProjectsView:** Cards/List/Kanban views for projects
- **ProjectDetailView:** Project overview with tasks tab
- **ScheduleView:** Weekly grid with shifts and events
- **Team Management:** Full team member CRUD

### Current Limitations
1. Tasks stored per-user → no cross-user visibility for managers
2. No distinction between general and project tasks in UI
3. No schedule integration with tasks/projects
4. No role-based filtering or permissions
5. Schedule shows all data without personal quick-filters

---

## Priority 1: General vs Project-Specific Tasks

### Goal
Clearly distinguish office-based "General" tasks from project-specific tasks, with intuitive organization and filtering.

### Technical Approach

#### 1. Data Model (No Changes Needed)
- ✅ Tasks already have `projectId: string | null`
- ✅ `null` = general task, `string` = project task
- No migration required

#### 2. UI Changes

**TasksView Enhancements:**
```tsx
// Add grouping logic
const generalTasks = tasks.filter(t => !t.projectId);
const projectTasks = tasks.filter(t => t.projectId);

// Add filter state
const [taskTypeFilter, setTaskTypeFilter] = useState<'all' | 'general' | 'project'>('all');

// Render sections
<div className="tasks-general">
  <h3>General Tasks ({generalTasks.length})</h3>
  {/* Task list */}
</div>
<div className="tasks-project">
  <h3>Project Tasks ({projectTasks.length})</h3>
  {/* Task list with project badges */}
</div>
```

**Visual Indicators:**
- Add project badge on project tasks showing project name
- Use different icon: 📋 for general, 📁 for project
- Color-code backgrounds: subtle gray for general, subtle blue for project

**Filter Controls:**
```tsx
<div className="task-type-filter">
  <button onClick={() => setTaskTypeFilter('all')}>All Tasks</button>
  <button onClick={() => setTaskTypeFilter('general')}>General Only</button>
  <button onClick={() => setTaskTypeFilter('project')}>Project Tasks</button>
</div>
```

**Quick Add Forms:**
- TasksView: Default to general task (projectId = null)
- ProjectDetailView: Auto-set projectId to current project

#### 3. Task Conversion

**New Service Function:**
```typescript
// src/services/tasks.ts
export async function convertTaskToProject(
  uid: string,
  taskId: string,
  projectId: string | null
) {
  await updateTask(uid, taskId, { projectId });
  await logActivity(uid, 'task', taskId, task.title, 'updated', {
    description: projectId 
      ? `Moved to project: ${projectName}`
      : 'Converted to general task',
    changes: { projectId: { from: oldId, to: projectId } }
  });
}
```

**UI Component:**
```tsx
// Add to TaskEditForm or TaskItem menu
<Dropdown>
  <MenuItem onClick={() => showProjectSelector()}>
    Move to Project...
  </MenuItem>
  <MenuItem onClick={() => convertToGeneral()}>
    Convert to General Task
  </MenuItem>
</Dropdown>
```

#### 4. ProjectsView Updates

**Show Task Counts:**
```tsx
// In project card
<div className="project-tasks-badge">
  {projectTasks.length} tasks
</div>
```

### Implementation Steps

**Phase 1A: Basic Grouping (2-3 hours)**
1. Add grouping logic to TasksView
2. Add visual indicators (icons, subtle backgrounds)
3. Show project name badge on project tasks
4. Test with existing data

**Phase 1B: Filtering (1-2 hours)**
1. Add task type filter buttons
2. Implement filter logic
3. Save preference to localStorage
4. Update FilterBar component

**Phase 1C: Task Conversion (2-3 hours)**
1. Create `convertTaskToProject` service function
2. Add menu option to TaskItem
3. Add project selector modal
4. Update activity logging
5. Test conversion both directions

**Phase 1D: Project Card Enhancements (1 hour)**
1. Add task count to project cards
2. Update card layout to accommodate badge
3. Test in all view modes (cards, list, kanban)

**Total Estimated Time:** 6-9 hours

---

## Priority 2: Role-Based Visibility & Permissions

### Goal
Regular users see only their assigned work; Owners/Admins see everything with powerful filtering.

### Technical Approach

#### 1. Data Migration (Critical)

**Problem:** Current structure stores data per-user, preventing cross-user visibility.

**Solution:** Move to organization-based collections.

**New Structure:**
```
organizations/
  {orgId}/
    tasks/
      {taskId}
        - title, description, status, priority, dueDate
        - projectId
        - assignee (single user)
        - assignees (array of users)
        - createdBy (uid)
        - organizationId (redundant but helpful)
    projects/
      {projectId}
        - title, status, dates...
        - assignee, assignees[], projectManager
        - createdBy
        - organizationId
    blockers/
    activityHistory/
    clients/
    venues/
    shifts/ (already organization-based ✅)
```

**Migration Script:**
```javascript
// scripts/migrate-to-organization-collections.mjs
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

async function migrate() {
  const db = getFirestore();
  
  // 1. Get all team members to find organizationId
  const teamMembers = await db.collection('teamMembers').get();
  const orgMap = {}; // uid -> orgId
  
  teamMembers.forEach(doc => {
    const data = doc.data();
    orgMap[data.userId] = data.organizationId;
  });
  
  // 2. Migrate tasks
  for (const [uid, orgId] of Object.entries(orgMap)) {
    const tasksSnap = await db.collection(`users/${uid}/tasks`).get();
    
    for (const taskDoc of tasksSnap.docs) {
      const taskData = taskDoc.data();
      await db.collection(`organizations/${orgId}/tasks`).doc(taskDoc.id).set({
        ...taskData,
        createdBy: uid,
        organizationId: orgId,
      });
    }
  }
  
  // 3. Migrate projects (similar)
  // 4. Migrate blockers, activityHistory, clients, venues
  
  console.log('Migration complete!');
}

migrate().catch(console.error);
```

#### 2. Permission System

**New Utility Module:**
```typescript
// src/utils/permissions.ts
import type { TeamMemberRole } from '../types';

export function canViewAllTasks(role: TeamMemberRole): boolean {
  return role === 'owner' || role === 'admin';
}

export function canViewAllProjects(role: TeamMemberRole): boolean {
  return role === 'owner' || role === 'admin';
}

export function canEditAnyTask(role: TeamMemberRole): boolean {
  return role === 'owner' || role === 'admin';
}

export function canDeleteTask(
  role: TeamMemberRole,
  task: Task,
  userId: string
): boolean {
  if (role === 'owner' || role === 'admin') return true;
  return task.createdBy === userId;
}

export function canAssignToOthers(role: TeamMemberRole): boolean {
  return role === 'owner' || role === 'admin';
}

export function canEditScheduleItem(
  role: TeamMemberRole,
  item: any,
  userId: string
): boolean {
  if (role === 'owner' || role === 'admin') return true;
  if (item.type === 'shift' && item.assignedMemberIds?.includes(userId)) return true;
  if (item.type === 'task' && item.assignee === userId) return true;
  if (item.type === 'project' && item.assignees?.includes(userId)) return true;
  return false;
}
```

#### 3. Service Layer Updates

**Update Task Queries:**
```typescript
// src/services/tasks.ts
export async function getTasks(orgId: string, userId?: string, userRole?: TeamMemberRole) {
  const { query, where, getDocs } = await import('firebase/firestore');
  const fb = await getFirebase();
  
  let q = query(fb.col(orgId, 'tasks'));
  
  // Filter by assignee for non-admin users
  if (userId && userRole && !canViewAllTasks(userRole)) {
    q = query(q, where('assignee', '==', userId));
  }
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}
```

**Update Hooks:**
```typescript
// src/hooks/useTasks.ts
export function useTasks(orgId: string) {
  const { user, userRole } = useAuth();
  const [tasks, setTasks] = useState<WithId<Task>[]>([]);
  
  useEffect(() => {
    if (!orgId || !user) return;
    
    const { query, where, onSnapshot } = await import('firebase/firestore');
    const fb = await getFirebase();
    
    let q = query(fb.col(orgId, 'tasks'));
    
    // Filter for non-admins
    if (!canViewAllTasks(userRole)) {
      q = query(q, where('assignee', '==', user.uid));
    }
    
    const unsubscribe = onSnapshot(q, snapshot => {
      setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    
    return unsubscribe;
  }, [orgId, user?.uid, userRole]);
  
  return tasks;
}
```

#### 4. UI Updates

**TasksView Role-Based Display:**
```tsx
function TasksView({ orgId }: Props) {
  const { user, userRole } = useAuth();
  const tasks = useTasks(orgId);
  const isAdmin = canViewAllTasks(userRole);
  const [showAllTasks, setShowAllTasks] = useState(false);
  
  return (
    <div>
      {isAdmin && (
        <div className="view-toggle">
          <button onClick={() => setShowAllTasks(false)}>My Tasks</button>
          <button onClick={() => setShowAllTasks(true)}>All Tasks</button>
        </div>
      )}
      
      {/* Show assignee column only for admins */}
      {isAdmin && <AssigneeColumn />}
      
      {/* Rest of UI */}
    </div>
  );
}
```

#### 5. Firestore Security Rules

**Update rules:**
```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function getUserRole(orgId) {
      return get(/databases/$(database)/documents/teamMembers/$(request.auth.uid)).data.role;
    }
    
    function isAdmin(orgId) {
      let role = getUserRole(orgId);
      return role == 'owner' || role == 'admin';
    }
    
    function isAssignee(taskData) {
      return request.auth.uid == taskData.assignee ||
             request.auth.uid in taskData.assignees;
    }
    
    // Organization tasks
    match /organizations/{orgId}/tasks/{taskId} {
      allow read: if isAuthenticated() && (
        isAdmin(orgId) || isAssignee(resource.data)
      );
      
      allow create: if isAuthenticated() &&
        request.resource.data.organizationId == orgId &&
        request.resource.data.createdBy == request.auth.uid;
      
      allow update, delete: if isAuthenticated() && (
        isAdmin(orgId) || resource.data.createdBy == request.auth.uid
      );
    }
    
    // Similar rules for projects
    match /organizations/{orgId}/projects/{projectId} {
      allow read: if isAuthenticated() && (
        isAdmin(orgId) || isAssignee(resource.data)
      );
      
      allow create, update, delete: if isAuthenticated() && isAdmin(orgId);
    }
  }
}
```

### Implementation Steps

**Phase 2A: Migration Preparation (2-3 hours)**
1. Create migration script
2. Test on development data
3. Add rollback capability
4. Document migration process

**Phase 2B: Execute Migration (1 hour + monitoring)**
1. Backup production data
2. Run migration script
3. Verify data integrity
4. Update security rules

**Phase 2C: Permission System (3-4 hours)**
1. Create permissions.ts utility
2. Update service layer with permission checks
3. Update hooks to use new collection paths
4. Test with different roles

**Phase 2D: UI Updates (4-5 hours)**
1. Add "My/All" toggle for admins
2. Show/hide assignee column based on role
3. Update task creation forms
4. Add permission-based menu options
5. Test all user flows

**Phase 2E: Security Rules (2-3 hours)**
1. Write comprehensive rules
2. Test with Firebase emulator
3. Deploy rules
4. Verify with different roles

**Total Estimated Time:** 12-16 hours

---

## Priority 3: Schedule Integration

### Goal
Auto-populate schedule with dated tasks/projects; enable daily planning and progress tracking.

### Technical Approach

#### 1. Data Model

**New Collection:**
```typescript
// Add to types.ts
export interface ScheduleBlock {
  id?: string;
  organizationId: string;
  userId: string; // who scheduled it
  taskId?: string;
  projectId?: string;
  title: string;
  startTime: Timestamp;
  endTime: Timestamp;
  plannedMinutes: number;
  actualMinutes?: number;
  actualStartTime?: Timestamp;
  actualEndTime?: Timestamp;
  completed: boolean;
  inProgress: boolean;
  notes?: string;
  progressPercent?: number; // 0-100
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Add to Task type
export interface Task {
  // ... existing fields
  progressPercent?: number; // 0-100
  scheduledBlocks?: number; // count of schedule blocks
  timeSpent?: number; // total minutes spent
}
```

**Firestore Structure:**
```
organizations/
  {orgId}/
    scheduleBlocks/
      {blockId}
```

#### 2. Auto-Population Logic

**New Service:**
```typescript
// src/services/scheduling.ts

export async function getScheduleItemsForDateRange(
  orgId: string,
  startDate: Date,
  endDate: Date,
  userId?: string
) {
  const items = [];
  
  // 1. Get shifts (already done)
  const shifts = await getShifts(orgId, { startDate, endDate, userId });
  items.push(...shifts.map(s => ({ ...s, type: 'shift' })));
  
  // 2. Get tasks with due dates in range
  const tasks = await getTasks(orgId, userId);
  const dueTasks = tasks.filter(t => {
    if (!t.dueDate) return false;
    const due = new Date(t.dueDate);
    return due >= startDate && due <= endDate;
  });
  items.push(...dueTasks.map(t => ({ ...t, type: 'task' })));
  
  // 3. Get projects with date ranges overlapping
  const projects = await getProjects(orgId, userId);
  const activeProjects = projects.filter(p => {
    if (!p.prepDate || !p.returnDate) return false;
    const prep = new Date(p.prepDate);
    const ret = new Date(p.returnDate);
    return (prep <= endDate && ret >= startDate);
  });
  items.push(...activeProjects.map(p => ({ ...p, type: 'project' })));
  
  // 4. Get scheduled blocks
  const blocks = await getScheduleBlocks(orgId, { startDate, endDate, userId });
  items.push(...blocks.map(b => ({ ...b, type: 'scheduleBlock' })));
  
  return items;
}
```

#### 3. Daily Planning UI

**New Component:**
```tsx
// src/components/DayPlannerModal.tsx
export function DayPlannerModal({ orgId, userId, date, onClose }: Props) {
  const [availableTasks] = useTasks(orgId);
  const [availableProjects] = useProjects(orgId);
  const [timeBlocks, setTimeBlocks] = useState<ScheduleBlock[]>([]);
  
  const unscheduledTasks = availableTasks.filter(t => 
    t.assignee === userId && 
    t.status !== 'done' &&
    !t.scheduledBlocks
  );
  
  const handleAddToSchedule = (task: Task, startTime: string, duration: number) => {
    const block: ScheduleBlock = {
      organizationId: orgId,
      userId,
      taskId: task.id,
      title: task.title,
      startTime: new Date(`${date} ${startTime}`),
      endTime: addMinutes(new Date(`${date} ${startTime}`), duration),
      plannedMinutes: duration,
      completed: false,
      inProgress: false,
    };
    
    createScheduleBlock(orgId, block);
  };
  
  return (
    <Modal title={`Plan Your Day - ${formatDate(date)}`} onClose={onClose}>
      <div className="day-planner">
        <div className="time-grid">
          {/* 30-minute slots from 8am to 6pm */}
          {timeSlots.map(slot => (
            <div className="time-slot" key={slot}>
              <span>{slot}</span>
              {/* Drop zone for tasks */}
            </div>
          ))}
        </div>
        
        <div className="available-items">
          <h3>Available Tasks</h3>
          {unscheduledTasks.map(task => (
            <TaskCard 
              task={task}
              draggable
              onSchedule={(startTime, duration) => handleAddToSchedule(task, startTime, duration)}
            />
          ))}
        </div>
      </div>
    </Modal>
  );
}
```

#### 4. Progress Tracking

**Timer Component:**
```tsx
// src/components/TimerModal.tsx
export function TimerModal({ block, onClose }: Props) {
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedMinutes, setElapsedMinutes] = useState(0);
  const [notes, setNotes] = useState('');
  
  const startTimer = async () => {
    setIsRunning(true);
    await updateScheduleBlock(block.organizationId, block.id!, {
      inProgress: true,
      actualStartTime: new Date(),
    });
  };
  
  const stopTimer = async () => {
    setIsRunning(false);
    await updateScheduleBlock(block.organizationId, block.id!, {
      inProgress: false,
      actualEndTime: new Date(),
      actualMinutes: elapsedMinutes,
    });
  };
  
  const complete = async () => {
    await updateScheduleBlock(block.organizationId, block.id!, {
      completed: true,
      notes,
      actualMinutes: elapsedMinutes,
    });
    
    // Update task progress
    if (block.taskId) {
      const task = await getTask(block.organizationId, block.taskId);
      const newProgress = Math.min(100, (task.progressPercent || 0) + 25); // Increment by 25%
      await updateTask(block.organizationId, block.taskId, {
        progressPercent: newProgress,
        timeSpent: (task.timeSpent || 0) + elapsedMinutes,
      });
    }
    
    onClose();
  };
  
  return (
    <Modal title="Track Progress" onClose={onClose}>
      <div className="timer">
        <h2>{block.title}</h2>
        <div className="elapsed-time">{formatMinutes(elapsedMinutes)}</div>
        
        {!isRunning ? (
          <button onClick={startTimer}>Start Timer</button>
        ) : (
          <button onClick={stopTimer}>Stop Timer</button>
        )}
        
        <textarea
          placeholder="Notes about this work session..."
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />
        
        <button onClick={complete} disabled={isRunning}>
          Complete & Update Progress
        </button>
      </div>
    </Modal>
  );
}
```

#### 5. Schedule View Integration

**Update ScheduleView:**
```tsx
// src/components/views/ScheduleView.tsx
export function ScheduleView({ orgId }: Props) {
  const scheduleItems = useScheduleItems(orgId, dateRange);
  
  const renderScheduleCell = (date: Date, memberId: string) => {
    const items = scheduleItems.filter(item => 
      isOnDate(item, date) && isAssignedTo(item, memberId)
    );
    
    return (
      <div className="schedule-cell">
        {items.map(item => (
          <ScheduleItemCard
            key={item.id}
            item={item}
            type={item.type}
            onClick={() => handleItemClick(item)}
          />
        ))}
        
        {/* Hover-to-add */}
        <AddButton onClick={() => openAddMenu(date, memberId)} />
      </div>
    );
  };
  
  return (
    <div className="schedule-view">
      {/* Grid rendering */}
    </div>
  );
}
```

**Visual Distinction:**
```css
/* Schedule item colors by type */
.schedule-item.shift { background: #10b981; } /* teal */
.schedule-item.task { background: #8b5cf6; } /* purple */
.schedule-item.project { background: #3b82f6; } /* blue */
.schedule-item.schedule-block { background: #f59e0b; } /* amber */
```

### Implementation Steps

**Phase 3A: Data Model (1-2 hours)**
1. Add ScheduleBlock type
2. Add progress fields to Task type
3. Create scheduleBlocks collection

**Phase 3B: Auto-Population (3-4 hours)**
1. Create getScheduleItemsForDateRange
2. Add filtering logic for date ranges
3. Update useScheduleItems hook
4. Test with various date ranges

**Phase 3C: Daily Planner (6-8 hours)**
1. Create DayPlannerModal component
2. Implement drag-and-drop scheduling
3. Add time slot grid
4. Integrate with schedule view
5. Test scheduling workflow

**Phase 3D: Progress Tracking (4-5 hours)**
1. Create TimerModal component
2. Implement timer logic
3. Add progress update to tasks
4. Create progress indicators on task cards
5. Test timer and progress updates

**Phase 3E: Visual Integration (3-4 hours)**
1. Update ScheduleView to render all item types
2. Add color coding
3. Add item type badges
4. Implement click handlers
5. Test visual rendering

**Total Estimated Time:** 17-23 hours

---

## Priority 4: Schedule Filtering & Personal Views

### Goal
Flexible schedule viewing with personal quick-filters and proper permission controls.

### Technical Approach

#### 1. Quick Filter System

**State Management:**
```tsx
// src/components/views/ScheduleView.tsx
type ScheduleViewMode = 'my' | 'team' | 'filtered';

const [viewMode, setViewMode] = useState<ScheduleViewMode>('my');
const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

// Save preference
useEffect(() => {
  localStorage.setItem('scheduleViewMode', viewMode);
}, [viewMode]);
```

**Filter Logic:**
```typescript
const filteredItems = useMemo(() => {
  let items = allScheduleItems;
  
  if (viewMode === 'my') {
    items = items.filter(item => isAssignedToCurrentUser(item, userId));
  } else if (viewMode === 'filtered') {
    items = items.filter(item => 
      selectedMembers.some(memberId => isAssignedTo(item, memberId))
    );
  }
  // 'team' mode shows all items
  
  return items;
}, [allScheduleItems, viewMode, selectedMembers, userId]);
```

#### 2. UI Components

**View Mode Toggle:**
```tsx
<div className="schedule-view-controls">
  <div className="view-mode-toggle">
    <button
      className={viewMode === 'my' ? 'active' : ''}
      onClick={() => setViewMode('my')}
    >
      <Icon name="user" />
      My Schedule
    </button>
    
    <button
      className={viewMode === 'team' ? 'active' : ''}
      onClick={() => setViewMode('team')}
    >
      <Icon name="users" />
      Full Team
    </button>
    
    {teamMembers.length > 1 && (
      <button
        className={viewMode === 'filtered' ? 'active' : ''}
        onClick={() => setViewMode('filtered')}
      >
        <Icon name="filter" />
        Custom Filter
      </button>
    )}
  </div>
  
  {/* Status indicator */}
  <div className="view-status">
    {viewMode === 'my' && 'Viewing: My Schedule'}
    {viewMode === 'team' && 'Viewing: Full Team'}
    {viewMode === 'filtered' && `Viewing: ${selectedMembers.length} members`}
  </div>
</div>
```

**Multi-Select Member Filter:**
```tsx
{viewMode === 'filtered' && (
  <div className="member-filter">
    <MultiSelect
      options={teamMembers.map(m => ({ value: m.id, label: m.name }))}
      selected={selectedMembers}
      onChange={setSelectedMembers}
      placeholder="Select team members..."
    />
  </div>
)}
```

#### 3. Visual Highlighting

**Color Coding:**
```tsx
const getItemClassName = (item: ScheduleItem) => {
  const base = `schedule-item ${item.type}`;
  
  if (viewMode === 'team' || viewMode === 'filtered') {
    // Highlight current user's items
    const isMine = isAssignedToCurrentUser(item, userId);
    return `${base} ${isMine ? 'mine' : 'team'}`;
  }
  
  return base;
};
```

```css
/* Highlighting styles */
.schedule-item.mine {
  opacity: 1;
  border: 2px solid #06b6d4; /* bright cyan */
  box-shadow: 0 0 8px rgba(6, 182, 212, 0.4);
}

.schedule-item.team {
  opacity: 0.6;
}

/* Monthly view legend */
.schedule-legend {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.legend-color-box.mine {
  background: #06b6d4;
  border: 2px solid #06b6d4;
}

.legend-color-box.team {
  background: #4b5563;
  opacity: 0.6;
}
```

#### 4. Permission-Based Editing

**Edit Control Logic:**
```typescript
const canEdit = (item: ScheduleItem): boolean => {
  return canEditScheduleItem(userRole, item, userId);
};

const handleItemClick = (item: ScheduleItem) => {
  if (canEdit(item)) {
    openEditModal(item);
  } else {
    openViewOnlyModal(item);
  }
};
```

**Visual Indicators:**
```tsx
const ScheduleItemCard = ({ item, onClick }: Props) => {
  const { user, userRole } = useAuth();
  const editable = canEditScheduleItem(userRole, item, user.uid);
  
  return (
    <div
      className={`schedule-item ${item.type} ${!editable ? 'locked' : ''}`}
      onClick={onClick}
    >
      <div className="item-header">
        <span className="item-title">{item.title}</span>
        {!editable && (
          <Icon 
            name="lock" 
            className="lock-icon"
            title="Only admins can edit this item"
          />
        )}
      </div>
      {/* Rest of card */}
    </div>
  );
};
```

```css
.schedule-item.locked {
  cursor: default;
  opacity: 0.8;
}

.schedule-item.locked:hover {
  transform: none;
  box-shadow: none;
}

.lock-icon {
  color: #94a3b8;
  font-size: 0.875rem;
}
```

**Disable Drag for Non-Editable Items:**
```tsx
const isDraggable = (item: ScheduleItem): boolean => {
  return canEditScheduleItem(userRole, item, userId);
};

<Draggable
  key={item.id}
  draggableId={item.id}
  index={index}
  isDragDisabled={!isDraggable(item)}
>
  {/* Item content */}
</Draggable>
```

### Implementation Steps

**Phase 4A: Quick Filter UI (2-3 hours)**
1. Add view mode state and toggle buttons
2. Implement filter logic
3. Add status indicator
4. Save preference to localStorage
5. Test mode switching

**Phase 4B: Multi-Select Filter (2 hours)**
1. Create/integrate MultiSelect component
2. Add member selection UI
3. Implement filtering by selected members
4. Test with various combinations

**Phase 4C: Visual Highlighting (2-3 hours)**
1. Add color coding for mine vs team items
2. Create legend component
3. Apply opacity/border styles
4. Test in monthly and weekly views

**Phase 4D: Permission Controls (3-4 hours)**
1. Add canEditScheduleItem checks throughout
2. Show/hide edit UI based on permissions
3. Add lock icons to non-editable items
4. Disable drag for locked items
5. Show helpful tooltips

**Phase 4E: Integration Testing (2 hours)**
1. Test all view modes
2. Test permission edge cases
3. Test with different roles
4. Verify localStorage persistence

**Total Estimated Time:** 11-14 hours

---

## Implementation Order & Timeline

### Recommended Sequence

**Week 1: Foundation**
- Priority 1 (General vs Project Tasks) - 6-9 hours
- Start Priority 2A (Migration Prep) - 2-3 hours
- **Total:** ~10 hours

**Week 2: Multi-User Architecture**
- Priority 2B-2E (Complete migration) - 10-13 hours
- **Total:** ~12 hours

**Week 3: Schedule Integration**
- Priority 3A-3C (Data model + Auto-population + Daily Planner) - 10-14 hours
- **Total:** ~12 hours

**Week 4: Schedule Integration cont.**
- Priority 3D-3E (Progress tracking + Visual integration) - 7-9 hours
- Priority 4A-4B (Quick filters) - 4-5 hours
- **Total:** ~12 hours

**Week 5: Completion**
- Priority 4C-4E (Visual highlighting + Permissions + Testing) - 7-9 hours
- Integration testing across all features - 3-4 hours
- Documentation and cleanup - 2 hours
- **Total:** ~12 hours

**Total Project Time:** 56-73 hours (7-9 working days)

---

## Testing Strategy

### Unit Tests
- Permission functions
- Filter logic
- Date range calculations
- Schedule item type detection

### Integration Tests
- Task creation and conversion
- Project task association
- Schedule auto-population
- Role-based filtering

### User Acceptance Tests
- General task workflow
- Project task workflow
- Daily planning session
- Progress tracking
- Admin overview capabilities
- Permission edge cases

### Migration Tests
- Data integrity verification
- Rollback procedures
- Security rule validation
- Performance benchmarks

---

## Rollout Plan

### Phase 1: Internal Testing
- Deploy to staging environment
- Test with seed data
- Verify all features work
- Check performance

### Phase 2: Beta Testing
- Select 2-3 team members
- Run for 1 week
- Gather feedback
- Fix critical bugs

### Phase 3: Production Deployment
- Schedule maintenance window
- Run migration script
- Deploy new code
- Update security rules
- Monitor for issues

### Phase 4: Training
- Create user guide
- Record demo videos
- Host training session
- Provide support

---

## Risk Mitigation

### Data Migration Risks
- **Risk:** Data loss during migration
- **Mitigation:** Full backup, test migration script, phased rollout

### Performance Risks
- **Risk:** Slow queries with organization-wide collections
- **Mitigation:** Add indexes, optimize queries, implement pagination

### Permission Risks
- **Risk:** Users seeing data they shouldn't
- **Mitigation:** Comprehensive security rules, extensive testing

### User Adoption Risks
- **Risk:** Users confused by new features
- **Mitigation:** Gradual rollout, training materials, support

---

## Success Metrics

### Quantitative
- 100% data migration success rate
- < 500ms schedule view load time
- 0 permission violations
- < 5 bugs per week after launch

### Qualitative
- Users can find their tasks quickly
- Managers can oversee team work effectively
- Daily planning workflow is intuitive
- Schedule integration feels natural

---

## Future Enhancements

After completing these 4 priorities, consider:
- Gantt chart timeline view
- Task dependencies and critical path
- Notification system (email, push)
- Mobile app
- Offline support
- AI-powered task recommendations
- Advanced reporting and analytics

---

## Appendix

### Key Files to Modify

**Services:**
- `src/services/tasks.ts` - Add org-based queries, conversion functions
- `src/services/projects.ts` - Update to org collections
- `src/services/scheduling.ts` - New service for schedule blocks
- `src/services/permissions.ts` - New service (create)

**Hooks:**
- `src/hooks/useTasks.ts` - Update to org collections + role filtering
- `src/hooks/useProjects.ts` - Same as tasks
- `src/hooks/useScheduleItems.ts` - New hook (create)

**Components:**
- `src/components/views/TasksView.tsx` - Grouping, filters, conversions
- `src/components/views/ProjectsView.tsx` - Task counts, role toggles
- `src/components/views/ScheduleView.tsx` - Multi-type items, filters, permissions
- `src/components/DayPlannerModal.tsx` - New component (create)
- `src/components/TimerModal.tsx` - New component (create)

**Types:**
- `src/types.ts` - Add ScheduleBlock, update Task/Project types

**Utilities:**
- `src/utils/permissions.ts` - New utility (create)

**Scripts:**
- `scripts/migrate-to-organization-collections.mjs` - New script (create)

**Rules:**
- `firestore.rules` - Complete rewrite for org collections

---

**End of Implementation Plan**
