// src/components/TaskItem.tsx
import React, { useState, useRef } from "react";
import type { Task, Blocker, WithId } from "../types";
import { updateTask } from "../services/tasks";
import Icon from "./Icon";
// If you do not have an Icon component, create src/components/Icon.tsx with a default export.

const taskStatusConfig: { [key in Task["status"]]: { label: string; classes: string } } = {
  not_started: { label: "Not Started", classes: "dark:bg-surface bg-white dark:hover:bg-background hover:bg-gray-50 dark:border-gray-700 border-gray-200" },
  in_progress: { label: "In Progress", classes: "dark:bg-indigo-950 bg-white dark:hover:bg-indigo-900 hover:bg-gray-50 dark:border-indigo-900 border-blue-200" },
  done: { label: "Done", classes: "dark:bg-green-900 bg-white dark:hover:bg-green-800 hover:bg-gray-50 dark:border-green-800 border-green-200" },
  blocked: { label: "Blocked", classes: "dark:bg-red-900 bg-white dark:hover:bg-red-800 hover:bg-gray-50 dark:border-red-800 border-red-300" },
  archived: { label: "Archived", classes: "dark:bg-gray-800 bg-gray-100 dark:border-gray-700 border-gray-200 opacity-60" },
};

const priorities: { [key: number]: { label: string; color: string } } = {
  0: { label: "None", color: "bg-zinc-200" }, // Iron
  1: { label: "Low", color: "bg-gradient-to-r from-gray-300 via-gray-400 to-gray-500" }, // Steel (metallic gradient)
  2: { label: "Medium", color: "bg-gradient-to-r from-slate-100 via-slate-300 to-slate-400" }, // Silver (metallic gradient)
  3: { label: "High", color: "bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-500" }, // Gold (metallic gradient)
  4: { label: "Urgent", color: "bg-gradient-to-r from-orange-300 via-orange-400 to-yellow-600" }, // Bronze (metallic gradient)
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
  onPriorityChange?: (taskId: string, newPriority: number) => void;
}> = ({ uid, task, allBlockers, onStartEdit, onStartPromote, onManageBlockers, onArchive, onDelete, onUnarchive, onStatusChange, onPriorityChange }) => {
  // Debug: log when TaskItem is rendered and show props
  const dueDateObj = task.dueDate ? new Date(task.dueDate) : null;
  const createdAtObj = (task as any).createdAt?.toDate ? (task as any).createdAt.toDate() : null;
  const updatedAtObj = (task as any).updatedAt?.toDate ? (task as any).updatedAt.toDate() : null;
  const isBlocked = task.status === "blocked";
  const isArchived = task.status === "archived";
  const activeTaskBlockers = isBlocked
    ? allBlockers.filter((b) => b.entityId === task.id && b.status === "active")
    : [];

  const wasUpdated =
    updatedAtObj && createdAtObj && updatedAtObj.getTime() - createdAtObj.getTime() > 60000;
  const latestDateObj = wasUpdated ? updatedAtObj : createdAtObj;
  const latestDateString = latestDateObj && typeof latestDateObj.toLocaleDateString === "function"
    ? latestDateObj.toLocaleDateString(undefined, { month: "short", day: "numeric" })
    : "";
  const dueDateString = dueDateObj && typeof dueDateObj.toLocaleDateString === "function"
    ? dueDateObj.toLocaleDateString(undefined, { month: "short", day: "numeric" })
    : "";

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    e.stopPropagation();
    const newStatus = e.target.value as Task["status"];
    onStatusChange(newStatus);
  };

  const handlePriorityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    e.stopPropagation();
    const newPriority = Number(e.target.value);
    updateTask(uid, task.id, { priority: newPriority });
    if (onPriorityChange) {
      onPriorityChange(task.id, newPriority);
    }
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
        className={`flex items-stretch border rounded-lg shadow-sm transition-shadow group ${statusClasses} dark:text-gray-100 text-gray-900`}
        onClick={e => {
          // Only open edit if clicking the container itself, not a child button/input
          if (!isArchived && !editingInline && e.target === e.currentTarget) onStartEdit();
        }}
      >
        {/* Main content in a single flex container */}
        <div className="flex flex-1 items-stretch">
          {/* Left cell: status / blockers */}
          <div
            className={`flex-shrink-0 flex items-center justify-center w-48 dark:bg-black bg-black bg-opacity-5 rounded-l-lg p-2 ${
              isBlocked ? "cursor-pointer dark:hover:bg-red-900 hover:bg-red-200" : ""
            }`}
            onClick={isBlocked ? onManageBlockers : undefined}
          >
          {isBlocked ? (
            <div className="text-left w-full">
              <div className="text-sm font-bold dark:text-red-400 text-red-700 mb-1">BLOCKED</div>
              <div className="space-y-1 text-xs dark:text-red-300 text-red-900">
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
            className="text-sm border dark:border-gray-700 border-gray-300 rounded-md p-1 focus:outline-none focus:ring-2 focus:ring-accent w-full dark:bg-background dark:text-gray-100"
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
            className="w-1 h-6 dark:bg-gray-700 bg-gray-300 rounded-full flex-shrink-0"
            title="This task has a description"
          />
        )}
        {editingInline ? (
          <input
            ref={inputRef}
            className="truncate border dark:border-gray-700 border-gray-300 rounded px-2 py-1 text-base dark:bg-background dark:text-gray-100"
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
            className={`truncate ${task.status === "done" ? "line-through dark:text-gray-500 text-gray-500" : ""} cursor-pointer`}
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
  <div className="flex-shrink-0 flex items-center gap-x-3 p-3 text-sm dark:text-gray-300 text-gray-800">
  {/* Hover action buttons to the left of priority dropdown */}

        {/* Hover action buttons to the left of everything else */}
        <div
          onClick={e => e.stopPropagation()}
          className="flex opacity-0 group-hover:opacity-100 transition-opacity items-center gap-x-2"
        >
          {!isArchived ? (
            <>
              <button
                onClick={e => { e.stopPropagation(); onStartPromote(); }}
                className="p-1 dark:text-gray-400 text-gray-400 dark:hover:text-accent hover:text-blue-500"
                title="Promote to Project"
              >
                <Icon path="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z" />
              </button>
              <button
                onClick={e => { e.stopPropagation(); onArchive(); }}
                className="p-1 dark:text-gray-400 text-gray-400 dark:hover:text-gray-100 hover:text-gray-900"
                title="Archive Task"
              >
                <Icon path="M5 5h14v2H5zM7 9h10v10H7z" />
              </button>
              <button
                onClick={e => { e.stopPropagation(); onDelete(); }}
                className="p-1 dark:text-gray-400 text-gray-400 dark:hover:text-red-400 hover:text-red-500"
                title="Delete Task"
              >
                <Icon path="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
              </button>
            </>
          ) : (
            <button
              onClick={e => { e.stopPropagation(); onUnarchive(); }}
              className="p-1 dark:text-gray-400 text-gray-400 dark:hover:text-green-400 hover:text-green-600"
              title="Unarchive Task"
            >
              <Icon path="M5 5h14v2H5zm2 4h10v10H7z" />
            </button>
          )}
        </div>
        {/* Edit button and priority dropdown */}
        {!isArchived && (
          <button
            type="button"
            className="px-2 py-1 text-xs border rounded dark:bg-surface bg-gray-100 dark:hover:bg-accent hover:bg-blue-100 dark:text-gray-100 text-gray-900"
            onClick={e => { e.stopPropagation(); onStartEdit(); }}
            title="Open full edit window"
          >
            Edit
          </button>
        )}
        {!isArchived && (
          <select
            value={task.priority}
            onChange={handlePriorityChange}
            onClick={(e) => e.stopPropagation()}
            title="Priority"
            className={`text-xs font-semibold rounded-lg px-2 py-1 appearance-none focus:outline-none focus:ring-2 focus:ring-accent cursor-pointer shadow-md border border-zinc-400 ${priorities[task.priority]?.color}`}
            style={{ boxShadow: '0 2px 6px rgba(120,120,120,0.15), inset 0 1px 2px #fff' }}
          >
            {Object.entries(priorities).map(([key, val]) => (
              <option key={key} value={key} className={`bg-white text-gray-900`}>{val.label}</option>
            ))}
          </select>
        )}
        {/* Due date only rendered once, outside hover group */}
        {/* Remove duplicate due date rendering at the end of right tools section */}
        {/* Action buttons only on hover */}
        {/* ...existing code... */}

        {/* Remove duplicate priority dropdown at the end of right tools section */}


        <div className="border-l dark:border-gray-700 border-gray-200 h-5 mx-1 ml-auto" />
        <div className="flex flex-col items-start justify-center ml-2">
          <div className="flex items-center">
            <span className="text-xs dark:text-gray-500 text-gray-400 mr-1">Created:</span>
            <span
              title={latestDateString ? `Created: ${latestDateString}` : ""}
              className="text-xs dark:text-gray-500 text-gray-400"
            >
              {latestDateString}
            </span>
          </div>
          {dueDateString && (
            <div className="flex items-center mt-0.5">
              <span className="text-xs dark:text-gray-700 text-gray-700 mr-1">Due:</span>
              <span className="font-medium dark:text-gray-200 text-gray-800">
                {dueDateString}
              </span>
            </div>
          )}
          {task.assignee && (
            <div className="flex items-center mt-0.5">
              <span className="text-xs dark:text-blue-400 text-blue-700 mr-1">Assigned:</span>
              <span className="font-medium dark:text-blue-200 text-blue-800">
                {typeof task.assignee === "object" && task.assignee !== null
                  ? (task.assignee as { name?: string; id?: string }).name ||
                    (task.assignee as { name?: string; id?: string }).id ||
                    JSON.stringify(task.assignee)
                  : task.assignee}
              </span>
            </div>
          )}
        </div>
        {/* Only render hover action buttons once per row */}
      </div>
        </div>
  </div>
  );
};
