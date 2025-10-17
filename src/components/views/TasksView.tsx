// src/components/views/TasksView.tsx
import React, { useState, useMemo } from "react";
import { Dropdown } from "../shared/Dropdown";
import type { WithId, Task, Blocker, TaskFilters, Project, TaskAssignee, DueFilter, StatusFilter } from "../../types";
import { TaskItem } from "../TaskItem";
import { TaskEditForm } from "../TaskEditForm";
import { createTask } from "../../services/tasks";
import { BlockerModal } from "../BlockerModal";
import { FilterBar, defaultFilters } from "../FilterBar";
// Removed SimpleFilterBar

// Draggable wrapper for dnd-kit

// Main TasksView component

interface TasksViewProps {
  uid: string;
  allTasks: WithId<Task>[];
  allProjects: WithId<Project>[];
  allBlockers: WithId<Blocker>[];
}

function TasksView({ uid, allTasks, allProjects, allBlockers }: TasksViewProps) {
  const FILTERS_KEY = "taskAppDefaultFilters_TasksView";
  const [filters, setFiltersState] = useState(() => {
    const saved = localStorage.getItem(FILTERS_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
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
  const filtersPanelRef = React.useRef<HTMLDivElement | null>(null);
  const toggleButtonRef = React.useRef<HTMLButtonElement | null>(null);

  // Count active (non-default) filters for badge display
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.status && filters.status.length > 0) count++;
    // Priority filter is active if it doesn't include 0 (Any) or doesn't have all thresholds
    if (filters.minPriority && filters.minPriority.length > 0 && !filters.minPriority.includes(0) && filters.minPriority.length < 5) count++;
    if (filters.due && filters.due.length > 0 && !filters.due.includes("any")) count++;
    if (filters.assigned && filters.assigned.length > 0) count++;
    return count;
  }, [filters]);

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
      case "month":
        // Calculate end of current month
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        return due >= startOfToday && due < endOfMonth;
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
    let list = allTasks.filter((t: WithId<Task>) => !t.projectId);
    if (showAll) return list;
    
    // Apply search filter first
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
      // If includes 0 or all thresholds [0, 25, 50, 75, 90], show all tasks
      const hasAllPriorities = filters.minPriority.includes(0) || (filters.minPriority.length === 5 && [0, 25, 50, 75, 90].every(p => filters.minPriority.includes(p)));
      
      if (!hasAllPriorities) {
        // Show tasks that meet at least one of the selected priority thresholds
        list = list.filter((t: WithId<Task>) => {
          // For each selected threshold, check if task priority >= threshold
          return filters.minPriority.some((threshold: number) => t.priority >= threshold);
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
  }, [allTasks, showAll, filters, searchQuery]);


  // Memoized unique assignees list to prevent recalculation
  const uniqueAssignees = useMemo(() => {
    return Array.from(new Set(
      allTasks.map((t) => 
        typeof t.assignee === "string" ? t.assignee : t.assignee?.name
      ).filter((v): v is string => Boolean(v))
    ));
  }, [allTasks]);

  // Sort tasks by arrangeBy
  function sortTasks(tasks: WithId<Task>[]): WithId<Task>[] {
    let list = [...tasks];
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
  }

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
  }, [filteredTasks, filters.groupBy, arrangeBy, reverseOrder]);

  // Remove effect that updates dragList from backend unless a drag is in progress



  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAdd.trim()) return;
    await createTask(uid, quickAdd.trim(), null);
    setQuickAdd("");
    // Do not manually set dragList here; let Firestore update allTasks and drive dragList
  };

  // ...existing code...
  return (
  <div className="rounded-xl p-6 shadow-lg transition-colors duration-200">
      <div className="flex items-end justify-between">
  <h1 className="text-2xl font-bold dark:text-accent text-gray-900">Tasks</h1>
      </div>

      <form onSubmit={handleQuickAdd} className="mt-3">
        <input
          className="w-full border dark:border-gray-700 border-gray-300 rounded-lg px-3 py-2 text-base !bg-white dark:bg-surface dark:text-gray-100"
          placeholder="✨ Add a new task..."
          value={quickAdd}
          onChange={(e) => setQuickAdd(e.target.value)}
        />
      </form>

      {/* Filters Dropdown */}
      <div className="mt-4 relative">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            {/* Persistent Search */}
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tasks..."
                className="pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-56"
              />
            </div>
            <button
              type="button"
              aria-haspopup="true"
              aria-expanded={showFilters}
              aria-controls="filters-panel"
              ref={toggleButtonRef}
              onClick={() => setShowFilters((v) => !v)}
              className={`relative flex items-center gap-2 px-3 py-2 text-sm rounded-lg border shadow transition-colors ${showFilters ? 'bg-blue-50 border-blue-400 text-blue-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
            >
              <svg className={`w-4 h-4 ${showFilters ? 'text-blue-600' : 'text-gray-600'}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18M6 8h12M9 12h6M11 16h2" /></svg>
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full leading-none">{activeFilterCount}</span>
              )}
              <svg className={`w-3 h-3 ml-1 transition-transform ${showFilters ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
            </button>
            {/* Mode toggle removed */}
          </div>
          <div className="flex items-center gap-2">
            <Dropdown label={`Group by${filters.groupBy && filters.groupBy !== "none" ? `: ${["None","Status","Priority","Due","Assignee"][ ["none","status","priority","due","assigned"].indexOf(filters.groupBy) ]}` : ""}`}> 
              { ["none","status","priority","due","assigned"].map((val, i) => (
                <label key={val} className="flex items-center gap-2 px-2 py-1">
                  <input
                    type="radio"
                    name="groupBy"
                    checked={(filters.groupBy || "none") === val}
                    onChange={() => setFiltersWithPersistence({ ...filters, groupBy: val as TaskFilters["groupBy"] })}
                  />
                  <span>{["None","Status","Priority","Due","Assignee"][i]}</span>
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
              className="rounded px-2 py-1 border"
              onClick={() => setReverseOrder((v) => !v)}
              title="Reverse order"
            >
              <span className="inline-block rotate-180">↑</span>
            </button>
          </div>
        </div>
        {showFilters && (
          <div id="filters-panel" ref={filtersPanelRef} className="absolute z-20 mt-2 left-0 right-0 bg-white dark:bg-surface border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-4" role="region" aria-label="Filters">
            <FilterBar
              filters={filters}
              onChange={setFiltersWithPersistence}
              allAssignees={uniqueAssignees}
              localStorageKey={FILTERS_KEY}
              compact={false}
              showAll={showAll}
              onToggleShowAll={() => setShowAll((v) => !v)}
            />
          </div>
        )}
      </div>


      {/* Tasks grouped list */}
      <div className="bg-surface rounded-lg p-4 mt-2" style={{ minHeight: 200 }}>
        {(() => {
          const grouped = groupedTasks;
          const groupKeys = Object.keys(grouped);
          if (groupKeys.length === 1 && groupKeys[0] === "" && grouped[""]?.length === 0) {
            return <div className="text-sm dark:text-gray-500 text-gray-500 py-6 text-center">No tasks match your filters.</div>;
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
              <ul className="space-y-2">
                {grouped[group].map((t: WithId<Task>) => (
                  <li key={t.id}>
                    {editingTaskId === t.id ? (
                      <div className="mt-2">
                        <TaskEditForm
                          uid={uid}
                          task={t}
                          allProjects={allProjects}
                          allBlockers={allBlockers}
                          searchQuery={searchQuery}
                          onSave={() => setEditingTaskId(null)}
                          onCancel={() => setEditingTaskId(null)}
                          // ...existing code...
                          onDelete={async () => {
                            if (window.confirm("Delete this task?")) {
                              const { removeTask } = await import("../../services/tasks");
                              await removeTask(uid, t.id);
                              setEditingTaskId(null);
                            }
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
                        allBlockers={allBlockers}
                        allTasks={filteredTasks}
                        searchQuery={searchQuery}
                        onStartEdit={() => setEditingTaskId(t.id)}
                        // ...existing code...
                        onManageBlockers={() => {}}
                        onStartBlock={() => setBlockerModalTask({ id: t.id, title: t.title, type: "task" })}
                        onArchive={async () => {
                          const { archiveTask } = await import("../../services/tasks");
                          await archiveTask(uid, t.id);
                        }}
                        onDelete={async () => {
                          const { removeTask } = await import("../../services/tasks");
                          await removeTask(uid, t.id);
                        }}
                        onUnarchive={async () => {
                          const { unarchiveTask } = await import("../../services/tasks");
                          await unarchiveTask(uid, t.id);
                        }}
                        onStatusChange={async (newStatus) => {
                          const { updateTask } = await import("../../services/tasks");
                          await updateTask(uid, t.id, { status: newStatus });
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
    </div>
  );
}

export { TasksView };




