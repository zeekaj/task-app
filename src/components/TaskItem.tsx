// src/components/TaskItem.tsx
import React, { useState, useRef } from "react";
import type { Task, Blocker, WithId } from "../types";
import { updateTask } from "../services/tasks";
import Icon from "./Icon";
// If you do not have an Icon component, create src/components/Icon.tsx with a default export.

const taskStatusConfig: { [key in Task["status"]]: { label: string; classes: string } } = {
  not_started: { label: "Not Started", classes: "bg-white hover:bg-gray-50 border-gray-200" },
  in_progress: { label: "In Progress", classes: "bg-blue-50 hover:bg-blue-100 border-blue-200" },
  done: { label: "Done", classes: "bg-green-50 hover:bg-green-100 border-green-200" },
  blocked: { label: "Blocked", classes: "bg-red-50 hover:bg-red-100 border-red-300" },
  archived: { label: "Archived", classes: "bg-gray-100 border-gray-200 opacity-60" },
};

const priorities: { [key: number]: { label: string; color: string } } = {
  0: { label: "None", color: "bg-gray-200 text-gray-700" },
  1: { label: "Low", color: "bg-gray-400 text-white" },
  2: { label: "Medium", color: "bg-blue-500 text-white" },
  3: { label: "High", color: "bg-yellow-500 text-white" },
  4: { label: "Urgent", color: "bg-red-600 text-white" },
};

export const TaskItem: React.FC<{
  uid: string;
  task: WithId<Task>;
  allBlockers: WithId<Blocker>[];
  onStartEdit: () => void;
  onStartPromote: () => void;
  onManageBlockers: () => void;
  onStartBlock: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onUnarchive: () => void;
  onStatusChange: (newStatus: Task["status"]) => void;
  dragHandleProps?: React.HTMLAttributes<HTMLSpanElement>;
  crossListDragHandleProps?: React.HTMLAttributes<HTMLSpanElement>;
}> = ({ uid, task, allBlockers, onStartEdit, onStartPromote, onManageBlockers, dragHandleProps, onArchive, onDelete, onUnarchive, onStatusChange }) => {
  // Debug: log when TaskItem is rendered and show props
  const dueDate = task.dueDate ? new Date(task.dueDate) : null;
  const createdAtDate = (task as any).createdAt?.toDate ? (task as any).createdAt.toDate() : null;
  const updatedAtDate = (task as any).updatedAt?.toDate ? (task as any).updatedAt.toDate() : null;
  const isBlocked = task.status === "blocked";
  const isArchived = task.status === "archived";
  const activeTaskBlockers = isBlocked
    ? allBlockers.filter((b) => b.entityId === task.id && b.status === "active")
    : [];

  const wasUpdated =
    updatedAtDate && createdAtDate && updatedAtDate.getTime() - createdAtDate.getTime() > 60000;
  const latestDate = wasUpdated ? updatedAtDate : createdAtDate;
  const latestDateString = latestDate?.toLocaleDateString(undefined, { month: "short", day: "numeric" });

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    e.stopPropagation();
    const newStatus = e.target.value as Task["status"];
    onStatusChange(newStatus);
  };

  const handlePriorityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    e.stopPropagation();
    updateTask(uid, task.id, { priority: Number(e.target.value) });
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

  // Handle click outside
  React.useEffect(() => {
    if (!editingInline) return;
    function handleClick(e: MouseEvent) {
      if (inputRef.current && !inputRef.current.contains(e.target as Node)) {
        commitInlineEdit();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [editingInline]);

  return (
      <div
        className={`flex items-stretch border rounded-lg shadow-sm transition-shadow group ${statusClasses}`}
        onClick={e => {
          // Only open edit if clicking the container itself, not a child button/input
          if (!isArchived && !editingInline && e.target === e.currentTarget) onStartEdit();
        }}
      >
        {/* Single drag handle for both sorting and cross-list moves */}
        <span
          {...dragHandleProps}
          className="flex items-center px-2 cursor-grab select-none text-gray-400 hover:text-blue-500"
          title="Drag to reorder or move"
          tabIndex={-1}
        >
          <Icon path="M4 9h16M4 15h16" className="w-5 h-5" />
        </span>
        {/* Main content in a single flex container */}
        <div className="flex flex-1 items-stretch">
          {/* Left cell: status / blockers */}
          <div
            className={`flex-shrink-0 flex items-center justify-center w-48 bg-black bg-opacity-5 rounded-l-lg p-2 ${
              isBlocked ? "cursor-pointer hover:bg-red-200" : ""
            }`}
            onClick={isBlocked ? onManageBlockers : undefined}
          >
          {isBlocked ? (
            <div className="text-left w-full">
              <div className="text-sm font-bold text-red-700 mb-1">BLOCKED</div>
              <div className="space-y-1 text-xs text-red-900">
                {activeTaskBlockers.slice(0, 2).map((b) => (
                  <span key={b.id} className="block truncate" title={typeof b.reason === "object" ? JSON.stringify(b.reason) : b.reason}>
                    {typeof b.reason === "object" ? JSON.stringify(b.reason) : b.reason}
                  </span>
                ))}
                {activeTaskBlockers.length > 2 && (
                  <span className="block font-semibold">...and {activeTaskBlockers.length - 2} more</span>
                )}
              </div>
            </div>
          ) : (
          <select
            value={task.status}
            onChange={handleStatusChange}
            onClick={(e) => e.stopPropagation()}
            className="text-sm border border-gray-300 rounded-md p-1 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
            disabled={isArchived}
            title={isArchived ? "Unarchive to change status" : undefined}
          >
            {Object.entries(taskStatusConfig)
              .filter(([key]) => key !== "blocked" && key !== "archived")
              .map(([key, val]) => (
                <option key={key} value={key}>
                  {val.label}
                </option>
              ))}
            <option value="blocked">Block…</option>
          </select>
        )}
      </div>

          {/* Middle: title/description */}
          <div
            className={`flex-grow flex items-center gap-2 p-3 min-w-0`}
            onClick={e => {
              // Only open full edit if not clicking the text itself or inline input
              if (!isArchived && !editingInline && e.target === e.currentTarget) {
                onStartEdit();
              }
            }}
          >
        {task.description && (
          <div
            className="w-1 h-6 bg-gray-300 rounded-full flex-shrink-0"
            title="This task has a description"
          />
        )}
        {editingInline ? (
          <input
            ref={inputRef}
            className="truncate border rounded px-2 py-1 text-base"
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
          <p
            className={`truncate ${task.status === "done" ? "line-through text-gray-500" : ""} cursor-pointer`}
            onClick={e => {
              e.stopPropagation();
              if (!isArchived) setEditingInline(true);
            }}
            title="Click to edit title"
          >
            {typeof task.title === "object" ? JSON.stringify(task.title) : task.title}
          </p>
        )}
      </div>

      {/* Right tools */}
      <div className="flex-shrink-0 flex items-center gap-x-3 p-3 text-sm">
        {/* Edit button moved here, before priority selector */}
        {!isArchived && (
          <button
            type="button"
            className="px-2 py-1 text-xs border rounded bg-gray-100 hover:bg-blue-100"
            onClick={e => { e.stopPropagation(); onStartEdit(); }}
            title="Open full edit window"
          >
            Edit
          </button>
        )}

        {/* Priority selector */}
        {!isArchived && task.priority !== 0 && (
          <select
            value={task.priority}
            onChange={handlePriorityChange}
            onClick={(e) => e.stopPropagation()}
            title="Priority"
            className={`text-xs font-semibold border border-transparent rounded-lg px-2 py-1 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer ${priorities[task.priority]?.color || "bg-gray-200 text-gray-700"}`}
          >
            {Object.entries(priorities).map(([key, val]) => (
              <option key={key} value={key} className="bg-white text-black">
                {val.label}
              </option>
            ))}
          </select>
        )}

        {dueDate && (
          <div className="flex items-center gap-1.5" title={`Due: ${dueDate.toLocaleDateString()}`}>
            <Icon
              path="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z"
              className="w-4 h-4 text-gray-600"
            />
            <span className="font-medium text-gray-800">
              {dueDate.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            </span>
          </div>
        )}

        <div className="border-l border-gray-200 h-5 mx-1 ml-auto" />
        <span
          title={latestDateString ? `Last change: ${latestDateString}` : ""}
          className="text-xs text-gray-400"
        >
          {latestDateString}
        </span>

        <div
          onClick={e => e.stopPropagation()}
          className="flex opacity-0 group-hover:opacity-100 transition-opacity"
        >
          {!isArchived ? (
            <>
              <button
                onClick={e => { e.stopPropagation(); console.log('Promote clicked', task.id); onStartPromote(); }}
                className="p-1 text-gray-400 hover:text-blue-500"
                title="Promote to Project"
              >
                <Icon path="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z" />
              </button>
              <button
                onClick={e => { e.stopPropagation(); console.log('Archive clicked', task.id); onArchive(); }}
                className="p-1 text-gray-400 hover:text-gray-900"
                title="Archive Task"
              >
                <Icon path="M5 5h14v2H5zM7 9h10v10H7z" />
              </button>
              <button
                onClick={e => { e.stopPropagation(); console.log('Delete clicked', task.id); onDelete(); }}
                className="p-1 text-gray-400 hover:text-red-500"
                title="Delete Task"
              >
                <Icon path="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
              </button>
            </>
          ) : (
            <button
              onClick={e => { e.stopPropagation(); console.log('Unarchive clicked', task.id); onUnarchive(); }}
              className="p-1 text-gray-400 hover:text-green-600"
              title="Unarchive Task"
            >
              <Icon path="M5 5h14v2H5zm2 4h10v10H7z" />
            </button>
          )}
        </div>
      </div>
        </div>
  </div>
  );
};
