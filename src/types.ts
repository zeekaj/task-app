// src/types.ts
import type { Timestamp, FieldValue } from "firebase/firestore";

export type ProjectStatus = "not_started" | "planning" | "executing" | "post_event" | "completed" | "blocked" | "archived";
export type TaskStatus = "not_started" | "in_progress" | "done" | "blocked" | "archived";

// Firebase timestamp type for consistent usage
export type FirebaseTimestamp = Timestamp | FieldValue;

// Project status mode: 'auto' uses date-based status, 'manual' allows PM to set status
export type ProjectStatusMode = "auto" | "manual";

export interface Project {
  id?: string;
  title: string;
  status: ProjectStatus;
  statusMode?: ProjectStatusMode; // 'auto' or 'manual' - controls how status is computed
  assignee?: string; // user ID of the assigned individual (legacy single assignee)
  assignees?: string[]; // array of user IDs for multiple assignees
  owner?: string; // user ID of the project owner/lead
  projectManager?: string; // user ID of the project manager who can mark completed
  r2Number?: string; // R2# identifier
  installDate?: Timestamp | Date | string; // Install Date (due date for the project)
  prepDate?: Timestamp | Date | string; // Prep Date - when project moves to 'executing'
  shipDate?: Timestamp | Date | string; // Ship Date - when equipment ships out
  loadInDate?: Timestamp | Date | string; // Load-In Date - when equipment is loaded in at venue
  eventBeginDate?: Timestamp | Date | string; // Event Begin Date - when event starts
  eventEndDate?: Timestamp | Date | string; // Event End Date - when event ends
  strikeDate?: Timestamp | Date | string; // Strike Date - teardown/strike
  pickupDate?: Timestamp | Date | string; // Pickup Date - equipment pickup
  returnDate?: Timestamp | Date | string; // Return Date - when project moves to 'post_event'
  createdAt?: Timestamp | FieldValue;
  updatedAt?: Timestamp | FieldValue;
}

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

export interface TaskAssignee {
  id: string;
  name: string;
}

export type RecurrencePattern =
  | { type: "none" }
  | { type: "daily"; interval: number } // every N days
  | { type: "weekly"; interval: number; daysOfWeek: number[] } // every N weeks on [0-6]
  | { type: "monthly"; interval: number; dayOfMonth: number } // every N months on day X
  | { type: "custom"; rule: string }; // for future extensibility

export interface TaskAttachment {
  id: string;
  name: string;
  url: string;
  type: 'file' | 'link';
  uploadedAt: Timestamp | FieldValue;
  uploadedBy: string; // user id
}

export interface Task {
  id?: string;
  title: string;
  description?: string;
  projectId: string | null;
  status: TaskStatus;
  assignee?: string | TaskAssignee; // user ID or object
  priority: number; // 0..100 scale
  dueDate: string | null; // ISO string or null
  order?: number; // for custom ordering
  createdAt?: Timestamp | FieldValue;
  updatedAt?: Timestamp | FieldValue;
  subtasks?: Subtask[];
  dependencies?: string[]; // array of task IDs this task depends on
  recurrence?: RecurrencePattern; // recurrence rule for repeating tasks
  comments?: string; // notes or discussion
  attachments?: TaskAttachment[]; // files or links
}

export type BlockerStatus = "active" | "cleared";
export type BlockerEntityType = "task" | "project";

export interface Blocker {
  id?: string;
  reason: string;
  waitingOn: string;
  expectedDate: Timestamp | Date | null;
  status: BlockerStatus;
  entityId: string;
  entityType: BlockerEntityType;
  createdAt?: Timestamp;
  clearedAt?: Timestamp;
  clearedReason?: string;
  prevStatus?: TaskStatus | ProjectStatus | null;
  capturesPrev?: boolean;
}

export type WithId<T> = T & { id: string };

/** Activity/Audit Trail */
export type ActivityType = "created" | "updated" | "status_changed" | "assigned" | "blocked" | "unblocked" | "archived" | "deleted";
export type ActivityEntityType = "task" | "project" | "team";

export interface Activity {
  id?: string;
  entityType: ActivityEntityType;
  entityId: string;
  entityTitle: string;
  action: ActivityType;
  changes?: Record<string, { from: any; to: any; type?: string }>; // field changes with optional type info
  description?: string; // human-readable description
  userId: string; // who made the change
  userName?: string; // name of user who made the change
  createdAt: Timestamp | FieldValue;
}

/** Filters */
export type StatusFilter = "active" | "blocked" | "done" | "archived";
export type DueFilter = "any" | "overdue" | "today" | "week" | "month";
export interface TaskFilters {
  status: StatusFilter[];
  minPriority: number[]; // 0-100 range
  due: DueFilter[];
  assigned?: string[]; // filter by assigned user(s)
  includeArchived: boolean;
  groupBy?: "none" | "status" | "priority" | "due" | "assigned";
}

/** Team Members */
export type TeamMemberRole = "owner" | "admin" | "technician" | "freelance" | "viewer";

export interface SkillAssessment {
  audio?: number; // 0-10
  graphicDesign?: number;
  truckDriving?: number;
  video?: number;
  rigging?: number;
  lighting?: number;
  stageDesign?: number;
  electric?: number;
}

export interface TeamMember {
  id?: string;
  name: string;
  email: string;
  role: TeamMemberRole;
  organizationId: string; // The UID of the organization owner (admin who created this)
  title?: string; // Job title (e.g., "Audio Engineer", "Stage Manager")
  userId?: string; // Firebase Auth UID (set after first login)
  hasPassword?: boolean; // Whether user has completed first-time password setup
  invitedAt?: Timestamp | FieldValue; // When admin created the record
  lastLoginAt?: Timestamp | FieldValue; // Last login timestamp
  skills?: SkillAssessment; // Skill ratings 0-10
  availability?: number; // 0-100%
  workload?: number; // 0-100%
  viewerPermissions?: string[]; // For viewer role - what they can view
  avatar?: string; // Avatar URL
  active: boolean;
  createdAt?: Timestamp | FieldValue;
  updatedAt?: Timestamp | FieldValue;
}
