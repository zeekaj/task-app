import React from "react";
import type { WithId, Task, BlockableEntity } from "../types";

type Props = {
  task: WithId<Task>;
  onEdit?: () => void;
  onPromote?: () => void;
  openBlockerModal?: (target: BlockableEntity) => void;
  setCurrentView?: (view: { type: "tasks" | "project" | "blocked"; id?: string | null }) => void;
};

function Dot({ className = "" }: { className?: string }) {
  return <span className={`inline-block w-2 h-2 rounded-full ${className}`} />;
}

export const TaskRow: React.FC<Props> = ({
  task,
  onEdit,
  onPromote,
  openBlockerModal,
}) => {
  const blocked = task.status === "blocked";
  const due = task.dueDate ? String(task.dueDate).slice(0, 10) : null;
  const priority = typeof task.priority === "number" ? task.priority : null;

  return (
    <li className="px-2 py-1.5 hover:bg-gray-50 rounded-md transition-colors">
      <div className="flex items-center gap-2">
        {/* left chips */}
        {blocked ? (
          <Dot className="bg-red-500" />
        ) : (
          <Dot className="bg-gray-300" />
        )}

        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] leading-6">
            {task.title}
          </div>

          {/* meta line */}
          <div className="text-xs text-gray-500 flex flex-wrap items-center gap-x-3 gap-y-0.5">
            {priority !== null && <span>Priority {priority}</span>}
            {due && <span>Due {due}</span>}
            {blocked && <span className="text-red-600">Blocked</span>}
          </div>

          {task.description && (
            <div className="text-xs text-gray-600 mt-0.5 line-clamp-2">
              {task.description}
            </div>
          )}
        </div>

        {/* actions */}
        <div className="flex-shrink-0 flex items-center gap-1">
          {blocked && openBlockerModal && (
            <button
              className="text-xs border px-2 py-1 rounded hover:bg-gray-100"
              title="Manage blocker"
              onClick={() => openBlockerModal({ ...task, type: "task" })}
            >
              Manage
            </button>
          )}
          {onPromote && (
            <button
              className="text-xs border px-2 py-1 rounded hover:bg-gray-100"
              onClick={onPromote}
              title="Promote"
            >
              Promote
            </button>
          )}
          {onEdit && (
            <button
              className="text-xs border px-2 py-1 rounded hover:bg-gray-100"
              onClick={onEdit}
              title="Edit"
            >
              Edit
            </button>
          )}
        </div>
      </div>
    </li>
  );
};
