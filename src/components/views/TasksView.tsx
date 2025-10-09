// src/components/views/TasksView.tsx
import React, { useState } from "react";
import { Dropdown } from "../shared/Dropdown";
import type { WithId, Task, Blocker, TaskFilters, Project } from "../../types";
import { TaskItem } from "../TaskItem";
import { TaskEditForm } from "../TaskEditForm";
import { createTask } from "../../services/tasks";
import { BlockerModal } from "../BlockerModal";
import { FilterBar, defaultFilters } from "../FilterBar";

// Draggable wrapper for dnd-kit


function isWithinDueFilter(dueISO: string | null, filter: TaskFilters["due"]) {
  if (!dueISO) return filter === "any";
  const due = new Date(dueISO);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const endOfWeek = new Date(startOfToday);
  endOfWeek.setDate(startOfToday.getDate() + 7);

  switch (filter) {
    case "any":
      return true;
    case "overdue":
      return due < startOfToday;
    case "today":
      return due >= startOfToday && due < endOfToday;
    case "week":
      return due >= startOfToday && due < endOfWeek;
  }
}

const arrangeOptions = [
  { value: "status", label: "Status" },
  { value: "title", label: "Title" },
  { value: "dueDate", label: "Due Date" },
  { value: "priority", label: "Priority" },
  { value: "assigned", label: "Assigned" },
  { value: "age", label: "Age" },
];

export const TasksView: React.FC<{
  uid: string;
  allTasks: WithId<Task>[];
  allBlockers: WithId<Blocker>[];
  allProjects: WithId<Project>[];
  openBlockerModal: (t: any) => void;
  openBlockerManagerModal: (t: any) => void;
  setPromotingTask: (t: any) => void;
}> = ({ uid, allTasks, allBlockers, allProjects, openBlockerManagerModal, setPromotingTask }) => {
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [blockerModalTask, setBlockerModalTask] = useState<null | { id: string; title: string; type: "task" }>(null);
  const [quickAdd, setQuickAdd] = useState("");
  const [filters, setFilters] = useState<TaskFilters>(defaultFilters);
  const [arrangeBy, setArrangeBy] = useState<string>("age");
  const [reverseOrder, setReverseOrder] = useState<boolean>(false);
  const [showAll, setShowAll] = useState(false);
  // Remove dragList; use computeTasksWithoutProject directly

  // ...existing code...

  // ...existing code...
  // ...existing code...
  // ...existing code...
  // ...existing code...
  // ...existing code...

  // Compute filtered/sorted list for display and drag
  const computeTasksWithoutProject = () => {
    let list = allTasks.filter((t) => !t.projectId);
    if (showAll) return list;
    // ...existing filter logic...
    if (!filters.includeArchived) {
      list = list.filter((t) => t.status !== "archived");
    }
    if (filters.status.length > 0) {
      list = list.filter((t) => {
        const statusMap: Record<string, string[]> = {
          active: ["not_started", "in_progress", "blocked"],
          blocked: ["blocked"],
          done: ["done"],
          archived: ["archived"],
        };
        return filters.status.some((f) => statusMap[f]?.includes(t.status));
      });
    }
    if (filters.minPriority.length > 0) {
      list = list.filter((t) => filters.minPriority.some((p) => t.priority === p));
    }
    if (filters.due.length > 0) {
      list = list.filter((t) => filters.due.some((d) => isWithinDueFilter(t.dueDate, d as any)));
    }
    if (filters.assigned && filters.assigned.length > 0) {
      list = list.filter((t: any) => {
        const isNone = !t.assignee || t.assignee === null || t.assignee === undefined;
        if (filters.assigned.includes("(None)")) {
          // Show tasks with no assignee if '(None)' is selected
          if (isNone) return true;
        }
        if (typeof t.assignee === "object" && t.assignee !== null) {
          return filters.assigned?.includes(t.assignee.name) || filters.assigned?.includes(t.assignee.id);
        }
        return filters.assigned?.includes(t.assignee);
      });
    }
    return list;
  };

  // Sort tasks by arrangeBy
  function sortTasks(tasks) {
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
            ? a.assignee.name || a.assignee.id || JSON.stringify(a.assignee)
            : a.assignee || "";
          const bAssignee = typeof b.assignee === "object" && b.assignee !== null
            ? b.assignee.name || b.assignee.id || JSON.stringify(b.assignee)
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

  // Group tasks by selected criteria, sorting each group by arrangeBy
  function groupTasks(tasks, groupBy) {
    if (!groupBy || groupBy === "none") return { "": sortTasks(tasks) };
    const groups = {};
    for (const t of tasks) {
      let key = "";
      if (groupBy === "status") key = t.status || "(none)";
      else if (groupBy === "priority") key = String(t.priority ?? "(none)");
      else if (groupBy === "due") key = t.dueDate ? t.dueDate.slice(0, 10) : "(none)";
      else if (groupBy === "assigned") key = t.assignee ? (typeof t.assignee === "object" ? t.assignee.name || t.assignee.id : t.assignee) : "(none)";
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

      <div className="mt-4 flex flex-col md:flex-row md:items-center md:gap-4">
        <div className="flex flex-wrap items-center gap-3 bg-white/80 dark:bg-surface/80 rounded-2xl shadow px-4 py-3 border border-gray-200 dark:border-gray-700 w-full">
          <FilterBar
            filters={filters}
            onChange={setFilters}
            allAssignees={Array.from(new Set(
              allTasks
                .filter((t: any) => t.assignee)
                .map((t: any) =>
                  typeof t.assignee === "object" && t.assignee !== null
                    ? t.assignee.name || t.assignee.id || JSON.stringify(t.assignee)
                    : t.assignee
                )
                .filter(Boolean)
            ))}
            compact={true}
            showAll={showAll}
            onToggleShowAll={() => setShowAll((v) => !v)}
          />
          {/* Separator after filters */}
          <div className="h-8 w-px bg-gray-300 dark:bg-gray-700 mx-2" />
          {/* Group by and Arrange by controls */}
          <div className="flex items-center gap-2">
            <Dropdown label={`Group by${filters.groupBy && filters.groupBy !== "none" ? `: ${["None","Status","Priority","Due","Assignee"].find((l,i)=>["none","status","priority","due","assigned"][i]===filters.groupBy)}` : ""}`}>
              {["none","status","priority","due","assigned"].map((val, i) => (
                <label key={val} className="flex items-center gap-2 px-2 py-1">
                  <input
                    type="radio"
                    name="groupBy"
                    checked={(filters.groupBy || "none") === val}
                    onChange={() => setFilters({ ...filters, groupBy: val })}
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
              className={`ml-2 px-2 py-1 rounded border text-xs dark:bg-surface ${reverseOrder ? "bg-gray-200" : "bg-white"}`}
              title={reverseOrder ? "Descending" : "Ascending"}
              onClick={() => setReverseOrder(r => !r)}
            >
              {reverseOrder ? "↓" : "↑"}
            </button>
          </div>
        </div>
      </div>


      {/* Tasks grouped list */}
      <div className="bg-surface rounded-lg p-4 mt-2" style={{ minHeight: 200 }}>
        {(() => {
          const grouped = groupTasks(computeTasksWithoutProject(), filters.groupBy);
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
                        const labels = {
                          0: "Any",
                          1: "Low",
                          2: "Medium",
                          3: "High",
                          4: "Urgent",
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
                {grouped[group].map((t) => (
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
                          onStartPromote={() => setPromotingTask(t)}
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
                        onStartEdit={() => setEditingTaskId(t.id)}
                        onStartPromote={() => setPromotingTask(t)}
                        onManageBlockers={() => openBlockerManagerModal({ ...t, type: "task" })}
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
};
