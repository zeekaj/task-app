import React from "react";
import type { WithId, Task } from "../types";

type Props = {
  task: WithId<Task>;
  onEdit?: () => void;
  onPromote?: () => void;
  openBlockerModal?: (item: WithId<Task>) => void;
  setCurrentView?: (view: { type: string; id?: string }) => void;
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
  const blocked = Boolean((task as any).blocked);
  const due = task.dueDate ? String(task.dueDate).slice(0, 10) : null;
  const priority =
    typeof (task as any).priority === "number" ? (task as any).priority : null;

  // Brand-aligned priority badge classes (same mapping as TaskItem)
  const getPriorityBgGradient = (value: number): string => {
    if (value === 0) return "bg-gray-700";
    if (value < 25) return "bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600";
    if (value < 50) return "bg-gradient-to-r from-[#00D0FF] via-blue-400 to-indigo-500";
    if (value < 75) return "bg-gradient-to-r from-indigo-500 via-indigo-400 to-[#A38BFF]";
    if (value < 90) return "bg-gradient-to-r from-[#A38BFF] via-indigo-400 to-[#A38BFF]";
    return "bg-gradient-to-r from-red-400 via-red-500 to-red-600";
  };

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
            {priority !== null && (
              <span
                className={`text-[11px] font-semibold rounded-lg px-1.5 py-0.5 shadow-md border border-zinc-300 text-white ${getPriorityBgGradient(priority)}`}
                title={`Priority ${priority}`}
                style={{ boxShadow: '0 2px 6px rgba(120,120,120,0.15), inset 0 1px 2px #fff' }}
              >
                {priority}
              </span>
            )}
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
              onClick={() => openBlockerModal(task)}
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
