// src/components/TaskItem.tsx
import React, { useState, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import type { Task, Blocker, WithId, Project } from "../types";
import { useAllBlockers } from "../hooks/useBlockers";
import { useTeamMembers } from "../hooks/useTeamMembers";
import { updateTask, convertTaskToProject } from "../services/tasks";
import Icon from "./Icon";
import { useClickOutside } from "../hooks/useClickOutside";
// ConfirmModal removed from TaskItem; parent views handle confirmations

const taskStatusConfig: { [key in Task["status"]]: { label: string; classes: string } } = {
  not_started: { label: "Not Started", classes: "bg-white/5 hover:bg-white/10 border-white/10" },
  in_progress: { label: "In Progress", classes: "bg-brand-cyan/10 hover:bg-brand-cyan/20 border-brand-cyan/30" },
  done: { label: "Done", classes: "bg-brand-success/10 hover:bg-brand-success/20 border-brand-success/30" },
  blocked: { label: "Blocked", classes: "bg-red-500/10 hover:bg-red-500/20 border-red-500/30" },
  archived: { label: "Archived", classes: "bg-gray-800/50 border-gray-700/50 opacity-60" },
};

// Helper to get priority label from 0-100 value
const getPriorityLabel = (priority: number): string => {
  if (priority === 0) return "None";
  if (priority < 25) return "Very Low";
  if (priority < 50) return "Low";
  if (priority < 75) return "Medium";
  if (priority < 90) return "High";
  return "Urgent";
};

// Helper to get background gradient for priority badge
const getPriorityBgGradient = (priority: number): string => {
  if (priority === 0) return "bg-gray-700";
  if (priority < 25) return "bg-gradient-to-r from-gray-400 via-gray-500 to-gray-600";
  if (priority < 50) return "bg-gradient-to-r from-brand-violet via-blue-400 to-brand-cyan";
  if (priority < 75) return "bg-gradient-to-r from-brand-cyan via-green-400 to-brand-success";
  if (priority < 90) return "bg-gradient-to-r from-brand-success via-yellow-400 to-brand-warning";
  return "bg-gradient-to-r from-brand-warning via-orange-500 to-red-500";
};

interface TaskItemProps {
  uid: string;
  task: WithId<Task>;
  allBlockers?: WithId<Blocker>[];
  allTasks?: WithId<Task>[];
  allProjects?: WithId<Project>[];
  onStartEdit: () => void;
  // onStartPromote removed
  onManageBlockers: () => void;
  onStartBlock: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onUnarchive: () => void;
  onStatusChange: (newStatus: Task["status"]) => void;
  onUndo: () => Promise<boolean>;
  onProjectClick?: (project: WithId<Project>) => void;
  dragHandleProps?: React.HTMLAttributes<HTMLSpanElement>;
  crossListDragHandleProps?: React.HTMLAttributes<HTMLSpanElement>;
  searchQuery?: string;
}

export const TaskItem: React.FC<TaskItemProps> = ({ uid, task, allBlockers, allTasks = [], allProjects = [], onStartEdit, onManageBlockers, onStartBlock, onArchive, onDelete, onUnarchive, onStatusChange, onUndo, onProjectClick, searchQuery = '' }) => {
  const hookAllBlockers = useAllBlockers(uid);
  const safeAllBlockers = allBlockers ?? hookAllBlockers;
  const teamMembers = useTeamMembers(uid);
  
  // Find project info if task has projectId
  const project = useMemo(() => {
    if (!task.projectId) return null;
    return allProjects.find(p => p.id === task.projectId);
  }, [task.projectId, allProjects]);
  
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [statusDropdownPos, setStatusDropdownPos] = useState<{ top: number; left: number } | null>(null);
  const [editingDueDate, setEditingDueDate] = useState(false);
  // removed unused editingAssignee state
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const [assigneeDropdownPos, setAssigneeDropdownPos] = useState<{ top: number; left: number } | null>(null);
  const [showProjectSelector, setShowProjectSelector] = useState(false);
  const [projectSelectorPos, setProjectSelectorPos] = useState<{ top: number; left: number } | null>(null);
  const [showPrioritySlider, setShowPrioritySlider] = useState(false);
  const [tempPriority, setTempPriority] = useState(task.priority);
  const [tempDueDate, setTempDueDate] = useState(task.dueDate || "");
  const [tempAssignee, setTempAssignee] = useState(
    typeof task.assignee === "string" ? task.assignee : task.assignee?.name || ""
  );
  const prioritySliderRef = useRef<HTMLDivElement>(null);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const statusButtonRef = useRef<HTMLButtonElement>(null);
  const assigneeButtonRef = useRef<HTMLSpanElement>(null);
  const assigneeDropdownRef = useRef<HTMLDivElement>(null);
  const projectSelectorRef = useRef<HTMLDivElement>(null);
  const projectButtonRef = useRef<HTMLButtonElement>(null);
  const priorityHideTimeoutRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);
  
  // Position status dropdown when it opens
  React.useEffect(() => {
    if (showStatusDropdown && statusButtonRef.current) {
      const rect = statusButtonRef.current.getBoundingClientRect();
      setStatusDropdownPos({ top: rect.bottom + 4, left: rect.left });
    } else {
      setStatusDropdownPos(null);
    }
  }, [showStatusDropdown]);
  
  // Position assignee dropdown when it opens
  React.useEffect(() => {
    if (showAssigneeDropdown && assigneeButtonRef.current) {
      const rect = assigneeButtonRef.current.getBoundingClientRect();
      setAssigneeDropdownPos({ top: rect.bottom + 4, left: rect.left });
    } else {
      setAssigneeDropdownPos(null);
    }
  }, [showAssigneeDropdown]);
  
  // Position project selector when it opens
  React.useEffect(() => {
    if (showProjectSelector && projectButtonRef.current) {
      const rect = projectButtonRef.current.getBoundingClientRect();
      setProjectSelectorPos({ top: rect.bottom + 4, left: rect.left });
    } else {
      setProjectSelectorPos(null);
    }
  }, [showProjectSelector]);
  
  // Close priority slider when clicking outside
  useClickOutside({
    enabled: showPrioritySlider,
    onClickOutside: () => setShowPrioritySlider(false),
    selector: `[data-priority-slider="${task.id}"]`
  });

  // Close status dropdown when clicking outside
  useClickOutside({
    enabled: showStatusDropdown,
    onClickOutside: () => setShowStatusDropdown(false),
    selector: `[data-status-dropdown-menu="${task.id}"]`
  });
  
  // Close assignee dropdown when clicking outside
  useClickOutside({
    enabled: showAssigneeDropdown,
    onClickOutside: () => {
      setShowAssigneeDropdown(false);
    },
    selector: `[data-assignee-dropdown-menu="${task.id}"]`
  });
  
  // Close project selector when clicking outside
  useClickOutside({
    enabled: showProjectSelector,
    onClickOutside: () => {
      setShowProjectSelector(false);
    },
    selector: `[data-project-selector="${task.id}"]`
  });

  // Update temp priority when task priority changes
  React.useEffect(() => {
    setTempPriority(task.priority);
  }, [task.priority]);

  // Helper to handle priority slider mouse leave with delay
  const handlePriorityMouseLeave = () => {
    if (priorityHideTimeoutRef.current) {
      window.clearTimeout(priorityHideTimeoutRef.current);
    }
    priorityHideTimeoutRef.current = setTimeout(() => {
      setShowPrioritySlider(false);
    }, 100);
  };

  const handlePriorityMouseEnter = () => {
    if (priorityHideTimeoutRef.current) {
      window.clearTimeout(priorityHideTimeoutRef.current);
      priorityHideTimeoutRef.current = null;
    }
    setShowPrioritySlider(true);
  };

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (priorityHideTimeoutRef.current) {
        window.clearTimeout(priorityHideTimeoutRef.current);
      }
    };
  }, []);

  // Handle priority update
  const handlePriorityUpdate = async (newPriority: number) => {
    if (newPriority !== task.priority) {
      await updateTask(uid, task.id, { priority: newPriority });
    }
  };
  
  // Memoized calculations to prevent expensive operations on every render
  const createdAtTs = (task as any).createdAt ? String((task as any).createdAt?.seconds ?? (task as any).createdAt?.toDate?.().getTime() ?? '') : '';
  const updatedAtTs = (task as any).updatedAt ? String((task as any).updatedAt?.seconds ?? (task as any).updatedAt?.toDate?.().getTime() ?? '') : '';
  const dateInfo = useMemo(() => {
    const dueDateObj = task.dueDate ? new Date(task.dueDate) : null;
    const createdAtObj = (task as any).createdAt?.toDate ? (task as any).createdAt.toDate() : null;
    const updatedAtObj = (task as any).updatedAt?.toDate ? (task as any).updatedAt.toDate() : null;
    
    const wasUpdated = updatedAtObj && createdAtObj && updatedAtObj.getTime() - createdAtObj.getTime() > 60000;
    const latestDateObj = wasUpdated ? updatedAtObj : createdAtObj;
    
    return {
      dueDateObj,
      createdAtObj,
      updatedAtObj,
      latestDateString: latestDateObj && typeof latestDateObj.toLocaleDateString === "function"
        ? latestDateObj.toLocaleDateString(undefined, { month: "short", day: "numeric" })
        : "",
      dueDateString: dueDateObj && typeof dueDateObj.toLocaleDateString === "function"
        ? dueDateObj.toLocaleDateString(undefined, { month: "short", day: "numeric" })
        : "",
    };
  }, [task.dueDate, createdAtTs, updatedAtTs]); // eslint-disable-line react-hooks/exhaustive-deps

  // Memoized status calculations
  const statusInfo = useMemo(() => {
    const isBlocked = task.status === "blocked";
    const isArchived = task.status === "archived";
    const activeTaskBlockers = isBlocked
      ? safeAllBlockers.filter((b) => b.entityId === task.id && b.status === "active")
      : [];
    
    return { isBlocked, isArchived, activeTaskBlockers };
  }, [task.status, task.id, safeAllBlockers]);

  // Memoized subtask calculations
  const subtaskInfo = useMemo(() => {
    const subtaskCount = Array.isArray(task.subtasks) ? task.subtasks.length : 0;
    const subtaskDone = Array.isArray(task.subtasks) ? task.subtasks.filter(s => s.done).length : 0;
    return { subtaskCount, subtaskDone };
  }, [task.subtasks]);



  // Handle due date update
  const handleDueDateUpdate = async () => {
    const dueDateValue = tempDueDate.trim() ? tempDueDate : null;
    if (dueDateValue !== task.dueDate) {
      await updateTask(uid, task.id, { dueDate: dueDateValue });
    }
    setEditingDueDate(false);
  };

  // Handle assignee update
  const handleAssigneeUpdate = async () => {
    const assigneeValue = tempAssignee.trim() || undefined;
    const currentAssignee = typeof task.assignee === "string" ? task.assignee : task.assignee?.name || undefined;
    if (assigneeValue !== currentAssignee) {
      await updateTask(uid, task.id, { assignee: assigneeValue });
    }
  };

  // Handle converting task to project task
  const handleConvertToProject = async (projectId: string) => {
    try {
      const selectedProject = allProjects.find(p => p.id === projectId);
      await convertTaskToProject(uid, task.id, projectId, selectedProject?.title);
      setShowProjectSelector(false);
    } catch (error) {
      console.error("Failed to convert task to project:", error);
      // Could show a toast notification here
    }
  };

  const statusClasses =
    taskStatusConfig[task.status as Task["status"]]?.classes ||
    taskStatusConfig.not_started.classes;

  // Inline edit state
  const [editingInline, setEditingInline] = useState(false);
  const [inlineTitle, setInlineTitle] = useState(task.title);
  const inputRef = useRef<HTMLInputElement>(null);

  // Commit inline edit
  const commitInlineEdit = async () => {
    if (typeof inlineTitle === "string" && inlineTitle.trim() && inlineTitle !== task.title) {
      await updateTask(uid, task.id, { title: inlineTitle.trim() });
    }
    setEditingInline(false);
  };

  // Consolidated click outside handlers using custom hook
  useClickOutside({
    enabled: editingInline,
    onClickOutside: () => {
      if (inputRef.current) {
        commitInlineEdit();
      }
    }
  });

  useClickOutside({
    enabled: editingDueDate,
    onClickOutside: handleDueDateUpdate,
    selector: 'input[type="date"]'
  });

  // Highlight helper: splits text and wraps matches
  const highlightText = (text: string | undefined | null) => {
    if (!text) return text;
    const q = searchQuery.trim();
    if (!q) return text;
    try {
      const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'ig');
      const parts: React.ReactNode[] = [];
      let lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = regex.exec(text)) !== null) {
        const start = match.index;
        const end = regex.lastIndex;
        if (start > lastIndex) {
          parts.push(text.slice(lastIndex, start));
        }
        const matched = text.slice(start, end);
        parts.push(
          <mark
            key={start + '-' + end}
            className="bg-brand-warning/30 text-brand-warning px-0.5 rounded-sm"
          >
            {matched}
          </mark>
        );
        lastIndex = end;
        // Avoid infinite loops with zero-length matches
        if (start === end) break;
      }
      if (lastIndex < text.length) {
        parts.push(text.slice(lastIndex));
      }
      return parts;
    } catch (e) {
      (async () => { const { logError } = await import('../utils/logger'); logError('highlightText error', e); })();
      return text;
    }
  };

  // Get search match snippet with context
  const getMatchSnippet = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return null;

    // Check if title matches - if so, no snippet needed
    if (task.title.toLowerCase().includes(q)) return null;

    // Check description
    if (task.description && task.description.toLowerCase().includes(q)) {
      const index = task.description.toLowerCase().indexOf(q);
      const start = Math.max(0, index - 40);
      const end = Math.min(task.description.length, index + q.length + 40);
      const snippet = (start > 0 ? '...' : '') + task.description.slice(start, end) + (end < task.description.length ? '...' : '');
      return { source: 'Description', text: snippet };
    }

    // Check comments
    if (task.comments && task.comments.toLowerCase().includes(q)) {
      const index = task.comments.toLowerCase().indexOf(q);
      const start = Math.max(0, index - 40);
      const end = Math.min(task.comments.length, index + q.length + 40);
      const snippet = (start > 0 ? '...' : '') + task.comments.slice(start, end) + (end < task.comments.length ? '...' : '');
      return { source: 'Note', text: snippet };
    }

    // Check subtasks
    if (task.subtasks) {
      for (const sub of task.subtasks) {
        if (sub.title.toLowerCase().includes(q)) {
          return { source: 'Subtask', text: sub.title };
        }
      }
    }

    return null;
  }, [task.title, task.description, task.comments, task.subtasks, searchQuery]);

  return (
      <div
        className={`flex items-stretch border rounded-lg shadow-sm transition-shadow backdrop-blur-sm ${statusClasses} text-brand-text max-w-full overflow-hidden`}
        onClick={e => {
          if (statusInfo.isArchived || editingInline) return;
          const target = e.target as Element;
          // If the click originated from an interactive control, do nothing
          if (target.closest('button, a, input, textarea, select, [data-status-dropdown], [data-status-dropdown-menu], [data-priority-slider]')) return;
          onStartEdit();
        }}
      >
        <div className="flex flex-1 items-stretch min-w-0">
          <div className="flex w-full min-w-0">
            {/* Left cell: status / blockers */}
            <div
              className="flex-shrink-0 flex items-center justify-center h-full transition-all duration-300 dark:bg-black bg-black bg-opacity-5 rounded-l-lg p-1 relative"
              data-status-dropdown={task.id}
              onClick={statusInfo.isBlocked ? (e) => { e.stopPropagation(); onManageBlockers(); } : undefined}
              style={{
                background: statusInfo.isBlocked ? undefined : 'transparent',
                justifyContent: 'flex-start',
                width: statusInfo.isBlocked ? '100px' : '36px',
                minWidth: statusInfo.isBlocked ? '100px' : '36px',
                maxWidth: statusInfo.isBlocked ? '300px' : '36px',
                height: '100%',
                position: 'relative',
                zIndex: showStatusDropdown ? 50 : 1,
                cursor: statusInfo.isBlocked ? 'pointer' : 'default',
                alignItems: 'center',
                display: 'flex',
              }}
            >
              {statusInfo.isBlocked ? (
                <div className="text-left w-full">
                  <div className="text-sm font-bold text-red-400 mb-1">BLOCKED</div>
                  <div className="space-y-1 text-xs text-red-300">
                    {statusInfo.activeTaskBlockers.slice(0, 2).map((b) => (
                      <span key={b.id} className="block truncate" title={typeof b.reason === "object" ? JSON.stringify(b.reason) : b.reason}>
                        {typeof b.reason === "object" ? JSON.stringify(b.reason) : b.reason}
                      </span>
                    ))}
                    {statusInfo.activeTaskBlockers.length > 2 && (
                      <span className="block font-semibold">...and {statusInfo.activeTaskBlockers.length - 2} more</span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="relative flex items-center" data-status-dropdown-menu={task.id}>
                  {/* Current status icon - click to show dropdown */}
                  <button
                    ref={statusButtonRef}
                    type="button"
                    className="p-1 rounded-full transition-all duration-200 relative z-10"
                    title={`Status: ${taskStatusConfig[task.status].label} - Click to change`}
                    disabled={statusInfo.isArchived}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowStatusDropdown(!showStatusDropdown);
                    }}
                  >
                    {task.status === "not_started" && (
                      <span className="inline-flex items-center justify-center rounded-full bg-gray-200 w-6 h-6">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-5 h-5 text-gray-700">
                          <path d="M376 88C376 57.1 350.9 32 320 32C289.1 32 264 57.1 264 88C264 118.9 289.1 144 320 144C350.9 144 376 118.9 376 88zM400 300.7L446.3 363.1C456.8 377.3 476.9 380.3 491.1 369.7C505.3 359.1 508.3 339.1 497.7 324.9L427.2 229.9C402 196 362.3 176 320 176C277.7 176 238 196 212.8 229.9L142.3 324.9C131.8 339.1 134.7 359.1 148.9 369.7C163.1 380.3 183.1 377.3 193.7 363.1L240 300.7L240 576C240 593.7 254.3 608 272 608C289.7 608 304 593.7 304 576L304 416C304 407.2 311.2 400 320 400C328.8 400 336 407.2 336 416L336 576C336 593.7 350.3 608 368 608C385.7 608 400 593.7 400 576L400 300.7z"/>
                        </svg>
                      </span>
                    )}
                    {task.status === "in_progress" && (
                      <span className="inline-flex items-center justify-center rounded-full bg-blue-300 w-6 h-6">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-5 h-5 text-blue-500">
                          <path d="M352.5 32C383.4 32 408.5 57.1 408.5 88C408.5 118.9 383.4 144 352.5 144C321.6 144 296.5 118.9 296.5 88C296.5 57.1 321.6 32 352.5 32zM219.6 240C216.3 240 213.4 242 212.2 245L190.2 299.9C183.6 316.3 165 324.3 148.6 317.7C132.2 311.1 124.2 292.5 130.8 276.1L152.7 221.2C163.7 193.9 190.1 176 219.6 176L316.9 176C345.4 176 371.7 191.1 386 215.7L418.8 272L480.4 272C498.1 272 512.4 286.3 512.4 304C512.4 321.7 498.1 336 480.4 336L418.8 336C396 336 375 323.9 363.5 304.2L353.5 287.1L332.8 357.5L408.2 380.1C435.9 388.4 450 419.1 438.3 445.6L381.7 573C374.5 589.2 355.6 596.4 339.5 589.2C323.4 582 316.1 563.1 323.3 547L372.5 436.2L276.6 407.4C243.9 397.6 224.6 363.7 232.9 330.6L255.6 240L219.7 240zM211.6 421C224.9 435.9 242.3 447.3 262.8 453.4L267.5 454.8L260.6 474.1C254.8 490.4 244.6 504.9 231.3 515.9L148.9 583.8C135.3 595 115.1 593.1 103.9 579.5C92.7 565.9 94.6 545.7 108.2 534.5L190.6 466.6C195.1 462.9 198.4 458.1 200.4 452.7L211.6 421z"/>
                        </svg>
                      </span>
                    )}
                    {task.status === "done" && (
                      <span className="inline-flex items-center justify-center rounded-full bg-green-300 w-6 h-6">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-5 h-5 text-green-600">
                          <path d="M280 88C280 57.1 254.9 32 224 32C193.1 32 168 57.1 168 88C168 118.9 193.1 144 224 144C254.9 144 280 118.9 280 88zM304 300.7L341 350.6C353.8 333.1 369.5 317.9 387.3 305.6L331.1 229.9C306 196 266.3 176 224 176C181.7 176 142 196 116.8 229.9L46.3 324.9C35.8 339.1 38.7 359.1 52.9 369.7C67.1 380.3 87.1 377.3 97.7 363.1L144 300.7L144 576C144 593.7 158.3 608 176 608C193.7 608 208 593.7 208 576L208 416C208 407.2 215.2 400 224 400C232.8 400 240 407.2 240 416L240 576C240 593.7 254.3 608 272 608C289.7 608 304 593.7 304 576L304 300.7zM640 464C640 384.5 575.5 320 496 320C416.5 320 352 384.5 352 464C352 543.5 416.5 608 496 608C575.5 608 640 543.5 640 464zM553.4 403.1C560.5 408.3 562.1 418.3 556.9 425.4L492.9 513.4C490.1 517.2 485.9 519.6 481.2 519.9C476.5 520.2 471.9 518.6 468.6 515.3L428.6 475.3C422.4 469.1 422.4 458.9 428.6 452.7C434.8 446.5 445 446.5 451.2 452.7L478 479.5L531 406.6C536.2 399.5 546.2 397.9 553.4 403.1z"/>
                        </svg>
                      </span>
                    )}
                    {task.status === "blocked" && (
                      <span className="inline-flex items-center justify-center rounded-full bg-red-300 w-6 h-6">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-5 h-5 text-red-600">
                          <path d="M288 64C305.7 64 320 78.3 320 96L320 101.4C320 156.6 296.3 208.4 256.1 244.5L319 320L408 320C423.1 320 437.3 327.1 446.4 339.2L489.6 396.8C500.2 410.9 497.3 431 483.2 441.6C469.1 452.2 449 449.3 438.4 435.2L400 384L295.2 384L408.8 523.8C419.9 537.5 417.9 557.7 404.1 568.8C390.3 579.9 370.2 577.9 359.1 564.1L169.4 330.6C163.3 345.6 160 361.9 160 378.6L160 448C160 465.7 145.7 480 128 480C110.3 480 96 465.7 96 448L96 378.6C96 311.2 131.4 248.7 189.2 214L193.8 211.2C232.4 188 256 146.4 256 101.4L256 96C256 78.3 270.3 64 288 64zM48 152C48 121.1 73.1 96 104 96C134.9 96 160 121.1 160 152C160 182.9 134.9 208 104 208C73.1 208 48 182.9 48 152zM424 144.1C424 157.4 413.3 168.1 400 168.1C386.7 168.1 376 157.4 376 144.1L376 96.1C376 82.8 386.7 72.1 400 72.1C413.3 72.1 424 82.8 424 96.1L424 144.1zM528 296.1C514.7 296.1 504 285.4 504 272.1C504 258.8 514.7 248.1 528 248.1L576 248.1C589.3 248.1 600 258.8 600 272.1C600 285.4 589.3 296.1 576 296.1L528 296.1zM473.5 198.6C464.1 189.2 464.1 174 473.5 164.7L507.4 130.8C516.8 121.4 532 121.4 541.3 130.8C550.6 140.2 550.7 155.4 541.3 164.7L507.4 198.6C498 208 482.8 208 473.5 198.6z"/>
                        </svg>
                      </span>
                    )}
                  </button>
                  
                  {/* Dropdown menu with other status options - rendered via portal to escape overflow:hidden */}
                  {showStatusDropdown && createPortal(
                    <div
                      ref={statusDropdownRef}
                      data-status-dropdown-menu={task.id}
                      className="fixed bg-gray-800/40 border border-brand-cyan/50 rounded-2xl shadow-xl py-1 z-[9999] min-w-[140px] backdrop-blur-xl"
                      style={{ 
                        top: statusDropdownPos ? `${statusDropdownPos.top}px` : '0px',
                        left: statusDropdownPos ? `${statusDropdownPos.left}px` : '0px'
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {task.status !== "not_started" && (
                        <button
                          type="button"
                          className="w-full px-3 py-2 text-left hover:bg-brand-cyan/10 flex items-center gap-2 text-sm text-brand-text"
                          onClick={() => {
                            onStatusChange("not_started");
                            setShowStatusDropdown(false);
                          }}
                        >
                          <span className="inline-flex items-center justify-center rounded-full bg-gray-200 w-5 h-5">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-4 h-4 text-gray-700">
                              <path d="M376 88C376 57.1 350.9 32 320 32C289.1 32 264 57.1 264 88C264 118.9 289.1 144 320 144C350.9 144 376 118.9 376 88zM400 300.7L446.3 363.1C456.8 377.3 476.9 380.3 491.1 369.7C505.3 359.1 508.3 339.1 497.7 324.9L427.2 229.9C402 196 362.3 176 320 176C277.7 176 238 196 212.8 229.9L142.3 324.9C131.8 339.1 134.7 359.1 148.9 369.7C163.1 380.3 183.1 377.3 193.7 363.1L240 300.7L240 576C240 593.7 254.3 608 272 608C289.7 608 304 593.7 304 576L304 416C304 407.2 311.2 400 320 400C328.8 400 336 407.2 336 416L336 576C336 593.7 350.3 608 368 608C385.7 608 400 593.7 400 576L400 300.7z"/>
                            </svg>
                          </span>
                          Not Started
                        </button>
                      )}
                      {task.status !== "in_progress" && (
                        <button
                          type="button"
                          className="w-full px-3 py-2 text-left hover:bg-brand-cyan/10 flex items-center gap-2 text-sm text-brand-text"
                          onClick={() => {
                            onStatusChange("in_progress");
                            setShowStatusDropdown(false);
                          }}
                        >
                          <span className="inline-flex items-center justify-center rounded-full bg-blue-300 w-5 h-5">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-4 h-4 text-blue-500">
                              <path d="M352.5 32C383.4 32 408.5 57.1 408.5 88C408.5 118.9 383.4 144 352.5 144C321.6 144 296.5 118.9 296.5 88C296.5 57.1 321.6 32 352.5 32zM219.6 240C216.3 240 213.4 242 212.2 245L190.2 299.9C183.6 316.3 165 324.3 148.6 317.7C132.2 311.1 124.2 292.5 130.8 276.1L152.7 221.2C163.7 193.9 190.1 176 219.6 176L316.9 176C345.4 176 371.7 191.1 386 215.7L418.8 272L480.4 272C498.1 272 512.4 286.3 512.4 304C512.4 321.7 498.1 336 480.4 336L418.8 336C396 336 375 323.9 363.5 304.2L353.5 287.1L332.8 357.5L408.2 380.1C435.9 388.4 450 419.1 438.3 445.6L381.7 573C374.5 589.2 355.6 596.4 339.5 589.2C323.4 582 316.1 563.1 323.3 547L372.5 436.2L276.6 407.4C243.9 397.6 224.6 363.7 232.9 330.6L255.6 240L219.7 240zM211.6 421C224.9 435.9 242.3 447.3 262.8 453.4L267.5 454.8L260.6 474.1C254.8 490.4 244.6 504.9 231.3 515.9L148.9 583.8C135.3 595 115.1 593.1 103.9 579.5C92.7 565.9 94.6 545.7 108.2 534.5L190.6 466.6C195.1 462.9 198.4 458.1 200.4 452.7L211.6 421z"/>
                            </svg>
                          </span>
                          In Progress
                        </button>
                      )}
                      {task.status !== "done" && (
                        <button
                          type="button"
                          className="w-full px-3 py-2 text-left hover:bg-brand-cyan/10 flex items-center gap-2 text-sm text-brand-text"
                          onClick={() => {
                            onStatusChange("done");
                            setShowStatusDropdown(false);
                          }}
                        >
                          <span className="inline-flex items-center justify-center rounded-full bg-green-300 w-5 h-5">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-4 h-4 text-green-600">
                              <path d="M280 88C280 57.1 254.9 32 224 32C193.1 32 168 57.1 168 88C168 118.9 193.1 144 224 144C254.9 144 280 118.9 280 88zM304 300.7L341 350.6C353.8 333.1 369.5 317.9 387.3 305.6L331.1 229.9C306 196 266.3 176 224 176C181.7 176 142 196 116.8 229.9L46.3 324.9C35.8 339.1 38.7 359.1 52.9 369.7C67.1 380.3 87.1 377.3 97.7 363.1L144 300.7L144 576C144 593.7 158.3 608 176 608C193.7 608 208 593.7 208 576L208 416C208 407.2 215.2 400 224 400C232.8 400 240 407.2 240 416L240 576C240 593.7 254.3 608 272 608C289.7 608 304 593.7 304 576L304 300.7zM640 464C640 384.5 575.5 320 496 320C416.5 320 352 384.5 352 464C352 543.5 416.5 608 496 608C575.5 608 640 543.5 640 464zM553.4 403.1C560.5 408.3 562.1 418.3 556.9 425.4L492.9 513.4C490.1 517.2 485.9 519.6 481.2 519.9C476.5 520.2 471.9 518.6 468.6 515.3L428.6 475.3C422.4 469.1 422.4 458.9 428.6 452.7C434.8 446.5 445 446.5 451.2 452.7L478 479.5L531 406.6C536.2 399.5 546.2 397.9 553.4 403.1z"/>
                            </svg>
                          </span>
                          Done
                        </button>
                      )}
                      {task.status !== "blocked" && (
                        <button
                          type="button"
                          className="w-full px-3 py-2 text-left hover:bg-brand-cyan/10 flex items-center gap-2 text-sm text-brand-text"
                          onClick={() => {
                            onStartBlock();
                            setShowStatusDropdown(false);
                          }}
                        >
                          <span className="inline-flex items-center justify-center rounded-full bg-red-300 w-5 h-5">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-4 h-4 text-red-600">
                              <path d="M288 64C305.7 64 320 78.3 320 96L320 101.4C320 156.6 296.3 208.4 256.1 244.5L319 320L408 320C423.1 320 437.3 327.1 446.4 339.2L489.6 396.8C500.2 410.9 497.3 431 483.2 441.6C469.1 452.2 449 449.3 438.4 435.2L400 384L295.2 384L408.8 523.8C419.9 537.5 417.9 557.7 404.1 568.8C390.3 579.9 370.2 577.9 359.1 564.1L169.4 330.6C163.3 345.6 160 361.9 160 378.6L160 448C160 465.7 145.7 480 128 480C110.3 480 96 465.7 96 448L96 378.6C96 311.2 131.4 248.7 189.2 214L193.8 211.2C232.4 188 256 146.4 256 101.4L256 96C256 78.3 270.3 64 288 64zM48 152C48 121.1 73.1 96 104 96C134.9 96 160 121.1 160 152C160 182.9 134.9 208 104 208C73.1 208 48 182.9 48 152zM424 144.1C424 157.4 413.3 168.1 400 168.1C386.7 168.1 376 157.4 376 144.1L376 96.1C376 82.8 386.7 72.1 400 72.1C413.3 72.1 424 82.8 424 96.1L424 144.1zM528 296.1C514.7 296.1 504 285.4 504 272.1C504 258.8 514.7 248.1 528 248.1L576 248.1C589.3 248.1 600 258.8 600 272.1C600 285.4 589.3 296.1 576 296.1L528 296.1zM473.5 198.6C464.1 189.2 464.1 174 473.5 164.7L507.4 130.8C516.8 121.4 532 121.4 541.3 130.8C550.6 140.2 550.7 155.4 541.3 164.7L507.4 198.6C498 208 482.8 208 473.5 198.6z"/>
                            </svg>
                          </span>
                          Blocked
                        </button>
                      )}
                    </div>
                  , document.body)}
                </div>
              )}
            </div>
            {/* Middle: title/description */}
            <div
              className={`flex-grow flex flex-col justify-center min-w-0 transition-all duration-200 relative py-0.5`}
              style={{ paddingLeft: '16px' }}
              onClick={e => {
                // Only open full edit if not clicking the text itself or inline input
                if (!statusInfo.isArchived && !editingInline && e.target === e.currentTarget) {
                  onStartEdit();
                }
              }}
            >
              {/* Vertical divider after icon area */}
              <span
                className="absolute left-0 top-1 bottom-1 w-px bg-gray-300 dark:bg-gray-700 opacity-70"
                style={{ left: '8px' }}
                aria-hidden="true"
              />
              {editingInline ? (
                <input
                  ref={inputRef}
                  className="truncate border dark:border-gray-700 border-gray-300 rounded px-2 py-1 text-base dark:bg-background dark:text-gray-100"
                  value={typeof inlineTitle === "string" ? inlineTitle : String(inlineTitle)}
                  onChange={e => setInlineTitle(e.target.value)}
                  onBlur={commitInlineEdit}
                  onKeyDown={e => {
                    if (e.key === "Enter") commitInlineEdit();
                    if (e.key === "Escape") setEditingInline(false);
                  }}
                  autoFocus
                  onClick={e => e.stopPropagation()}
                />
              ) : (
                <>
                  <span className="flex items-center gap-2 w-full min-w-0">
                    <p
                      className={`truncate my-0 flex-shrink min-w-0 ${task.status === "done" ? "line-through dark:text-gray-500 text-gray-500" : ""} cursor-pointer`}
                      onClick={e => {
                        e.stopPropagation();
                        if (!statusInfo.isArchived) setEditingInline(true);
                      }}
                      title="Click to edit title"
                      style={{ lineHeight: '1.5' }}
                    >
                      {typeof task.title === "object" ? highlightText(JSON.stringify(task.title)) : highlightText(task.title)}
                    </p>
                    {/* Project badge for project tasks */}
                    {project && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onProjectClick) {
                            onProjectClick(project);
                          }
                        }}
                        className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 whitespace-nowrap flex-shrink-0 hover:bg-blue-500/30 hover:border-blue-500/50 transition-all cursor-pointer"
                        title={`Click to view project: ${project.title}`}
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                        </svg>
                        {project.title}
                      </button>
                    )}
                    {/* Description indicator */}
                    {task.description && (
                      <span
                        title={typeof task.description === 'string' ? task.description : 'Has description'}
                        className="ml-2 flex items-center"
                      >
                        <Icon path="M3 5h14v2H3zM3 9h14v2H3zM3 13h10v2H3z" className="w-4 h-4 text-gray-400" />
                      </span>
                    )}
                    {/* Notes/comments indicator */}
                    {task.comments && task.comments.length > 0 && (
                      <span title="Has comments/notes" className="ml-1 flex items-center">
                        <Icon path="M21 6.5a2.5 2.5 0 00-2.5-2.5h-13A2.5 2.5 0 003 6.5v7A2.5 2.5 0 005.5 16H6v3l4.5-3h6A2.5 2.5 0 0021 13.5v-7z" className="w-4 h-4 text-amber-400" />
                      </span>
                    )}
                    {/* Subtask progress icon */}
                    {subtaskInfo.subtaskCount > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs text-gray-500 ml-1" title="Subtasks">
                        <svg width="16" height="16" fill="none" viewBox="0 0 20 20"><rect x="2" y="5" width="16" height="10" rx="2" fill="#e5e7eb"/><rect x="4" y="7" width="12" height="6" rx="1" fill="#fff"/><path d="M7 10.5l2 2 4-4" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        {subtaskInfo.subtaskDone}/{subtaskInfo.subtaskCount}
                      </span>
                    )}
                    {/* Dependencies icon */}
                    {Array.isArray(task.dependencies) && task.dependencies.length > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs text-blue-500 ml-1" title={`Depends on: ${task.dependencies.map(depId => {
                        const depTask = allTasks.find(t => t.id === depId);
                        return depTask ? depTask.title : depId;
                      }).join(", ")}`}>
                        <svg width="16" height="16" fill="none" viewBox="0 0 20 20"><path d="M7 10h6M7 10l2-2m-2 2l2 2" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="5" cy="10" r="2" fill="#dbeafe" stroke="#3b82f6" strokeWidth="1.2"/><circle cx="15" cy="10" r="2" fill="#dbeafe" stroke="#3b82f6" strokeWidth="1.2"/></svg>
                        {task.dependencies.length}
                      </span>
                    )}
                    {/* Attachments icon */}
                    {Array.isArray(task.attachments) && task.attachments.length > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs text-purple-500 ml-1" title={`${task.attachments.length} attachment${task.attachments.length !== 1 ? 's' : ''}: ${task.attachments.map(a => a.name).join(", ")}`}>
                        <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clipRule="evenodd"/>
                        </svg>
                        {task.attachments.length}
                      </span>
                    )}
                  </span>
                  {/* Search match snippet */}
                  {getMatchSnippet && (
                    <div className="mt-1 text-xs text-gray-600 dark:text-gray-400 italic truncate">
                      <span className="font-semibold text-blue-600 dark:text-blue-400">{getMatchSnippet.source}:</span>{' '}
                      {highlightText(getMatchSnippet.text)}
                    </div>
                  )}
                </>
              )}

              {/* Comments/Notes display removed from collapsed line */}
            </div>
            {/* Right tools */}
            <div className="flex-shrink-0 flex items-center gap-x-2 py-0.5 px-1 text-xs text-brand-text min-w-0 overflow-hidden">
              {/* Created, Due, Assigned info (left of status dropdown) */}
              <div className="hidden sm:flex items-center justify-center gap-x-1 mr-1 min-w-[240px] lg:min-w-[280px]">
                {/* Created */}
                <span className="flex items-center justify-center w-[70px] text-brand-text" title="Created date">
                  <svg className="w-3 h-3 mr-1 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 20 20"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m4 4V3m-7 4h14M5 7v10a2 2 0 002 2h6a2 2 0 002-2V7" /></svg>
                  {dateInfo.createdAtObj ? dateInfo.latestDateString : '--'}
                </span>
                <span className="text-brand-text/50">|</span>
                {/* Due */}
                {editingDueDate ? (
                  <div className="flex items-center justify-center w-[70px]">
                    <input
                      type="date"
                      value={tempDueDate}
                      onChange={(e) => setTempDueDate(e.target.value)}
                      onBlur={handleDueDateUpdate}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleDueDateUpdate();
                        if (e.key === "Escape") {
                          setTempDueDate(task.dueDate || "");
                          setEditingDueDate(false);
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full px-1 py-0.5 text-xs text-brand-text bg-gray-800/60 border border-brand-cyan/50 rounded focus:ring-1 focus:ring-brand-cyan"
                      autoFocus
                    />
                  </div>
                ) : (
                  <span 
                    className="flex items-center justify-center w-[70px] cursor-pointer hover:bg-brand-cyan/10 rounded px-1 text-brand-text" 
                    title="Due date (click to edit)"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!statusInfo.isArchived) {
                        setTempDueDate(task.dueDate || "");
                        setEditingDueDate(true);
                      }
                    }}
                  >
                    <svg className="w-3 h-3 mr-1 text-red-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 20 20"><circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="2" /><path strokeLinecap="round" strokeLinejoin="round" d="M10 6v4l2 2" /></svg>
                    {dateInfo.dueDateObj ? dateInfo.dueDateString : '--'}
                  </span>
                )}
                <span className="text-brand-text/50">|</span>
                {/* Assigned */}
                <span 
                  ref={assigneeButtonRef}
                  className="flex items-center justify-center w-[110px] cursor-pointer hover:bg-brand-cyan/10 rounded px-1 text-brand-text truncate" 
                  title="Assigned to (click to edit)"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!statusInfo.isArchived) {
                      setTempAssignee(typeof task.assignee === "string" ? task.assignee : task.assignee?.name || "");
                      setShowAssigneeDropdown(true);
                    }
                  }}
                >
                  <svg className="w-3 h-3 mr-1 text-blue-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 20 20"><circle cx="10" cy="7" r="4" stroke="currentColor" strokeWidth="2" /><path strokeLinecap="round" strokeLinejoin="round" d="M4 17v-1a4 4 0 014-4h4a4 4 0 014 4v1" /></svg>
                  {task.assignee ? (typeof task.assignee === "object" ? (task.assignee.name || task.assignee.id) : task.assignee) : '--'}
                </span>
                
                {/* Assignee Dropdown - rendered via portal to escape overflow:hidden */}
                {showAssigneeDropdown && createPortal(
                  <div
                    ref={assigneeDropdownRef}
                    data-assignee-dropdown-menu={task.id}
                    className="fixed bg-gray-800/95 border border-brand-cyan/50 rounded-lg shadow-xl py-1 z-[9999] min-w-[180px] max-h-[300px] overflow-y-auto backdrop-blur-xl"
                    style={{ 
                      top: assigneeDropdownPos ? `${assigneeDropdownPos.top}px` : '0px',
                      left: assigneeDropdownPos ? `${assigneeDropdownPos.left}px` : '0px'
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left hover:bg-brand-cyan/10 flex items-center gap-2 text-sm text-brand-text/60"
                      onClick={() => {
                        setTempAssignee("");
                        handleAssigneeUpdate();
                        setShowAssigneeDropdown(false);
                      }}
                    >
                      — Unassigned —
                    </button>
                    {teamMembers && teamMembers.length > 0 ? (
                      teamMembers.filter(m => m.active).map((member) => (
                        <button
                          key={member.id}
                          type="button"
                          className={`w-full px-3 py-2 text-left hover:bg-brand-cyan/10 flex items-center gap-2 text-sm text-brand-text ${
                            tempAssignee === member.name ? 'bg-brand-cyan/20' : ''
                          }`}
                          onClick={() => {
                            setTempAssignee(member.name);
                            handleAssigneeUpdate();
                            setShowAssigneeDropdown(false);
                          }}
                        >
                          {member.name}
                          {member.title && <span className="text-xs text-brand-text/60">({member.title})</span>}
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-sm text-brand-text/60">Loading...</div>
                    )}
                  </div>,
                  document.body
                )}
              </div>
              
              {/* Project Selector Dropdown Portal */}
              {showProjectSelector && projectSelectorPos && createPortal(
                <div
                  ref={projectSelectorRef}
                  data-project-selector={task.id}
                  className="fixed bg-gray-800/95 border border-indigo-500/50 rounded-lg shadow-xl py-1 z-[9999] min-w-[220px] max-h-[400px] overflow-y-auto backdrop-blur-xl"
                  style={{ 
                    top: `${projectSelectorPos.top}px`,
                    left: `${projectSelectorPos.left}px`
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="px-3 py-2 text-xs font-semibold text-indigo-300 border-b border-indigo-500/30">
                    Select Project
                  </div>
                  {allProjects && allProjects.length > 0 ? (
                    allProjects
                      .filter(p => p.status !== 'completed' && p.status !== 'archived')
                      .map((proj) => (
                        <button
                          key={proj.id}
                          type="button"
                          className="w-full px-3 py-2 text-left hover:bg-indigo-600/20 flex flex-col gap-1 text-sm text-brand-text border-b border-white/5 last:border-0"
                          onClick={() => handleConvertToProject(proj.id!)}
                        >
                          <span className="font-medium">{proj.title}</span>
                          {proj.r2Number && (
                            <span className="text-xs text-brand-text/60">R2# {proj.r2Number}</span>
                          )}
                        </button>
                      ))
                  ) : (
                    <div className="px-3 py-2 text-sm text-brand-text/60">No active projects available</div>
                  )}
                </div>,
                document.body
              )}
              
              {/* Priority badge with hover slider */}
              {!statusInfo.isArchived && (
                <div 
                  className="relative hidden sm:block overflow-visible" 
                  data-priority-slider={task.id}
                  onMouseLeave={handlePriorityMouseLeave}
                  onMouseEnter={handlePriorityMouseEnter}
                >
                  {/* Expandable slider overlay - expands from center */}
                  {showPrioritySlider && (
                    <div
                      ref={prioritySliderRef}
                      className="absolute top-0 left-1/2 -translate-x-1/2 z-50 rounded-lg px-3 py-2 min-w-[200px]"
                      style={{
                        animation: 'expandSlider 0.2s ease-out forwards',
                        transformOrigin: 'center center',
                        background: 'linear-gradient(to right, #9ca3af 0%, #60a5fa 25%, #34d399 50%, #fbbf24 75%, #f97316 90%, #ef4444 100%)',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3), inset 0 1px 2px rgba(255, 255, 255, 0.3)'
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-white drop-shadow-md text-shadow-sm min-w-[2ch] text-center">
                          {tempPriority}
                        </span>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={tempPriority}
                          onChange={(e) => {
                            const newValue = Number(e.target.value);
                            setTempPriority(newValue);
                          }}
                          onMouseUp={async () => {
                            await handlePriorityUpdate(tempPriority);
                          }}
                          onTouchEnd={async () => {
                            await handlePriorityUpdate(tempPriority);
                          }}
                          className="flex-1 h-1.5 rounded-lg appearance-none cursor-pointer bg-white/30"
                        />
                        <span className="text-xs font-semibold text-white drop-shadow-md text-shadow-sm whitespace-nowrap">
                          {getPriorityLabel(tempPriority)}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {/* Priority badge - fades when slider shows */}
                  <span
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      setShowPrioritySlider(!showPrioritySlider); 
                    }}
                    title={`Priority: ${task.priority} (${getPriorityLabel(task.priority)}) - Hover to adjust`}
                    className={`flex items-center gap-1 text-xs font-semibold rounded-lg px-2 py-1 cursor-pointer shadow-md border border-zinc-400 transition-opacity ${getPriorityBgGradient(task.priority)} ${showPrioritySlider ? 'opacity-0' : 'opacity-100'}`}
                    style={{ boxShadow: '0 2px 6px rgba(120,120,120,0.15), inset 0 1px 2px #fff' }}
                  >
                    <span className="text-white drop-shadow-md text-shadow-sm">{task.priority}</span>
                  </span>
                </div>
              )}
              {/* Edit button */}
              {!statusInfo.isArchived && (
                <button
                  type="button"
                  className="hidden md:block px-2 py-1 text-xs border rounded dark:bg-surface bg-gray-100 dark:hover:bg-accent hover:bg-blue-100 dark:text-gray-100 text-gray-900"
                  onClick={e => { e.stopPropagation(); onStartEdit(); }}
                  title="Open full edit window"
                >
                  Edit
                </button>
              )}
              {/* Move to Project button - only for general tasks */}
              {!statusInfo.isArchived && !task.projectId && allProjects.length > 0 && (
                <button
                  ref={projectButtonRef}
                  type="button"
                  className="hidden md:block px-2 py-1 text-xs border rounded dark:bg-indigo-600/20 bg-indigo-100 dark:hover:bg-indigo-600/30 hover:bg-indigo-200 dark:text-indigo-300 text-indigo-700 border-indigo-500/30"
                  onClick={e => { e.stopPropagation(); setShowProjectSelector(!showProjectSelector); }}
                  title="Move task to a project"
                >
                  Move to Project
                </button>
              )}
              {/* Promote, archive, delete, unarchive buttons */}
              {!statusInfo.isArchived ? (
                <>
                  <button
                    onClick={async (e) => { 
                      e.stopPropagation(); 
                      const success = await onUndo();
                      if (!success) {
                        console.log('No changes to undo');
                      }
                    }}
                    className="p-1 dark:text-gray-400 text-gray-400 dark:hover:text-blue-400 hover:text-blue-500"
                    title="Undo Last Change"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 10h10a5 5 0 0 1 0 10H9M3 10l3-3m-3 3l3 3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); onArchive(); }}
                    className="p-1 dark:text-gray-400 text-gray-400 dark:hover:text-gray-100 hover:text-gray-900"
                    title="Archive Task"
                  >
                    <Icon path="M5 5h14v2H5zM7 9h10v10H7z" />
                  </button>
                  <div className="relative inline-block">
                    <button
                      onClick={e => { e.stopPropagation(); onDelete(); }}
                      className="p-1 dark:text-gray-400 text-gray-400 dark:hover:text-red-400 hover:text-red-500"
                      title="Delete Task"
                    >
                      <Icon path="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <button
                    onClick={e => { e.stopPropagation(); onUnarchive(); }}
                    className="p-1 dark:text-gray-400 text-gray-400 dark:hover:text-green-400 hover:text-green-600"
                    title="Unarchive Task"
                  >
                    <Icon path="M5 5h14v2H5zm2 4h10v10H7z" />
                  </button>
                  <div className="relative inline-block">
                    <button
                      onClick={e => { e.stopPropagation(); onDelete(); }}
                      className="p-1 dark:text-gray-400 text-gray-400 dark:hover:text-red-400 hover:text-red-500"
                      title="Delete Task"
                    >
                      <Icon path="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
}
