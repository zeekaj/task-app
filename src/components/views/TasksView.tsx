// src/components/views/TasksView.tsx
import React, { useState, useRef } from "react";
import {
  // DndContext,
  // closestCenter,
  // DragOverlay,
} from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import {
  // arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { WithId, Task, Blocker, TaskFilters, Project } from "../../types";
import { TaskItem } from "../TaskItem";
import { TaskEditForm } from "../TaskEditForm";
import { createTask } from "../../services/tasks";
import { FilterBar, defaultFilters } from "../FilterBar";

// Draggable wrapper for dnd-kit
type QuickTaskDraggableProps = {
  task: WithId<Task>;
  setEditingTaskId: (id: string) => void;
  allBlockers: WithId<Blocker>[];
  setPromotingTask: (t: WithId<Task>) => void;
  openBlockerManagerModal: (t: any) => void;
  openBlockerModal: (t: any) => void;
  uid: string;
  setDragList: React.Dispatch<React.SetStateAction<WithId<Task>[]>>;
};

function QuickTaskDraggable({ task, setEditingTaskId, allBlockers, setPromotingTask, openBlockerManagerModal, openBlockerModal, uid, setDragList }: QuickTaskDraggableProps) {
  const draggable = useDraggable({ id: task.id });
  const droppable = useDroppable({ id: task.id });
  const isDragging = draggable.isDragging;
  const style = {
    opacity: isDragging ? 0.5 : 1,
    transform: draggable.transform ? `translate3d(${draggable.transform.x}px, ${draggable.transform.y}px, 0)` : undefined,
    // dnd-kit draggable does not have transition property
    background: droppable.isOver ? "#e0f2fe" : undefined, // highlight when hovered
  };
  return (
    <li ref={node => { draggable.setNodeRef(node); droppable.setNodeRef(node); }} style={style} {...draggable.attributes}>
      <TaskItem
        uid={uid}
        task={task}
        allBlockers={allBlockers}
        onStartEdit={() => setEditingTaskId(task.id)}
        onStartPromote={() => setPromotingTask(task)}
        onManageBlockers={() => openBlockerManagerModal({ ...task, type: "task" })}
        onStartBlock={() => openBlockerModal({ ...task, type: "task" })}
        dragHandleProps={draggable.listeners}
        onArchive={async () => {
          console.log('TasksView: archive', task.id);
          const { archiveTask } = await import("../../services/tasks");
          await archiveTask(uid, task.id);
        }}
        onDelete={async () => {
          console.log('TasksView: delete', task.id);
          const { removeTask } = await import("../../services/tasks");
          await removeTask(uid, task.id);
        }}
        onUnarchive={async () => {
          console.log('TasksView: unarchive', task.id);
          const { unarchiveTask } = await import("../../services/tasks");
          await unarchiveTask(uid, task.id);
        }}
        onStatusChange={async (newStatus) => {
          console.log('TasksView: status change', task.id, newStatus);
          const { updateTask } = await import("../../services/tasks");
          await updateTask(uid, task.id, { status: newStatus });
          // Optimistically update dragList so UI reflects new status immediately
          setDragList(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
        }}
      />
    </li>
  );
}

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
}> = ({ uid, allTasks, allBlockers, allProjects, openBlockerModal, openBlockerManagerModal, setPromotingTask }) => {
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [quickAdd, setQuickAdd] = useState("");
  // Removed unused quickAddProjectId state
  const [filters, setFilters] = useState<TaskFilters>(defaultFilters);
  const [arrangeBy, setArrangeBy] = useState<string>("age");
  const [reverseOrder, setReverseOrder] = useState<boolean>(false);

  // Stable state for drag-and-drop list
  const [dragList, setDragList] = useState<WithId<Task>[]>([]);
  const isDragging = useRef(false);

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
    if (list.length > 0 && list.every(t => typeof t.order === "number")) {
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
  React.useEffect(() => {
    if (!isDragging.current) {
      const computed = computeTasksWithoutProject();
      // Only update if the order or ids differ
      if (
        dragList.length !== computed.length ||
        dragList.some((t, i) => t.id !== computed[i]?.id)
      ) {
        setDragList(computed);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allTasks, filters, arrangeBy, reverseOrder]);



  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAdd.trim()) return;
    await createTask(uid, quickAdd.trim(), null);
    setQuickAdd("");
    // Do not manually set dragList here; let Firestore update allTasks and drive dragList
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

      {/* Quick Tasks sortable list only */}
      <div style={{ minHeight: 200 }}>
        <SortableContext items={dragList.map(t => t.id)} strategy={verticalListSortingStrategy}>
          <ul className="space-y-2 mt-2">
            {dragList.length > 0
              ? dragList.map((t) => <QuickTaskDraggable key={t.id} task={t} setEditingTaskId={setEditingTaskId} allBlockers={allBlockers} setPromotingTask={setPromotingTask} openBlockerManagerModal={openBlockerManagerModal} openBlockerModal={openBlockerModal} uid={uid} setDragList={setDragList} />)
              : <li className="text-sm text-gray-500 py-6 text-center">No tasks match your filters.</li>
            }
          </ul>
        </SortableContext>
      </div>
      {/* Render TaskEditForm below the list if editingTaskId is set */}
      {editingTaskId && (
        (() => {
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
        })()
      )}
    </div>
  );
};
