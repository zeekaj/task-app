// src/components/views/TasksView.tsx
import React, { useMemo, useState } from "react";
import type { WithId, Task, Blocker, TaskFilters, Project } from "../../types";
import { TaskItem } from "../TaskItem";
import { TaskEditForm } from "../TaskEditForm";
import { createTask } from "../../services/tasks";
import { FilterBar, defaultFilters } from "../FilterBar";

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

export const TasksView: React.FC<{
  uid: string;
  allTasks: WithId<Task>[];
  allBlockers: WithId<Blocker>[];
  allProjects: WithId<Project>[];
  openBlockerModal: (t: any) => void;
  openBlockerManagerModal: (t: any) => void;
  setPromotingTask: (t: any) => void;
}> = ({ uid, allTasks, allBlockers, allProjects, openBlockerModal, openBlockerManagerModal, setPromotingTask }) => {
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [quickAdd, setQuickAdd] = useState("");
  const [quickAddProjectId, setQuickAddProjectId] = useState<string | null>(null);
  const [filters, setFilters] = useState<TaskFilters>(defaultFilters);

  const tasksWithoutProject = useMemo(() => {
    let list = allTasks.filter((t) => !t.projectId);

    // Status filter (high-level)
    if (!filters.includeArchived) {
      list = list.filter((t) => t.status !== "archived");
    }
    if (filters.status !== "all") {
      list = list.filter((t) => {
        if (filters.status === "active")
          return t.status === "not_started" || t.status === "in_progress";
        return t.status === (filters.status as Task["status"]);
      });
    }

    // Priority
    list = list.filter((t) => t.priority >= filters.minPriority);

    // Due
    list = list.filter((t) => isWithinDueFilter(t.dueDate, filters.due));

    return list;
  }, [allTasks, filters]);

  const handleDeleteFromEdit = (taskId: string) => {
    if (window.confirm("Delete this task?")) {
      setEditingTaskId(null);
    }
  };

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAdd.trim()) return;
    await createTask(uid, quickAdd.trim(), quickAddProjectId);
    setQuickAdd("");
  };

  return (
    <div>
      <div className="flex items-end justify-between">
        <h1 className="text-2xl font-bold">Quick Tasks</h1>
      </div>

      <form onSubmit={handleQuickAdd} className="mt-3">
        <input
          className="w-full border rounded-lg px-3 py-2 text-base"
          placeholder="✨ Add a new task..."
          value={quickAdd}
          onChange={(e) => setQuickAdd(e.target.value)}
        />
      </form>

      <div className="mt-4">
        <FilterBar filters={filters} onChange={setFilters} />
      </div>

      <ul className="space-y-2 mt-2">
        {tasksWithoutProject.map((t) =>
          editingTaskId === t.id ? (
            <li key={t.id}>
              <TaskEditForm
                uid={uid}
                task={t}
                onSave={() => setEditingTaskId(null)}
                onCancel={() => setEditingTaskId(null)}
                onStartPromote={() => setPromotingTask(t)}
                onDelete={() => handleDeleteFromEdit(t.id)}
              />
            </li>
          ) : (
            <li key={t.id}>
              <TaskItem
                uid={uid}
                task={t}
                allBlockers={allBlockers}
                onStartEdit={() => setEditingTaskId(t.id)}
                onStartPromote={() => setPromotingTask(t)}
                onManageBlockers={() => openBlockerManagerModal({ ...t, type: "task" })}
                onStartBlock={() => openBlockerModal({ ...t, type: "task" })}
              />
            </li>
          )
        )}
        {tasksWithoutProject.length === 0 && (
          <li className="text-sm text-gray-500 py-6 text-center">No tasks match your filters.</li>
        )}
      </ul>
    </div>
  );
};
