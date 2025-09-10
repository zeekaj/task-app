// src/components/TaskItem.tsx
import React from "react";
import { Icon } from "./shared/Icon";
import type { WithId, Task, Blocker, TaskStatus } from "../types";
import { removeTask, updateTask, archiveTask, unarchiveTask } from "../services/tasks";
import { resolveBlocker } from "../services/blockers";

const taskStatusConfig: { [key in Task["status"]]: { label: string; classes: string } } = {
  not_started: { label: "Not Started", classes: "bg-white hover:bg-gray-50 border-gray-200" },
  in_progress: { label: "In Progress", classes: "bg-yellow-50 hover:bg-yellow-100 border-yellow-200" },
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
}> = ({ uid, task, allBlockers, onStartEdit, onStartPromote, onManageBlockers, onStartBlock }) => {
  const dueDate = task.dueDate ? new Date(task.dueDate) : null;
  const createdAtDate = task.createdAt && typeof task.createdAt === 'object' && 'toDate' in task.createdAt ? task.createdAt.toDate() : null;
  const updatedAtDate = task.updatedAt && typeof task.updatedAt === 'object' && 'toDate' in task.updatedAt ? task.updatedAt.toDate() : null;
  const isBlocked = task.status === "blocked";
  const isArchived = task.status === "archived";
  const activeTaskBlockers = isBlocked
    ? allBlockers.filter((b) => b.entityId === task.id && b.status === "active")
    : [];

  const wasUpdated =
    updatedAtDate && createdAtDate && updatedAtDate.getTime() - createdAtDate.getTime() > 60000;
  const latestDate = wasUpdated ? updatedAtDate : createdAtDate;
  const latestDateString = latestDate?.toLocaleDateString(undefined, { month: "short", day: "numeric" });

  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    e.stopPropagation();
    const newStatus = e.target.value as TaskStatus;
    if (newStatus === "blocked") {
      onStartBlock();
      return;
    }
    // If currently blocked, require clearing active blockers first
    // Note: newStatus will never be "blocked" due to select filtering, but keep for safety
    if (isBlocked && activeTaskBlockers.length > 0) {
      const proceed = window.confirm(
        `This task has ${activeTaskBlockers.length} active blocker(s).\nYou need to resolve them before unblocking. Continue?`
      );
      if (!proceed) return;
      const reason = window.prompt("Briefly describe how this blocker was resolved (required):", "") || "";
      if (!reason.trim()) {
        alert("Resolution is required to clear blockers.");
        (e.target as HTMLSelectElement).value = task.status; // reset select
        return;
      }
      for (const b of activeTaskBlockers) {
        await resolveBlocker(uid, { ...b, entityId: task.id, entityType: "task" }, reason);
      }
    }
    await updateTask(uid, task.id, { status: newStatus });
  };

  const handlePriorityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    e.stopPropagation();
    updateTask(uid, task.id, { priority: Number(e.target.value) });
  };

  const statusClasses =
    taskStatusConfig[task.status as Task["status"]]?.classes ||
    taskStatusConfig.not_started.classes;

  return (
    <li className={`flex items-stretch border rounded-lg shadow-sm transition-shadow group ${statusClasses}`}>
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
            <ul className="space-y-1 text-xs text-red-900 list-disc list-inside">
              {activeTaskBlockers.slice(0, 2).map((b) => (
                <li key={b.id} className="truncate" title={b.reason}>
                  {b.reason}
                </li>
              ))}
              {activeTaskBlockers.length > 2 && (
                <li className="font-semibold">...and {activeTaskBlockers.length - 2} more</li>
              )}
            </ul>
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
        onClick={!isArchived ? onStartEdit : undefined}
        className={`flex-grow flex items-center gap-2 p-3 ${
          isArchived ? "cursor-default" : "cursor-pointer"
        } min-w-0`}
      >
        {task.description && (
          <div
            className="w-1 h-6 bg-gray-300 rounded-full flex-shrink-0"
            title="This task has a description"
          />
        )}
        <p className={`truncate ${task.status === "done" ? "line-through text-gray-500" : ""}`}>
          {task.title}
        </p>
      </div>

      {/* Right tools */}
      <div className="flex-shrink-0 flex items-center gap-x-3 p-3 text-sm">
        {!isArchived && task.priority !== 0 && (
          <select
            value={task.priority}
            onChange={handlePriorityChange}
            onClick={(e) => e.stopPropagation()}
            title="Priority"
            className={`text-xs font-semibold border border-transparent rounded-lg px-2 py-1 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer ${
              priorities[task.priority]?.color || "bg-gray-200 text-gray-700"
            }`}
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
          onClick={(e) => e.stopPropagation()}
          className="flex opacity-0 group-hover:opacity-100 transition-opacity"
        >
          {!isArchived ? (
            <>
              <button
                onClick={onStartPromote}
                className="p-1 text-gray-400 hover:text-blue-500"
                title="Promote to Project"
              >
                <Icon path="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z" />
              </button>
              <button
                onClick={() => archiveTask(uid, task.id)}
                className="p-1 text-gray-400 hover:text-gray-900"
                title="Archive Task"
              >
                <Icon path="M5 5h14v2H5zM7 9h10v10H7z" />
              </button>
              <button
                onClick={() => removeTask(uid, task.id)}
                className="p-1 text-gray-400 hover:text-red-500"
                title="Delete Task"
              >
                <Icon path="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
              </button>
            </>
          ) : (
            <button
              onClick={() => unarchiveTask(uid, task.id)}
              className="p-1 text-gray-400 hover:text-green-600"
              title="Unarchive Task"
            >
              <Icon path="M5 5h14v2H5zm2 4h10v10H7z" />
            </button>
          )}
        </div>
      </div>
    </li>
  );
};
