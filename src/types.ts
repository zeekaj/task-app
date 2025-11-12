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
  orderId?: string; // Same as R2#
  clientId?: string;
  venueId?: string;
  laborBudget?: {
    totalHours?: number;
    totalAmount?: number;
    byJobTitle?: Array<{
      jobTitle: JobTitle;
      budgetHours: number;
      budgetRate: number;
      budgetAmount: number;
    }>;
  };
  installDate?: Timestamp | Date | string; // Install Date (due date for the project)
  prepDate?: Timestamp | Date | string; // Prep Date - when project moves to 'executing'
  shipDate?: Timestamp | Date | string; // Ship Date - when equipment ships out
  loadInDate?: Timestamp | Date | string; // Load-In Date - when equipment is loaded in at venue
  eventBeginDate?: Timestamp | Date | string; // Event Begin Date - when event starts
  eventEndDate?: Timestamp | Date | string; // Event End Date - when event ends
  strikeDate?: Timestamp | Date | string; // Strike Date - teardown/strike
  pickupDate?: Timestamp | Date | string; // Pickup Date - equipment pickup
  returnDate?: Timestamp | Date | string; // Return Date - when project moves to 'post_event'
  // Post-event report (completed by PM)
  postEventReport?: PostEventReport;
  color?: string; // hex color for calendar display
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
  createdBy?: string; // user ID of the person who created the task
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
  clearedBy?: string; // userId of the person who cleared the blocker
  prevStatus?: TaskStatus | ProjectStatus | null;
  capturesPrev?: boolean;
}

export type WithId<T> = T & { id: string };

// Post-Event Report
export interface PostEventReport {
  summary: string;
  highlights?: string;
  issuesAndResolutions?: string;
  clientFeedback?: string;
  followUps?: string;
  budgetNotes?: string;
  status: 'draft' | 'submitted';
  // Checklist items - all required before signing
  documentsOrganized: boolean;
  photosUploaded: boolean;
  deliverablesDelivered: boolean;
  orderCleanedForInvoicing: boolean;
  signedById: string; // uid
  signedByName: string; // PM display name
  signatureImage?: string; // base64 image data from signature canvas
  signedAt: Timestamp | Date | string;
  // Owner approval (required before project can be marked complete)
  ownerReviewed?: boolean;
  ownerReviewedBy?: string; // uid of owner
  ownerReviewedByName?: string; // owner display name
  ownerReviewedAt?: Timestamp | Date | string;
  createdAt?: Timestamp | FieldValue;
  updatedAt?: Timestamp | FieldValue;
}

/** Activity/Audit Trail */
export type ActivityType = "created" | "updated" | "status_changed" | "assigned" | "blocked" | "unblocked" | "archived" | "deleted";
export type ActivityEntityType = "task" | "project" | "team" | "schedule";

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

/** Notifications */
export type NotificationType = 'post_event_report_submitted' | 'project_completed' | 'project_blocked';

export interface Notification {
  id?: string;
  type: NotificationType;
  title: string;
  message: string;
  recipientId: string; // uid of user who should receive this
  read: boolean;
  entityType: 'project' | 'task';
  entityId: string; // ID of related project/task
  entityTitle: string; // Title for quick reference
  createdAt: Timestamp | FieldValue;
  createdBy?: string; // uid of user who triggered the notification
  createdByName?: string; // name of user who triggered
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
  groupBy?: "none" | "status" | "priority" | "due" | "assigned" | "project";
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
  phone?: string; // Phone number in (123) 456-7890 format
  role: TeamMemberRole;
  jobTitle?: JobTitle; // Primary job title
  approvedPositions?: JobTitle[]; // All positions this member is approved to work
  employmentType: "W2_Salaried" | "W2_Hourly" | "1099";
  payProfile?: {
    type: "hourly" | "day_rate" | "salaried";
    baseRate?: number;
    dayRates?: {
      halfDay: { maxHours: number; rate: number };
      fullDay: { maxHours: number; rate: number };
      overtimeHourly?: number;
      doubleTimeHourly?: number;
    };
    shortTurnEnabled?: boolean;
  };
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

/** Scheduling */
export type ScheduleEventType = "event" | "shift" | "task";

export type ScheduleStatus = "tentative" | "hold" | "confirmed" | "published" | "canceled";

export interface ScheduleEvent {
  id?: string;
  organizationId: string; // Organization owner UID
  title: string;
  type: ScheduleEventType;
  start: Timestamp | FieldValue;
  end: Timestamp | FieldValue;
  status?: ScheduleStatus; // Tentative/hold/confirmed/published/canceled
  source?: "auto" | "manual"; // Whether this was generated automatically or by user
  location?: string;
  projectId?: string | null;
  taskId?: string | null;
  assignedMemberIds: string[]; // Array of teamMember IDs
  requiredSkills?: string[];
  notes?: string;
  createdBy: string; // User ID of creator
  createdAt?: Timestamp | FieldValue;
  updatedAt?: Timestamp | FieldValue;
}

/** Granular Shift Scheduling */
export type ShiftStatus = "draft" | "offered" | "confirmed" | "declined" | "completed" | "canceled";

export interface ShiftBreak {
  start: string; // HH:MM format
  end: string; // HH:MM format
  paid: boolean;
}

export interface Shift {
  id?: string;
  organizationId: string; // Organization owner UID
  title: string;
  projectId?: string | null; // Link to project if applicable
  taskId?: string | null; // Link to specific task if applicable
  
  // Date and time
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM (24-hour format)
  endTime: string; // HH:MM (24-hour format)
  breaks?: ShiftBreak[]; // Break periods
  
  // Location
  location?: string; // Venue/site name
  venueId?: string; // Link to venue document
  address?: string; // Full address if different from venue
  
  // Staffing
  assignedMemberId?: string; // Single team member assigned
  jobTitle?: JobTitle; // Required job title/role
  requiredSkills?: string[]; // Required skills for this shift
  
  // Billing and hours tracking
  estimatedHours?: number; // Expected duration
  actualHours?: number; // Actual hours worked (for completed shifts)
  billableToClient?: boolean; // Whether this is client-billable
  
  // Status and workflow
  status: ShiftStatus;
  confirmedAt?: Timestamp | FieldValue; // When member confirmed
  completedAt?: Timestamp | FieldValue; // When marked complete
  
  // Additional info
  notes?: string; // Internal notes
  instructions?: string; // Instructions for assigned member
  callTime?: string; // HH:MM - earlier call time if different from start
  wrapTime?: string; // HH:MM - expected wrap time if different from end
  
  // Metadata
  createdBy: string; // User ID of creator
  createdAt?: Timestamp | FieldValue;
  updatedAt?: Timestamp | FieldValue;
}

/** Shift template for quick shift creation */
export interface ShiftTemplate {
  id?: string;
  organizationId: string;
  name: string; // e.g., "Load-in Crew", "Event Tech", "Strike Team"
  description?: string;
  defaultDuration: number; // Hours
  defaultJobTitle?: JobTitle;
  defaultPayType?: "hourly" | "day_rate" | "flat_rate";
  defaultPayRate?: number;
  requiredSkills?: string[];
  defaultBreaks?: ShiftBreak[];
  instructions?: string;
  active: boolean;
  createdAt?: Timestamp | FieldValue;
  updatedAt?: Timestamp | FieldValue;
}

export interface Client {
  id?: string;
  name: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  billingNotes?: string;
  active: boolean;
  createdAt?: Timestamp | FieldValue;
  updatedAt?: Timestamp | FieldValue;
}

export interface Venue {
  id?: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  lat?: number;
  lng?: number;
  contactName?: string;
  contactPhone?: string;
  loadInNotes?: string;
  active: boolean;
  createdAt?: Timestamp | FieldValue;
  updatedAt?: Timestamp | FieldValue;
}

export type JobTitle = "A1" | "A2" | "V1" | "V2" | "LD" | "ME" | "TD" | "Stagehand" | "Show Producer" | "vMix Op";

export interface JobTitleDoc {
  id?: string;
  name: string;
  active: boolean;
  createdAt?: Timestamp | FieldValue;
  updatedAt?: Timestamp | FieldValue;
}
