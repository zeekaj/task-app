// src/components/views/TasksView.tsx
import React, { useState, useMemo } from "react";
import { Dropdown } from "../shared/Dropdown";
import type { WithId, Task, Blocker, TaskFilters, Project, TaskAssignee } from "../../types";
import { TaskItem } from "../TaskItem";
import { TaskEditForm } from "../TaskEditForm";
import { createTask } from "../../services/tasks";
import { BlockerModal } from "../BlockerModal";
import { FilterBar, defaultFilters } from "../FilterBar";

// Draggable wrapper for dnd-kit

// Main TasksView component
import type { DueFilter } from "../../types";

interface TasksViewProps {
  uid: string;
  allTasks: WithId<Task>[];
  allProjects: WithId<Project>[];
  allBlockers: WithId<Blocker>[];
}

function TasksView({ uid, allTasks, allProjects, allBlockers }: TasksViewProps) {
  const FILTERS_KEY = "taskAppDefaultFilters_TasksView";
  const [filters, setFilters] = useState(() => {
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
  const [showAll, setShowAll] = useState(false);
  const [arrangeBy, setArrangeBy] = useState("age");
  const [reverseOrder, setReverseOrder] = useState(false);
  const [quickAdd, setQuickAdd] = useState("");
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
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

  // Memoized filtered task computation to prevent unnecessary recalculations
  const filteredTasks = useMemo((): WithId<Task>[] => {
    let list = allTasks.filter((t: WithId<Task>) => !t.projectId);
    if (showAll) return list;
    if (!filters.includeArchived) {
      list = list.filter((t: WithId<Task>) => t.status !== "archived");
    }
    if (filters.status.length > 0) {
      list = list.filter((t: WithId<Task>) => {
        const statusMap: Record<string, string[]> = {
          active: ["not_started", "in_progress", "blocked"],
          blocked: ["blocked"],
          done: ["done"],
          archived: ["archived"],
        };
  return filters.status.some((f: string) => statusMap[f]?.includes(t.status));
      });
    }
    if (filters.minPriority.length > 0) {
  list = list.filter((t: WithId<Task>) => filters.minPriority.some((p: string) => t.priority === Number(p)));
    }
    if (filters.due.length > 0) {
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
  }, [allTasks, showAll, filters]);

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

      {/* Duplicate filter/group bar removed. Only one remains below. */}
        <div className="mt-4 flex flex-wrap items-center gap-3 bg-white/80 dark:bg-surface/80 rounded-2xl shadow px-4 py-3 border border-gray-200 dark:border-gray-700 w-full">
          <FilterBar
            filters={filters}
            onChange={setFilters}
            allAssignees={uniqueAssignees}
            localStorageKey={FILTERS_KEY}
            compact={false}
            showAll={showAll}
            onToggleShowAll={() => setShowAll((v) => !v)}
          />
          {/* Separator after filters */}
          <div className="h-8 w-px bg-gray-300 dark:bg-gray-700 mx-2" />
          {/* Group by and Arrange by controls */}
          <div className="flex items-center gap-2">
            <Dropdown label={`Group by${filters.groupBy && filters.groupBy !== "none" ? `: ${["None","Status","Priority","Due","Assignee"][ ["none","status","priority","due","assigned"].indexOf(filters.groupBy) ]}` : ""}`}> 
              { ["none","status","priority","due","assigned"].map((val, i) => (
                <label key={val} className="flex items-center gap-2 px-2 py-1">
                  <input
                    type="radio"
                    name="groupBy"
                    checked={(filters.groupBy || "none") === val}
                    onChange={() => setFilters({ ...filters, groupBy: val as TaskFilters["groupBy"] })}
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
              className="rounded px-2 py-1 border ml-2"
              onClick={() => setReverseOrder((v) => !v)}
              title="Reverse order"
            >
              <span className="inline-block rotate-180">↑</span>
            </button>
          </div>
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
                        return `Priority: ${labels[group] || group}`;
                      })()
                    : filters.groupBy === "due"
                    ? `Due: ${group}`
                    : filters.groupBy === "assigned"
                    ? `Assignee: ${group}`
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
                            // Fetch latest task from backend
                            const { getDoc, doc } = await import("firebase/firestore");
                            const { db } = await import("../../firebase");
                            const snap = await getDoc(doc(db, `users/${uid}/tasks/${t.id}`));
                            if (snap.exists()) {
                              setEditingTaskId(null);
                            }
                          }}
                        />
                      </div>
                    ) : (
                      <TaskItem
                        uid={uid}
                        task={t}
                        allBlockers={allBlockers}
                        allTasks={filteredTasks}
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
                        onPriorityChange={() => {}}
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




