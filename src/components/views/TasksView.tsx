// src/components/views/TasksView.tsx
import React, { useState, useMemo, useLayoutEffect } from "react";
import { createPortal } from 'react-dom';
import { ConfirmModal } from "../shared/ConfirmModal";
import { Dropdown } from "../shared/Dropdown";
import { logError } from "../../utils/logger";
import type { WithId, Task, Blocker, TaskFilters, Project, TaskAssignee, DueFilter, StatusFilter } from "../../types";
import { TaskItem } from "../TaskItem";
import { TaskEditForm } from "../TaskEditForm";
import { createTask } from "../../services/tasks";
import { BlockerModal } from "../BlockerModal";
import { BlockerManagerModal } from "../BlockerManagerModal";
import { FilterBar, defaultFilters } from "../FilterBar";
import { ProjectDetailView } from './ProjectDetailView';
// Removed SimpleFilterBar

// Draggable wrapper for dnd-kit

// Main TasksView component

import { useAllBlockers } from "../../hooks/useBlockers";
import { useTasks } from "../../hooks/useTasks";
import { useProjects } from "../../hooks/useProjects";

interface TasksViewProps {
  uid: string;
  allTasks?: WithId<Task>[];
  allProjects?: WithId<Project>[];
  allBlockers?: WithId<Blocker>[];
}

function TasksView({ uid, allTasks: propAllTasks, allProjects: propAllProjects, allBlockers: propAllBlockers }: TasksViewProps) {
  const hookAllBlockers = useAllBlockers(uid);
  const safeAllBlockers = propAllBlockers ?? hookAllBlockers;
  const hookTasks = useTasks(uid);
  const hookProjects = useProjects(uid);
  const allTasks = propAllTasks ?? hookTasks;
  const allProjects = propAllProjects ?? hookProjects;
  const FILTERS_KEY = "taskAppDefaultFilters_TasksView";
  const [filters, setFiltersState] = useState(() => {
    const saved = localStorage.getItem(FILTERS_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (err) {
        logError("Error parsing saved filters:", err);
        return defaultFilters;
      }
    }
    return defaultFilters;
  });

  // Create a wrapper function that also saves to localStorage
  const setFilters = (newFilters: TaskFilters) => {
    setFiltersState(newFilters);
    localStorage.setItem(FILTERS_KEY, JSON.stringify(newFilters));
  };
  const [showAll, setShowAll] = useState(false);
  const [arrangeBy, setArrangeBy] = useState("age");
  const [reverseOrder, setReverseOrder] = useState(false);
  const [quickAdd, setQuickAdd] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  // Removed streamlined UI toggle; always using classic FilterBar
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [taskTypeFilter, setTaskTypeFilter] = useState<'all' | 'general' | 'project'>(() => {
    const saved = localStorage.getItem('taskTypeFilter');
    return (saved as 'all' | 'general' | 'project') || 'all';
  });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState("");
  const [confirmAction, setConfirmAction] = useState<(() => Promise<void>) | null>(null);
  const [blockerManagerTask, setBlockerManagerTask] = useState<{ id: string; title: string; type: "task" } | null>(null);
  const [selectedProject, setSelectedProject] = useState<WithId<Project> | null>(null);
  const filtersPanelRef = React.useRef<HTMLDivElement | null>(null);
  const toggleButtonRef = React.useRef<HTMLButtonElement | null>(null);
  const controlsWrapperRef = React.useRef<HTMLDivElement | null>(null);
  const [badgePos, setBadgePos] = useState<{ top: number; left: number } | null>(null);
  const [showHiddenTooltip, setShowHiddenTooltip] = useState(false);
  const [hiddenBadgePos, setHiddenBadgePos] = useState<{ top: number; left: number } | null>(null);
  const hiddenBadgeRef = React.useRef<HTMLDivElement | null>(null);

  // Count active (non-default) filters for badge display
  const activeFilterCount = useMemo(() => {
    // If "Show All" is active, filters are bypassed so count = 0
    if (showAll) return 0;
    
    let count = 0;
    // Status filter is active only if it's not the default ["active"]
    if (filters.status && filters.status.length > 0 && !(filters.status.length === 1 && filters.status[0] === "active")) count++;
    // Priority filter is active if it doesn't have all 5 ranges (default is [0, 1, 2, 3, 4])
    if (filters.minPriority && filters.minPriority.length > 0 && filters.minPriority.length < 5) count++;
    // Due filter is active only if it's not the default ["any"]
    if (filters.due && filters.due.length > 0 && !(filters.due.length === 1 && filters.due[0] === "any")) count++;
    // Assigned filter is active if it has any values (default is empty)
    if (filters.assigned && filters.assigned.length > 0) count++;
    return count;
  }, [filters, showAll]);

  // Measure and position the floating badge (rendered in a portal) so it won't be clipped
  useLayoutEffect(() => {
    function updatePos() {
      const btn = toggleButtonRef.current;
      if (!btn || activeFilterCount <= 0) {
        setBadgePos(null);
        return;
      }
      const rect = btn.getBoundingClientRect();
      // Use fixed positioning (relative to viewport) instead of absolute
      const top = rect.top - 8; // slightly above the button
      const left = rect.left + rect.width - 10; // near the right edge
      setBadgePos({ top, left });
    }

    updatePos();
    window.addEventListener('resize', updatePos);
    window.addEventListener('scroll', updatePos, { passive: true });
    return () => {
      window.removeEventListener('resize', updatePos);
      window.removeEventListener('scroll', updatePos);
    };
  }, [toggleButtonRef, activeFilterCount]);

  // Close on outside click
  React.useEffect(() => {
    if (!showFilters) return;
    function handlePointerDown(e: MouseEvent) {
      const target = e.target as Node;
      // If clicking the toggle button, let its own onClick handler manage state
      if (toggleButtonRef.current && toggleButtonRef.current.contains(target)) {
        return;
      }
      // Close if click is outside the panel
      if (filtersPanelRef.current && !filtersPanelRef.current.contains(target)) {
        setShowFilters(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setShowFilters(false);
    }
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKey);
    };
  }, [showFilters]);
  
  // Filters placement logic removed; inline bar is always visible like Project View
  // Removed unused promotingTask state
  const [blockerModalTask, setBlockerModalTask] = useState<{ id: string; title: string; type: "task" } | null>(null);

  const arrangeOptions = [
    { value: "age", label: "Created" },
    { value: "status", label: "Status" },
    { value: "title", label: "Title" },
    { value: "dueDate", label: "Due Date" },
    { value: "priority", label: "Priority" },
    { value: "assigned", label: "Assignee" },
  ];

  function isWithinDueFilter(dueISO: string | null, filter: DueFilter) {
    if (!dueISO) return filter === "any";
    const due = new Date(dueISO);
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    
    // Calculate end of current week (Sunday)
    const endOfWeek = new Date(startOfToday);
    const currentDayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const daysUntilSunday = currentDayOfWeek === 0 ? 0 : 7 - currentDayOfWeek;
    endOfWeek.setDate(startOfToday.getDate() + daysUntilSunday + 1); // +1 to include Sunday

    switch (filter) {
      case "any":
        return true;
      case "overdue":
        return due < startOfToday;
      case "today":
        return due >= startOfToday && due < endOfToday;
      case "week":
        return due >= startOfToday && due < endOfWeek;
      case "month": {
        // Calculate end of current month
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        return due >= startOfToday && due < endOfMonth;
      }
      default:
        return true;
    }
  }

  // Custom filter setter that also saves to localStorage
  const setFiltersWithPersistence = (newFilters: TaskFilters) => {
    setFilters(newFilters);
    localStorage.setItem(FILTERS_KEY, JSON.stringify(newFilters));
  };

  // Memoized filtered task computation to prevent unnecessary recalculations
  const filteredTasks = useMemo((): WithId<Task>[] => {
    // Apply task type filter first
    let list: WithId<Task>[];
    if (taskTypeFilter === 'general') {
      list = allTasks.filter((t: WithId<Task>) => !t.projectId);
    } else if (taskTypeFilter === 'project') {
      list = allTasks.filter((t: WithId<Task>) => t.projectId);
    } else {
      // 'all' - include both general and project tasks
      list = [...allTasks];
    }
    
    if (showAll) return list;
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      list = list.filter((t: WithId<Task>) => 
        t.title.toLowerCase().includes(query) ||
        (t.description && t.description.toLowerCase().includes(query)) ||
        (t.comments && t.comments.toLowerCase().includes(query)) ||
        (t.assignee && typeof t.assignee === 'string' && t.assignee.toLowerCase().includes(query)) ||
        (t.assignee && typeof t.assignee === 'object' && t.assignee.name && t.assignee.name.toLowerCase().includes(query)) ||
        (t.subtasks && t.subtasks.some(sub => sub.title.toLowerCase().includes(query)))
      );
    }
    
    // Handle archived tasks - only exclude them if not explicitly requesting archived status
    if (!filters.includeArchived && !(filters.status && filters.status.includes("archived" as StatusFilter))) {
      list = list.filter((t: WithId<Task>) => t.status !== "archived");
    }
    if (filters.status && filters.status.length > 0) {
      list = list.filter((t: WithId<Task>) => {
        const statusMap: Record<StatusFilter, string[]> = {
          active: ["not_started", "in_progress", "blocked"],
          blocked: ["blocked"],
          done: ["done"],
          archived: ["archived"],
        };
        return filters.status.some((f: StatusFilter) => statusMap[f]?.includes(t.status));
      });
    }
    if (filters.minPriority && filters.minPriority.length > 0) {
      // If all priority ranges selected (0-4), show all tasks
      const hasAllPriorities = filters.minPriority.length === 5 && [0, 1, 2, 3, 4].every(p => filters.minPriority.includes(p));
      
      if (!hasAllPriorities) {
        list = list.filter((t: WithId<Task>) => {
          const taskPriority = t.priority ?? 0;
          // Map task priority (0-100) to priority range category (0-4)
          // 0: 0-20, 1: 21-40, 2: 41-60, 3: 61-80, 4: 81-100
          let priorityCategory: number;
          if (taskPriority <= 20) priorityCategory = 0;
          else if (taskPriority <= 40) priorityCategory = 1;
          else if (taskPriority <= 60) priorityCategory = 2;
          else if (taskPriority <= 80) priorityCategory = 3;
          else priorityCategory = 4;
          
          return filters.minPriority.includes(priorityCategory);
        });
      }
    }
    if (filters.due && filters.due.length > 0 && !filters.due.includes("any" as DueFilter)) {
      list = list.filter((t: WithId<Task>) => filters.due.some((d: DueFilter) => isWithinDueFilter(t.dueDate, d)));
    }
    if (filters.assigned && filters.assigned.length > 0) {
      list = list.filter((t: WithId<Task>) => {
        const isNone = !t.assignee || t.assignee === null || t.assignee === undefined;
        if (filters.assigned && filters.assigned.includes("(None)")) {
          if (isNone) return true;
        }
        if (typeof t.assignee === "object" && t.assignee !== null) {
          const assignee = t.assignee as TaskAssignee;
          return filters.assigned?.includes(assignee.name) || filters.assigned?.includes(assignee.id);
        }
        if (typeof t.assignee === "string") {
          return filters.assigned?.includes(t.assignee);
        }
        return false;
      });
    }
    return list;
  }, [allTasks, showAll, filters, searchQuery, taskTypeFilter]);

  // Calculate how many tasks are hidden by filters and which ones
  const hiddenTasksInfo = useMemo(() => {
    if (showAll) return { count: 0, tasks: [] };
    let unfilteredTasks: WithId<Task>[];
    if (taskTypeFilter === 'general') {
      unfilteredTasks = allTasks.filter((t: WithId<Task>) => !t.projectId);
    } else if (taskTypeFilter === 'project') {
      unfilteredTasks = allTasks.filter((t: WithId<Task>) => t.projectId);
    } else {
      unfilteredTasks = [...allTasks];
    }
    const filteredTaskIds = new Set(filteredTasks.map(t => t.id));
    const hiddenTasks = unfilteredTasks.filter(t => !filteredTaskIds.has(t.id));
    return { count: hiddenTasks.length, tasks: hiddenTasks };
  }, [allTasks, filteredTasks, showAll, taskTypeFilter]);

  const hiddenTaskCount = hiddenTasksInfo.count;

  // Save task type filter to localStorage when it changes
  React.useEffect(() => {
    localStorage.setItem('taskTypeFilter', taskTypeFilter);
  }, [taskTypeFilter]);

  // Track hidden badge position for tooltip portal
  useLayoutEffect(() => {
    function updateHiddenBadgePos() {
      const badge = hiddenBadgeRef.current;
      if (!badge || hiddenTaskCount <= 0) {
        setHiddenBadgePos(null);
        return;
      }
      const rect = badge.getBoundingClientRect();
      const top = rect.top;
      const left = rect.left;
      setHiddenBadgePos({ top, left });
    }

    updateHiddenBadgePos();
    window.addEventListener('resize', updateHiddenBadgePos);
    window.addEventListener('scroll', updateHiddenBadgePos, { passive: true });
    return () => {
      window.removeEventListener('resize', updateHiddenBadgePos);
      window.removeEventListener('scroll', updateHiddenBadgePos);
    };
  }, [hiddenTaskCount]);

  // Memoized unique assignees list to prevent recalculation
  const uniqueAssignees = useMemo(() => {
    return Array.from(new Set(
      allTasks.map((t) => typeof t.assignee === "string" ? t.assignee : (t.assignee as any)?.name).filter((v): v is string => Boolean(v))
    ));
  }, [allTasks]);

  // Sort tasks by arrangeBy (stable via useCallback)
  const sortTasks = React.useCallback((tasks: WithId<Task>[]): WithId<Task>[] => {
    const list = [...tasks];
    switch (arrangeBy) {
      case "status":
        list.sort((a, b) => a.status.localeCompare(b.status));
        break;
      case "title":
        list.sort((a, b) => String(a.title).localeCompare(String(b.title)));
        break;
      case "dueDate":
        list.sort((a, b) => {
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return a.dueDate.localeCompare(b.dueDate);
        });
        break;
      case "priority":
        list.sort((a, b) => b.priority - a.priority);
        break;
      case "assigned":
        list.sort((a, b) => {
          const aAssignee = typeof a.assignee === "object" && a.assignee !== null
            ? (a.assignee as TaskAssignee).name || (a.assignee as TaskAssignee).id || JSON.stringify(a.assignee)
            : a.assignee || "";
          const bAssignee = typeof b.assignee === "object" && b.assignee !== null
            ? (b.assignee as TaskAssignee).name || (b.assignee as TaskAssignee).id || JSON.stringify(b.assignee)
            : b.assignee || "";
          return String(aAssignee).localeCompare(String(bAssignee));
        });
        break;
      case "age":
      default:
        list.sort((a, b) => {
          const aTime = (a.createdAt && typeof (a.createdAt as any).toDate === "function")
            ? (a.createdAt as any).toDate().getTime()
            : 0;
          const bTime = (b.createdAt && typeof (b.createdAt as any).toDate === "function")
            ? (b.createdAt as any).toDate().getTime()
            : 0;
          return aTime - bTime;
        });
        break;
      }
    if (reverseOrder) list.reverse();
    return list;
    }, [arrangeBy, reverseOrder]);

  // Memoized grouped and sorted tasks to prevent recalculation on every render
  const groupedTasks = useMemo(() => {
    function groupTasks(tasks: WithId<Task>[], groupBy: string): Record<string, WithId<Task>[]> {
      if (!groupBy || groupBy === "none") return { "": sortTasks(tasks) };
      const groups: Record<string, WithId<Task>[]> = {};
      for (const t of tasks) {
        let key = "";
        if (groupBy === "status") key = t.status || "(none)";
        else if (groupBy === "priority") key = String(t.priority ?? "(none)");
        else if (groupBy === "due") key = t.dueDate ? t.dueDate.slice(0, 10) : "(none)";
        else if (groupBy === "assigned") key = t.assignee
          ? (typeof t.assignee === "object"
              ? (t.assignee as TaskAssignee).name || (t.assignee as TaskAssignee).id
              : t.assignee)
          : "(none)";
        else if (groupBy === "project") {
          if (t.projectId && allProjects?.length) {
            const project = allProjects.find(p => p.id === t.projectId);
            key = project?.title || "(none)";
          } else {
            key = "(General)";
          }
        }
        else key = "";
        if (!groups[key]) groups[key] = [];
        groups[key].push(t);
      }
      // Sort each group
      Object.keys(groups).forEach(key => {
        groups[key] = sortTasks(groups[key]);
      });
      return groups;
    }
    
    return groupTasks(filteredTasks, filters.groupBy || "none");
  }, [filteredTasks, filters.groupBy, sortTasks, allProjects]);

  // Remove effect that updates dragList from backend unless a drag is in progress



  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAdd.trim()) return;
    try {
      await createTask(uid, quickAdd.trim(), null);
      setQuickAdd("");
    } catch (error) {
      console.error("Error creating task:", error);
      logError("Failed to create task", error);
    }
  };

  // ...existing code...
  return (
  <div className="space-y-6">
      <div className="flex items-end justify-between">
  <h1 className="text-3xl font-bold text-brand-text">Tasks</h1>
      </div>

      <form onSubmit={handleQuickAdd} className="mt-3">
        <input
          className="w-full bg-[rgba(20,20,30,0.6)] backdrop-blur-sm border border-white/10 rounded-lg px-4 py-3 text-base text-brand-text placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-cyan/50 focus:border-brand-cyan/50 transition-all"
          placeholder="✨ Add a new task..."
          value={quickAdd}
          onChange={(e) => setQuickAdd(e.target.value)}
        />
      </form>

      {/* Filters Bar (match Project View) */}
      <div className="mt-4">
        <div ref={controlsWrapperRef} className="flex flex-col">
          <div className="flex flex-wrap items-center gap-3 bg-[rgba(20,20,30,0.6)] backdrop-blur-sm rounded-xl px-4 py-3 border border-white/10 w-full z-10 overflow-visible">
            {/* Search first */}
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tasks..."
                className="pl-10 pr-3 py-2 text-sm bg-[rgba(15,15,25,0.8)] border border-white/10 rounded-lg focus:ring-2 focus:ring-brand-cyan/50 focus:border-brand-cyan/50 w-56 text-brand-text placeholder:text-gray-500 transition-all"
              />
            </div>

            {/* Task Type Filter */}
            <div className="flex items-center gap-1 bg-[rgba(15,15,25,0.8)] border border-white/10 rounded-lg p-1">
              <button
                type="button"
                onClick={() => setTaskTypeFilter('all')}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-all ${
                  taskTypeFilter === 'all'
                    ? 'bg-brand-cyan text-white shadow-lg shadow-brand-cyan/30'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                All Tasks
              </button>
              <button
                type="button"
                onClick={() => setTaskTypeFilter('general')}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-all ${
                  taskTypeFilter === 'general'
                    ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                📋 General
              </button>
              <button
                type="button"
                onClick={() => setTaskTypeFilter('project')}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-all ${
                  taskTypeFilter === 'project'
                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                📁 Project Tasks
              </button>
            </div>

            {/* Inline FilterBar like Project View */}
            <FilterBar
              filters={filters}
              onChange={setFiltersWithPersistence}
              allAssignees={uniqueAssignees}
              localStorageKey={FILTERS_KEY}
              compact={false}
              showAll={showAll}
              onToggleShowAll={() => setShowAll((v) => !v)}
            />

            {/* Hidden tasks indicator */}
            {!showAll && hiddenTaskCount > 0 && (
              <div 
                ref={hiddenBadgeRef}
                onMouseEnter={() => setShowHiddenTooltip(true)}
                onMouseLeave={() => setShowHiddenTooltip(false)}
                className="flex items-center gap-2 text-sm text-brand-warning bg-brand-warning/10 border border-brand-warning/30 rounded-lg px-3 py-1 cursor-default"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd"/>
                  <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z"/>
                </svg>
                <span>{hiddenTaskCount} task{hiddenTaskCount === 1 ? '' : 's'} hidden by filters</span>
              </div>
            )}

            {/* Separator */}
            <div className="h-8 w-px bg-white/10 mx-2" />

            {/* Group by and Arrange by controls */}
            <div className="flex items-center gap-2">
              <Dropdown label={`Group by${filters.groupBy && filters.groupBy !== "none" ? `: ${["None","Status","Priority","Due","Assignee","Project"][ ["none","status","priority","due","assigned","project"].indexOf(filters.groupBy) ]}` : ""}`}>
                { ["none","status","priority","due","assigned","project"].map((val, i) => (
                  <label key={val} className="flex items-center gap-2 px-2 py-1">
                    <input
                      type="radio"
                      name="groupBy"
                      checked={(filters.groupBy || "none") === val}
                      onChange={() => setFiltersWithPersistence({ ...filters, groupBy: val as TaskFilters["groupBy"] })}
                    />
                    <span>{["None","Status","Priority","Due","Assignee","Project"][i]}</span>
                  </label>
                ))}
              </Dropdown>
              <Dropdown label={`Arrange by${arrangeBy ? `: ${arrangeOptions.find(o => o.value === arrangeBy)?.label}` : ""}`}>
                {arrangeOptions.map(opt => (
                  <label key={opt.value} className="flex items-center gap-2 px-2 py-1">
                    <input
                      type="radio"
                      name="arrangeBy"
                      checked={arrangeBy === opt.value}
                      onChange={() => setArrangeBy(opt.value)}
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </Dropdown>
              <button
                type="button"
                className={`ml-2 px-2 py-1 rounded border border-white/10 text-xs bg-white/5 hover:bg-white/10 transition-colors ${reverseOrder ? "text-brand-cyan" : "text-gray-400"}`}
                title={reverseOrder ? "Descending" : "Ascending"}
                onClick={() => setReverseOrder((v) => !v)}
              >
                {reverseOrder ? "↓" : "↑"}
              </button>
            </div>
          </div>

          {/* Keep confirm modal here */}
          <ConfirmModal
            open={confirmOpen}
            title="Confirm"
            message={confirmMessage}
            confirmLabel="Delete"
            cancelLabel="Cancel"
            onCancel={() => setConfirmOpen(false)}
            onConfirm={async () => {
              setConfirmOpen(false);
              if (confirmAction) await confirmAction();
              setConfirmAction(null);
            }}
          />
        </div>
      </div>


      {/* Tasks grouped list */}
      <div className="bg-[rgba(20,20,30,0.6)] backdrop-blur-sm border border-white/10 rounded-lg p-4 mt-2" style={{ minHeight: 200 }}>
        {(() => {
          const grouped = groupedTasks;
          const groupKeys = Object.keys(grouped);
          const totalUnfiltered = allTasks.filter((t: WithId<Task>) => !t.projectId).length;
          if (groupKeys.length === 1 && groupKeys[0] === "" && grouped[""]?.length === 0) {
            // If there are no tasks at all in this view, show a neutral message. Otherwise
            // indicate that no tasks match the current filters.
            if (totalUnfiltered === 0) {
              return <div className="text-sm text-gray-400 py-6 text-center">No tasks yet.</div>;
            }
            return <div className="text-sm text-gray-400 py-6 text-center">No tasks match your filters.</div>;
          }
          return groupKeys.map((group) => (
            <div key={group} className="mb-6">
              {group && (
                <div className="font-bold text-lg mb-2 capitalize">
                  {filters.groupBy === "priority"
                    ? (() => {
                        const labels: Record<string, string> = {
                          "0": "Any",
                          "1": "Low",
                          "2": "Medium",
                          "3": "High",
                          "4": "Urgent",
                        };
                        return labels[group] || group;
                      })()
                    : filters.groupBy === "due"
                    ? group
                    : filters.groupBy === "assigned"
                    ? group
                    : filters.groupBy === "status"
                    ? (() => {
                        const statusLabels: Record<string, string> = {
                          "not_started": "Not Started",
                          "in_progress": "In Progress",
                          "blocked": "Blocked",
                          "done": "Done",
                          "archived": "Archived",
                        };
                        return statusLabels[group] || group.charAt(0).toUpperCase() + group.slice(1);
                      })()
                    : group.charAt(0).toUpperCase() + group.slice(1)}
                </div>
              )}
              <ul className="space-y-2 relative">
                {grouped[group].map((t: WithId<Task>) => (
                  <li key={t.id} className="relative">
                    {editingTaskId === t.id ? (
                      <div className="mt-2">
                        <TaskEditForm
                          uid={uid}
                          task={t}
                          allProjects={allProjects}
                          searchQuery={searchQuery}
                          onSave={() => setEditingTaskId(null)}
                          onCancel={() => setEditingTaskId(null)}
                          // ...existing code...
                          onDelete={async () => {
                            const action = async () => {
                              const { removeTask } = await import("../../services/tasks");
                              await removeTask(uid, t.id);
                              setEditingTaskId(null);
                            };
                            setConfirmMessage("Delete this task?");
                            setConfirmAction(() => action);
                            setConfirmOpen(true);
                          }}
                          onArchive={async () => {
                            const { archiveTask } = await import("../../services/tasks");
                            await archiveTask(uid, t.id);
                          }}
                          onUnarchive={async () => {
                            const { unarchiveTask } = await import("../../services/tasks");
                            await unarchiveTask(uid, t.id);
                          }}
                          onStatusChange={async (newStatus) => {
                            const { updateTask } = await import("../../services/tasks");
                            await updateTask(uid, t.id, { status: newStatus });
                            // Modal will remain open after status change
                          }}
                        />
                      </div>
                    ) : (
                      <TaskItem
                        uid={uid}
                        task={t}
                        allBlockers={safeAllBlockers}
                        allTasks={filteredTasks}
                        allProjects={allProjects}
                        searchQuery={searchQuery}
                        onStartEdit={() => setEditingTaskId(t.id)}
                        // ...existing code...
                        onManageBlockers={() => setBlockerManagerTask({ id: t.id, title: t.title, type: "task" })}
                        onStartBlock={() => setBlockerModalTask({ id: t.id, title: t.title, type: "task" })}
                        onProjectClick={(project) => setSelectedProject(project)}
                        onArchive={async () => {
                          const { archiveTask } = await import("../../services/tasks");
                          await archiveTask(uid, t.id);
                        }}
                        onDelete={async () => {
                          const action = async () => {
                            const { removeTask } = await import("../../services/tasks");
                            await removeTask(uid, t.id);
                          };
                          setConfirmMessage("Delete this task?");
                          setConfirmAction(() => action);
                          setConfirmOpen(true);
                        }}
                        onUnarchive={async () => {
                          const { unarchiveTask } = await import("../../services/tasks");
                          await unarchiveTask(uid, t.id);
                        }}
                        onStatusChange={async (newStatus) => {
                          const { updateTask } = await import("../../services/tasks");
                          await updateTask(uid, t.id, { status: newStatus });
                        }}
                        onUndo={async () => {
                          const { undoLastChange } = await import("../../services/undo");
                          return await undoLastChange(uid, "task", t.id);
                        }}
                      />
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ));
        })()}
      </div>
      {/* Blocker modal for adding a blocker to a task */}
      {blockerModalTask && (
        <BlockerModal
          uid={uid}
          entity={blockerModalTask}
          onClose={() => setBlockerModalTask(null)}
        />
      )}
      {/* Blocker manager modal for managing existing blockers */}
      {blockerManagerTask && (
        <BlockerManagerModal
          uid={uid}
          entity={blockerManagerTask}
          onClose={() => setBlockerManagerTask(null)}
        />
      )}
      {/* Portal badge to avoid clipping by ancestor overflow */}
      {badgePos && activeFilterCount > 0 && createPortal(
        <div 
          style={{ 
            position: 'fixed',
            top: `${badgePos.top}px`, 
            left: `${badgePos.left}px`, 
            zIndex: 99999,
            pointerEvents: 'none'
          }}
        >
          <span 
            className="inline-block text-center font-semibold bg-brand-cyan text-black text-xs px-1.5 py-0.5 rounded-full leading-none min-w-[20px] shadow-lg border-2 border-white"
          >
            {activeFilterCount}
          </span>
        </div>,
        document.body
      )}
      {/* Portal tooltip for hidden tasks */}
      {showHiddenTooltip && hiddenBadgePos && hiddenTaskCount > 0 && createPortal(
        <div 
          style={{ 
            position: 'fixed',
            top: `${hiddenBadgePos.top - 10}px`,
            left: `${hiddenBadgePos.left}px`,
            transform: 'translateY(-100%)',
            zIndex: 99999,
            pointerEvents: 'none'
          }}
          className="w-64 max-h-48 overflow-y-auto bg-black/80 backdrop-blur-sm text-white text-xs rounded-lg px-3 py-2 border border-white/20 animate-tooltip"
        >
          <div className="font-semibold mb-1">Hidden tasks:</div>
          <ul className="space-y-1">
            {hiddenTasksInfo.tasks.slice(0, 10).map((task) => (
              <li key={task.id} className="truncate">• {task.title}</li>
            ))}
            {hiddenTasksInfo.tasks.length > 10 && (
              <li className="text-gray-400 italic">...and {hiddenTasksInfo.tasks.length - 10} more</li>
            )}
          </ul>
        </div>,
        document.body
      )}
      
      {/* Project Detail Modal */}
      {selectedProject && (
        <ProjectDetailView
          uid={uid}
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
          onDeleted={() => setSelectedProject(null)}
        />
      )}
    </div>
  );
}

export { TasksView };




