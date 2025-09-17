import React, { useState, useEffect } from "react";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
// import { QuickAddTask } from "./QuickAddTask"; // Commented out, file not found
import type { Project, TaskFilters } from "../../types";
import { TaskItem } from "../TaskItem";
import { TaskEditForm } from "../TaskEditForm";
import { FilterBar, defaultFilters } from "../FilterBar";
import { createTask } from "../../services/tasks";


import { useDroppable } from "@dnd-kit/core";

import type { WithId, Task, Blocker } from "../../types";

interface ProjectTaskDraggableProps {
  id: string;
  task: WithId<Task>;
  uid: string;
  allBlockers: WithId<Blocker>[];
  onStartEdit: () => void;
  onStartPromote: () => void;
  onManageBlockers: () => void;
  onStartBlock: () => void;
}

function ProjectTaskDraggable({
  id,
  task,
  uid,
  allBlockers,
  onStartEdit,
  onStartPromote,
  onManageBlockers,
  onStartBlock,
}: ProjectTaskDraggableProps) {
  // useSortable for both sorting and cross-list moves
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  // useDroppable for drop target
  const { setNodeRef: setDroppableNodeRef, isOver } = useDroppable({ id });

  // Compose refs for sortable and droppable
  const composedRef = (node: HTMLElement | null) => {
    setNodeRef(node);
    setDroppableNodeRef(node);
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 100 : "auto",
    outline: isOver ? "2px solid #3b82f6" : undefined,
  };

  return (
    <li ref={composedRef} style={style} {...attributes}>
      <TaskItem
        uid={uid}
        task={task}
        allBlockers={allBlockers}
        onStartEdit={onStartEdit}
        onStartPromote={onStartPromote}
        onManageBlockers={onManageBlockers}
        onStartBlock={onStartBlock}
        dragHandleProps={listeners}
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
    </li>
  );
}

const ProjectView: React.FC<{
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

  // Find the current project
  const currentProject = allProjects.find((p: any) => p.id === projectId);
    const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const projectBlockers = allBlockers.filter((b: any) => b.entityId === projectId);
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

  // --- Optimistic drag-and-drop state for project tasks ---
  const [dragList, setDragList] = useState<any[]>([]);

  // Compute filtered/sorted list for display and drag
  const computeProjectTasks = () => {
    let list = allTasks.filter((t: any) => t.projectId === projectId);
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
    if (list.length > 0 && list.every((t: any) => typeof t.order === "number")) {
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

  // Optimistic UI: Only update dragList from backend if it differs from current dragList
  useEffect(() => {
    const computed = computeProjectTasks();
    if (
      dragList.length !== computed.length ||
      dragList.some((t, i) => t.id !== computed[i]?.id)
    ) {
      setDragList(computed);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allTasks, filters, arrangeBy, reverseOrder, projectId]);
  // dnd-kit drag-and-drop handlers

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">{currentProject?.title || "Project"}</h2>
      <div className="mb-4 text-gray-600 flex items-center gap-2">
        <span>Status:</span>
        {currentProject && (
          <select
            className="border rounded px-2 py-1 text-sm"
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
            <option value="in_progress">In Progress</option>
            <option value="blocked">Blocked</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </select>
        )}
      </div>

      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Blockers</h3>
        {projectBlockers.length > 0 ? (
          <ul className="space-y-2">
            {projectBlockers.map((blocker: any) => (
              <li key={blocker.id} className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
                <span className="font-semibold text-red-800">{blocker.reason}</span>
                <button onClick={() => openBlockerModal(blocker)} className="text-sm text-blue-600 hover:underline">Open Blocker Modal</button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">No blockers for this project.</p>
        )}
      </div>

      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Tasks</h3>
        <form onSubmit={handleQuickAdd} className="mt-3">
          <input
            className="w-full border rounded-lg px-3 py-2 text-base"
            placeholder="✨ Add a new task to this project..."
            value={quickAdd}
            onChange={(e) => setQuickAdd(e.target.value)}
          />
        </form>
        {/* Filters and Arrange By */}
        <div className="mt-4 flex flex-col md:flex-row md:items-center md:gap-4">
          <FilterBar filters={filters} onChange={setFilters} />
          <div className="mt-2 md:mt-0 flex items-center gap-2">
            <label htmlFor="arrangeBy" className="text-sm text-gray-600">Arrange by:</label>
            <select
              id="arrangeBy"
              className="border rounded px-2 py-1 text-sm"
              value={arrangeBy}
              onChange={e => setArrangeBy(e.target.value)}
            >
              {arrangeOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <button
              type="button"
              className={`ml-2 px-2 py-1 rounded border text-xs ${reverseOrder ? "bg-gray-200" : "bg-white"}`}
              title={reverseOrder ? "Descending" : "Ascending"}
              onClick={() => setReverseOrder(r => !r)}
            >
              {reverseOrder ? "↓" : "↑"}
            </button>
          </div>
        </div>
        {dragList.length > 0 ? (
          <SortableContext
            items={dragList.map((task: any) => task.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="space-y-2">
              {dragList.map((task: WithId<Task>) => (
                <ProjectTaskDraggable
                  key={task.id}
                  id={task.id}
                  task={task}
                  uid={uid}
                  allBlockers={allBlockers}
                  onStartEdit={() => setEditingTaskId(task.id)}
                  onStartPromote={() => setPromotingTask(task)}
                  onManageBlockers={() => openBlockerModal({ ...task, type: "task" })}
                  onStartBlock={() => openBlockerModal({ ...task, type: "task" })}
                />
              ))}
            </ul>
          </SortableContext>
        ) : (
          <p className="text-gray-500">No tasks for this project.</p>
        )}
        {/* Render TaskEditForm below the list if editingTaskId is set */}
        {editingTaskId && (() => {
          const task = dragList.find(t => t.id === editingTaskId) || allTasks.find(t => t.id === editingTaskId);
          if (!task) return null;
          return (
            <div className="mt-4">
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
          );
        })()}
      </div>

      {/* Removed All Projects list as requested */}
    </div>
  );
};

export { ProjectView };