// src/components/views/TasksView.tsx
import React, { useState } from "react";
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
  // Remove dragList; use computeTasksWithoutProject directly

  // ...existing code...

  // ...existing code...
  // ...existing code...
  // ...existing code...
  // ...existing code...
  // ...existing code...
  // ...existing code...

  // Compute filtered/sorted list for display and drag
  const computeTasksWithoutProject = () => {
    let list = allTasks.filter((t) => !t.projectId);
    if (!filters.includeArchived) {
      list = list.filter((t) => t.status !== "archived");
    }
    if (filters.status !== "all") {
      list = list.filter((t) => {
        if (filters.status === "active")
          return t.status === "not_started" || t.status === "in_progress" || t.status === "blocked";
        return t.status === (filters.status as Task["status"]);
      });
    }
    list = list.filter((t) => t.priority >= filters.minPriority);
    list = list.filter((t) => isWithinDueFilter(t.dueDate, filters.due));
    // Filter by assigned
    if (filters.assigned) {
      list = list.filter((t: any) => {
        if (typeof t.assignee === "object" && t.assignee !== null) {
          return (
            t.assignee.name === filters.assigned ||
            t.assignee.id === filters.assigned
          );
        }
        return t.assignee === filters.assigned;
      });
    }
    if (arrangeBy === "order" && list.length > 0 && list.every(t => typeof t.order === "number")) {
      list = [...list].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      if (reverseOrder) list.reverse();
      return list;
    }
    list = [...list];
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
        list.sort((a: any, b: any) => {
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
  };

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
        <h1 className="text-2xl font-bold dark:text-accent text-gray-900">Quick Tasks</h1>
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
        />
        <div className="mt-2 md:mt-0 flex items-center gap-2 bg-surface rounded-lg p-2">
          <label htmlFor="arrangeBy" className="text-sm dark:text-gray-300 text-gray-600">Arrange by:</label>
          <select
            id="arrangeBy"
            className="border dark:border-gray-700 border-gray-300 rounded px-2 py-1 text-sm dark:bg-surface dark:text-gray-100"
            value={arrangeBy}
            onChange={e => setArrangeBy(e.target.value)}
          >
            {arrangeOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
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

      {/* Quick Tasks sortable list only */}
      <div className="bg-surface rounded-lg p-4 mt-2" style={{ minHeight: 200 }}>
        <ul className="space-y-2">
          {computeTasksWithoutProject().length > 0
            ? computeTasksWithoutProject().map((t) => (
                <li
                  key={t.id}
                >
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
                            // Update local allTasks state if you have a setter
                            // For now, force a reload by closing the edit window
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
              ))
            : <li className="text-sm dark:text-gray-500 text-gray-500 py-6 text-center">No tasks match your filters.</li>
          }
        </ul>
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
