// src/types.ts
import type { Timestamp } from "firebase/firestore";

export type ProjectStatus = "in_progress" | "blocked" | "completed" | "archived";
export type TaskStatus = "not_started" | "in_progress" | "done" | "blocked" | "archived";

export interface Project {
  id?: string;
  title: string;
  status: ProjectStatus;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface Task {
  id?: string;
  title: string;
  description?: string;
  projectId: string | null;
  status: TaskStatus;
  priority: number; // 0..4
  dueDate: string | null; // ISO string or null
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
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

/** Entity types for modal operations */
export interface BlockableEntity {
  id: string;
  title: string;
  type: BlockerEntityType;
}

export interface PromotableTask {
  id: string;
  title: string;
}

/** Modal state types */
export interface ModalState {
  type: null | "block" | "manage_blockers";
  target: BlockableEntity | null;
}

/** Filters */
export type StatusFilter = "all" | "active" | "blocked" | "done" | "archived";
export type DueFilter = "any" | "overdue" | "today" | "week";
export interface TaskFilters {
  status: StatusFilter;
  minPriority: 0 | 1 | 2 | 3 | 4;
  due: DueFilter;
  includeArchived: boolean;
}
