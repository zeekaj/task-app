import React, { useMemo } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import type { WithId, Task } from "../../types";

interface CalendarViewProps {
  tasks: WithId<Task>[];
  onTaskClick?: (task: WithId<Task>) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({ tasks, onTaskClick }) => {
  // Group tasks by due date (ISO string, yyyy-mm-dd)
  const tasksByDate = useMemo(() => {
    const map: Record<string, WithId<Task>[]> = {};
    for (const task of tasks) {
      if (task.dueDate) {
        const dateKey = task.dueDate.substring(0, 10);
        if (!map[dateKey]) map[dateKey] = [];
        map[dateKey].push(task);
      }
    }
    return map;
  }, [tasks]);

  // Highlight days with tasks
  const colorPalette = [
    "bg-blue-200 text-blue-900 border-blue-300",
    "bg-green-200 text-green-900 border-green-300",
    "bg-yellow-200 text-yellow-900 border-yellow-300",
    "bg-pink-200 text-pink-900 border-pink-300",
    "bg-purple-200 text-purple-900 border-purple-300",
    "bg-orange-200 text-orange-900 border-orange-300",
    "bg-cyan-200 text-cyan-900 border-cyan-300",
  ];
  const tileContent = ({ date, view }: { date: Date; view: string }) => {
    if (view !== "month") return null;
    const key = date.toISOString().substring(0, 10);
    const dayTasks = tasksByDate[key] || [];
    if (dayTasks.length === 0) return null;
    return (
      <ul className="flex flex-col gap-1 mt-0.5">
        {dayTasks.slice(0, 3).map((task, i) => (
          <li
            key={task.id}
            className={`w-full rounded-md px-1 py-0.5 text-xs font-medium truncate cursor-pointer border ${colorPalette[i % colorPalette.length]} hover:opacity-90 transition-opacity`}
            title={task.title}
            onClick={e => {
              e.stopPropagation();
              onTaskClick && onTaskClick(task);
            }}
          >
            {task.title}
          </li>
        ))}
        {dayTasks.length > 3 && (
          <li className="text-xs text-gray-400">+{dayTasks.length - 3} more</li>
        )}
      </ul>
    );
  };

  return (
    <div className="flex flex-col h-full w-full flex-1 p-0 sm:p-4 bg-background dark:bg-background">
      <h2 className="text-xl font-bold mb-4 self-start px-4 pt-4">Task Calendar</h2>
      <div className="flex-1 flex items-center justify-center w-full">
        <Calendar
          tileContent={tileContent}
          calendarType="gregory"
          className="w-full h-full text-lg bg-surface dark:bg-surface rounded-xl shadow border border-border p-2"
          prevLabel={<span className="text-xl">‹</span>}
          nextLabel={<span className="text-xl">›</span>}
          prev2Label={null}
          next2Label={null}
          formatShortWeekday={(locale, date) => date.toLocaleDateString(locale, { weekday: 'narrow' })}
        />
        <style>{`
          .react-calendar {
            width: 100%;
            height: 100%;
            background: transparent;
            border: none;
            font-family: inherit;
          }
          .react-calendar__navigation {
            display: flex;
            gap: 0.5rem;
            margin-bottom: 0.5rem;
          }
          .react-calendar__tile {
            min-width: 0;
            min-height: 0;
            aspect-ratio: 1 / 1;
            padding: 0.25rem;
            border-radius: 0.5rem;
            transition: background 0.2s;
            background: transparent;
          }
          .react-calendar__tile--active,
          .react-calendar__tile:focus {
            background: #2563eb22;
            color: #2563eb;
          }
          .react-calendar__tile--now {
            background: #facc1533;
            color: #b45309;
          }
          .react-calendar__tile:hover {
            background: #e0e7ef;
            color: #1e293b;
          }
          .dark .react-calendar__tile:hover {
            background: #334155;
            color: #f1f5f9;
          }
          .dark .react-calendar__tile--active,
          .dark .react-calendar__tile:focus {
            background: #2563eb44;
            color: #60a5fa;
          }
          .dark .react-calendar__tile--now {
            background: #facc1533;
            color: #fbbf24;
          }
          .react-calendar__month-view__days {
            display: grid !important;
            grid-template-columns: repeat(7, 1fr);
            grid-auto-rows: 1fr;
            height: 100%;
          }
        `}</style>
      </div>
      <div className="mt-4 text-xs text-gray-500 px-4 pb-4">
        Click a task to view or edit.
      </div>
    </div>
  );
};
