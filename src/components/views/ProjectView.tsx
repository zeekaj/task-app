import React, { useState } from "react";
// Removed dnd-kit imports

import type { Project, TaskFilters, WithId, Task } from "../../types";
import { TaskItem } from "../TaskItem";
import { TaskEditForm } from "../TaskEditForm";
import { FilterBar, defaultFilters } from "../FilterBar";
import { createTask } from "../../services/tasks";
import { BlockerManagerModal } from "../BlockerManagerModal";

const ProjectView: React.FC<{
  // Props only, no logic or debug logs here
  uid: string;
  projectId: string;
  allTasks: any[];
  allBlockers: any[];
  allProjects: any[];
  openBlockerModal: (t: any) => void;
  setPromotingTask: (t: any) => void;
}> = ({
  uid,
  projectId,
  allTasks,
  allBlockers,
  allProjects,
  openBlockerModal,
  setPromotingTask,
}) => {
  // Your component logic here
  // Modal state for managing blockers
  const [showBlockerManager, setShowBlockerManager] = useState<{ open: boolean; taskId: string | null }>({ open: false, taskId: null });

  // Function to open the manage blockers modal for a task
  const openManageBlockers = (task: any) => {
    setShowBlockerManager({ open: true, taskId: task.id });
  };
  // Find the current project
  const currentProject = allProjects.find((p: any) => p.id === projectId);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const projectBlockers = allBlockers.filter((b: any) => b.entityId === projectId);
  // Blocked tasks for this project
  const blockedTasks = allTasks.filter((t: any) => t.projectId === projectId && t.status === 'blocked');
  const [filters, setFilters] = useState<TaskFilters>(defaultFilters);
  const [quickAdd, setQuickAdd] = useState("");
  // Quick add handler for project tasks
  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAdd.trim()) return;
    await createTask(uid, quickAdd.trim(), projectId);
    setQuickAdd("");
    // Do not manually set dragList here; let Firestore update allTasks and drive dragList
  };
  const [arrangeBy, setArrangeBy] = useState<string>("age");
  const [reverseOrder, setReverseOrder] = useState<boolean>(false);

  const arrangeOptions = [
    { value: "status", label: "Status" },
    { value: "title", label: "Title" },
    { value: "dueDate", label: "Due Date" },
    { value: "priority", label: "Priority" },
    { value: "assigned", label: "Assigned" },
    { value: "age", label: "Age" },
  ];

  // Filtering logic (copied from TasksView)
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

  // ...other hooks and helper functions...


  // Compute filtered/sorted list for display and drag
  const computeProjectTasks = () => {
  // Only show non-blocked tasks in main list
  let list = allTasks.filter((t: any) => t.projectId === projectId && t.status !== 'blocked');
    if (!filters.includeArchived) {
      list = list.filter((t: any) => t.status !== "archived");
    }
    if (filters.status !== "all") {
      list = list.filter((t: any) => {
        if (filters.status === "active")
          return t.status === "not_started" || t.status === "in_progress" || t.status === "blocked";
        return t.status === filters.status;
      });
    }
    list = list.filter((t: any) => t.priority >= filters.minPriority);
    list = list.filter((t: any) => isWithinDueFilter(t.dueDate, filters.due));
    if (arrangeBy === "order" && list.length > 0 && list.every((t: any) => typeof t.order === "number")) {
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
          const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
          const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
          return aTime - bTime;
        });
        break;
    }
    if (reverseOrder) list.reverse();
    return list;
  };

  // No dragList; always use computeProjectTasks()
  // ...existing code...

  // Place debug log here, after computeProjectTasks and before return
  if (editingTaskId) {
    const editingTask = computeProjectTasks().find((t: any) => t.id === editingTaskId) || allTasks.find((t: any) => t.id === editingTaskId);
    console.log('ProjectView: editingTaskId', editingTaskId, 'editingTask', editingTask);
  }
  // dnd-kit drag-and-drop handlers

  return (
    <div className="dark:bg-background bg-white rounded-xl p-6 shadow-lg transition-colors duration-200">
      <h2 className="text-2xl font-bold mb-2 dark:text-accent text-gray-900">{currentProject?.title || "Project"}</h2>
      <div className="mb-4 dark:text-gray-300 text-gray-600 flex items-center gap-2">
        <span>Status:</span>
        {currentProject && (
          <select
            className="border dark:border-gray-700 border-gray-300 rounded px-2 py-1 text-sm dark:bg-surface dark:text-gray-100"
            value={currentProject.status}
            onChange={async (e) => {
              const newStatus = e.target.value;
              if (newStatus !== currentProject.status) {
                const { updateProject } = await import("../../services/projects");
                await updateProject(uid, currentProject.id, { status: newStatus as Project["status"] });
                window.location.reload(); // reload to reflect status change
              }
            }}
          >
            <option value="not_started">Not Started</option>
            <option value="in_progress">In Progress</option>
            <option value="blocked">Blocked</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </select>
        )}
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold dark:text-red-400 text-red-800">Blockers</h3>
          {(projectBlockers.length + blockedTasks.length) > 1 && (
            <button
              className="px-3 py-1 rounded bg-accent text-white text-sm font-semibold hover:bg-indigo-700 dark:bg-accent dark:hover:bg-indigo-500 transition-colors"
              onClick={() => setShowBlockerManager({ open: true, taskId: 'ALL' })}
            >
              Manage Blockers
            </button>
          )}
        </div>
        {(projectBlockers.length > 0 || blockedTasks.length > 0) ? (
          <div className="space-y-6">
            {/* Project-level blockers */}
            <div>
              <h4 className="font-semibold text-red-700 dark:text-red-300 mb-2">Project Blockers</h4>
              {projectBlockers.length > 0 ? (
                <ul className="space-y-2">
                  {projectBlockers.map((blocker: any) => (
                    <li key={blocker.id} className="p-3 dark:bg-red-900 bg-red-50 dark:border-red-800 border-red-200 rounded-lg flex items-center justify-between">
                      <div>
                        <div className="font-semibold dark:text-red-300 text-red-800">{blocker.reason}</div>
                        {blocker.waitingOn && <div className="text-xs dark:text-red-200 text-red-700">Waiting on: {blocker.waitingOn}</div>}
                        {blocker.expectedDate && <div className="text-xs dark:text-red-200 text-red-700">Expected: {blocker.expectedDate.toDate ? blocker.expectedDate.toDate().toLocaleDateString() : new Date(blocker.expectedDate).toLocaleDateString()}</div>}
                      </div>
                      <button onClick={() => openBlockerModal(blocker)} className="text-sm dark:text-accent text-blue-600 hover:underline">Open Blocker Modal</button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">No project blockers.</p>
              )}
            </div>
            {/* Task-level blockers, grouped by task */}
            <div>
              <h4 className="font-semibold text-red-700 dark:text-red-300 mb-2">Task Blockers</h4>
              {blockedTasks.length > 0 ? (
                <ul className="space-y-4">
                  {blockedTasks.map((task: any) => {
                    const taskBlockers = allBlockers.filter((b: any) => b.entityId === task.id && b.status === 'active');
                    if (taskBlockers.length === 0) return null;
                    return (
                      <li key={task.id} className="bg-white dark:bg-red-950 border border-gray-200 dark:border-red-800 rounded-lg p-3">
                        <div className="font-semibold text-gray-800 dark:text-red-200 mb-1">Task: {typeof task.title === 'string' ? task.title : JSON.stringify(task.title)}</div>
                        <ul className="space-y-2">
                          {taskBlockers.map((blocker: any) => (
                            <li key={blocker.id} className="p-3 dark:bg-red-900 bg-red-50 dark:border-red-800 border-red-200 rounded-lg flex items-center justify-between">
                              <div>
                                <div className="font-semibold dark:text-red-300 text-red-800">{blocker.reason}</div>
                                {blocker.waitingOn && <div className="text-xs dark:text-red-200 text-red-700">Waiting on: {blocker.waitingOn}</div>}
                                {blocker.expectedDate && <div className="text-xs dark:text-red-200 text-red-700">Expected: {blocker.expectedDate.toDate ? blocker.expectedDate.toDate().toLocaleDateString() : new Date(blocker.expectedDate).toLocaleDateString()}</div>}
                              </div>
                              <button onClick={() => openManageBlockers(task)} className="text-sm dark:text-accent text-blue-600 hover:underline">Edit</button>
                            </li>
                          ))}
                        </ul>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">No blocked tasks.</p>
              )}
            </div>
          </div>
        ) : (
          <p className="dark:text-gray-500 text-gray-500">No blockers for this project.</p>
        )}
      </div>

      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2 dark:text-accent text-gray-900">Tasks</h3>
        <form onSubmit={handleQuickAdd} className="mt-3">
          <input
            className="w-full border dark:border-gray-700 border-gray-300 rounded-lg px-3 py-2 text-base dark:bg-surface dark:text-gray-100"
            placeholder="✨ Add a new task to this project..."
            value={quickAdd}
            onChange={(e) => setQuickAdd(e.target.value)}
          />
        </form>
        {/* Filters and Arrange By */}
        <div className="mt-4 flex flex-col md:flex-row md:items-center md:gap-4">
          <FilterBar filters={filters} onChange={setFilters} />
          <div className="mt-2 md:mt-0 flex items-center gap-2">
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
        {computeProjectTasks().length > 0 ? (
          <ul className="space-y-2">
            {computeProjectTasks().map((task: WithId<Task>) => (
              <li
                key={task.id}
              >
                {editingTaskId === task.id ? (
                  <div className="mt-2">
                    <TaskEditForm
                      uid={uid}
                      task={task}
                      allProjects={allProjects}
                      onSave={() => setEditingTaskId(null)}
                      onCancel={() => setEditingTaskId(null)}
                      onStartPromote={() => setPromotingTask(task)}
                      onDelete={async () => {
                        if (window.confirm("Delete this task?")) {
                          const { removeTask } = await import("../../services/tasks");
                          await removeTask(uid, task.id);
                          setEditingTaskId(null);
                        }
                      }}
                      onArchive={async () => {
                        const { archiveTask } = await import("../../services/tasks");
                        await archiveTask(uid, task.id);
                      }}
                      onUnarchive={async () => {
                        const { unarchiveTask } = await import("../../services/tasks");
                        await unarchiveTask(uid, task.id);
                      }}
                      onStatusChange={async (newStatus) => {
                        const { updateTask } = await import("../../services/tasks");
                        await updateTask(uid, task.id, { status: newStatus });
                      }}
                    />
                  </div>
                ) : (
                  <TaskItem
                    uid={uid}
                    task={task}
                    allBlockers={allBlockers}
                    onStartEdit={() => {
                      console.log('ProjectView: Edit clicked for task', task.id);
                      setEditingTaskId(task.id);
                    }}
                    onStartPromote={() => setPromotingTask(task)}
                    onManageBlockers={() => openManageBlockers(task)}
                    onStartBlock={() => openBlockerModal({ ...task, type: "task" })}
                    onArchive={async () => {
                      const { archiveTask } = await import("../../services/tasks");
                      await archiveTask(uid, task.id);
                    }}
                    onDelete={async () => {
                      const { removeTask } = await import("../../services/tasks");
                      await removeTask(uid, task.id);
                    }}
                    onUnarchive={async () => {
                      const { unarchiveTask } = await import("../../services/tasks");
                      await unarchiveTask(uid, task.id);
                    }}
                    onStatusChange={async (newStatus) => {
                      const { updateTask } = await import("../../services/tasks");
                      await updateTask(uid, task.id, { status: newStatus });
                    }}
                  />
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="dark:text-gray-500 text-gray-500">No tasks for this project.</p>
        )}
      </div>

      {/* Removed All Projects list as requested */}
    {showBlockerManager.open && (
      <BlockerManagerModal
        uid={uid}
        entity={
          showBlockerManager.taskId === 'ALL'
            ? { id: projectId, title: currentProject?.title || '', type: 'project', showAll: true }
            : showBlockerManager.taskId
              ? {
                  id: showBlockerManager.taskId,
                  title: (() => {
                    const t = allTasks.find((tt: any) => tt.id === showBlockerManager.taskId);
                    return t ? (typeof t.title === 'string' ? t.title : String(t.title)) : '';
                  })(),
                  type: 'task',
                }
              : {
                  id: projectId,
                  title: currentProject?.title || '',
                  type: 'project',
                }
        }
        allBlockers={allBlockers}
        allTasks={allTasks}
        onClose={() => setShowBlockerManager({ open: false, taskId: null })}
      />
    )}
    </div>
  );
};

export { ProjectView };