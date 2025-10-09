// src/types.ts
import type { Timestamp, FieldValue } from "firebase/firestore";

export type ProjectStatus = "not_started" | "in_progress" | "blocked" | "completed" | "archived";
export type TaskStatus = "not_started" | "in_progress" | "done" | "blocked" | "archived";

export interface Project {
  id?: string;
  title: string;
  status: ProjectStatus;
  assignee?: string; // user ID of the assigned individual
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
  priority: number; // 0..4
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

/** Filters */
export type StatusFilter = "active" | "blocked" | "done" | "archived";
export type DueFilter = "any" | "overdue" | "today" | "week";
export interface TaskFilters {
  status: StatusFilter[];
  minPriority: (0 | 1 | 2 | 3 | 4)[];
  due: DueFilter[];
  assigned?: string[]; // filter by assigned user(s)
  includeArchived: boolean;
  groupBy?: "none" | "status" | "priority" | "due" | "assigned";
}
