import React from "react";
import { Dropdown } from "./shared/Dropdown";
// src/components/FilterBar.tsx



// Simple dropdown component for filter groups
import type { TaskFilters } from "../types";

const priorities = [
  { value: 0, label: "Any" },
  { value: 1, label: "≥ Low" },
  { value: 2, label: "≥ Medium" },
  { value: 3, label: "≥ High" },
  { value: 4, label: "≥ Urgent" },
] as const;

export const defaultFilters: TaskFilters = {
  status: ["active"],
  minPriority: [0],
  due: ["any"],
  assigned: [],
  includeArchived: false,
};


const groupByOptions = [
  { value: "none", label: "None" },
  { value: "status", label: "Status" },
  { value: "priority", label: "Priority" },
  { value: "due", label: "Due" },
  { value: "assigned", label: "Assignee" },
];

export const FilterBar: React.FC<{
  filters: TaskFilters & { groupBy?: string };
  onChange: (f: TaskFilters & { groupBy?: string }) => void;
  compact?: boolean;
  allAssignees?: string[];
  showAll: boolean;
  onToggleShowAll: () => void;
}> = ({ filters, onChange, compact, allAssignees, showAll, onToggleShowAll }) => {
  return (
    <div className={`flex flex-wrap gap-3 items-center ${compact ? "" : "mb-4"}`}>
      {/* Show all tasks toggle */}
      <button
        type="button"
        className={`rounded-full px-4 py-1 text-sm font-medium border shadow ${showAll ? "bg-accent text-white border-accent" : "bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200"}`}
        onClick={onToggleShowAll}
        aria-pressed={showAll}
      >
        {showAll ? "Show Filters" : "Show All Tasks"}
      </button>


  {/* Status Dropdown */}
  <Dropdown label="Status">
    {(() => {
      const allStatuses = ["active", "blocked", "done", "archived"] as const;
      const allSelected = allStatuses.every((s) => filters.status.includes(s));
      return (
        <>
          <label className="flex items-center gap-2 px-2 py-1 font-semibold">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={() => {
                onChange({
                  ...filters,
                  status: allSelected ? [] : [...allStatuses],
                });
              }}
            />
            <span>Select All</span>
          </label>
          {allStatuses.map((status) => (
            <label key={status} className="flex items-center gap-2 px-2 py-1">
              <input
                type="checkbox"
                checked={filters.status.includes(status)}
                onChange={() => {
                  const next = filters.status.includes(status)
                    ? filters.status.filter((s) => s !== status)
                    : [...filters.status, status];
                  onChange({ ...filters, status: next });
                }}
              />
              <span>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
            </label>
          ))}
        </>
      );
    })()}
  </Dropdown>


  {/* Priority Dropdown */}
  <Dropdown label="Priority">
    {(() => {
      const allLevels = [1, 2, 3, 4] as (0 | 1 | 2 | 3 | 4)[];
      const allSelected = allLevels.every((l) => filters.minPriority.includes(l));
      return (
        <>
          <label className="flex items-center gap-2 px-2 py-1 font-semibold">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={() => {
                onChange({
                  ...filters,
                  minPriority: allSelected ? [] : [...allLevels],
                });
              }}
            />
            <span>Select All</span>
          </label>
          {allLevels.map((level) => (
            <label key={level} className="flex items-center gap-2 px-2 py-1">
              <input
                type="checkbox"
                checked={filters.minPriority.includes(level)}
                onChange={() => {
                  const next = filters.minPriority.includes(level)
                    ? filters.minPriority.filter((p) => p !== level)
                    : [...filters.minPriority, level];
                  onChange({ ...filters, minPriority: next });
                }}
              />
              <span>{priorities.find((p) => p.value === level)?.label.replace('≥ ', '')}</span>
            </label>
          ))}
        </>
      );
    })()}
  </Dropdown>


  {/* Due Dropdown */}
  <Dropdown label="Due">
    {(() => {
      const allDue = ["any", "overdue", "today", "week"] as const;
      const allSelected = allDue.every((d) => filters.due.includes(d));
      return (
        <>
          <label className="flex items-center gap-2 px-2 py-1 font-semibold">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={() => {
                onChange({
                  ...filters,
                  due: allSelected ? [] : [...allDue],
                });
              }}
            />
            <span>Select All</span>
          </label>
          {allDue.map((due) => (
            <label key={due} className="flex items-center gap-2 px-2 py-1">
              <input
                type="checkbox"
                checked={filters.due.includes(due)}
                onChange={() => {
                  const next = filters.due.includes(due)
                    ? filters.due.filter((d) => d !== due)
                    : [...filters.due, due];
                  onChange({ ...filters, due: next });
                }}
              />
              <span>{due.charAt(0).toUpperCase() + due.slice(1)}</span>
            </label>
          ))}
        </>
      );
    })()}
  </Dropdown>


  {/* Assigned Dropdown */}
  <Dropdown label="Assigned">
    {Array.isArray(allAssignees) && allAssignees.length > 0 ? (() => {
      const allOptions = ["(None)", ...allAssignees];
      const allSelected = allOptions.every((a) => filters.assigned?.includes(a));
      return (
        <>
          <label className="flex items-center gap-2 px-2 py-1 font-semibold">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={() => {
                onChange({
                  ...filters,
                  assigned: allSelected ? [] : [...allOptions],
                });
              }}
            />
            <span>Select All</span>
          </label>
          {allOptions.map((assignee) => (
            <label key={assignee} className="flex items-center gap-2 px-2 py-1">
              <input
                type="checkbox"
                checked={filters.assigned?.includes(assignee) ?? false}
                onChange={() => {
                  const next = filters.assigned?.includes(assignee)
                    ? filters.assigned?.filter((a) => a !== assignee)
                    : [...(filters.assigned || []), assignee];
                  onChange({ ...filters, assigned: next });
                }}
              />
              <span>{assignee === "(None)" ? <span className="italic text-gray-500">None</span> : assignee}</span>
            </label>
          ))}
        </>
      );
    })() : (
      <span className="text-gray-400 px-2 py-1">No assignees</span>
    )}
  </Dropdown>


      {!compact && (
        <button
          onClick={() =>
            onChange({
              status: ["active"],
              minPriority: [0],
              due: ["any"],
              assigned: [],
              includeArchived: false,
            })
          }
          className="ml-auto text-sm px-2 py-1 border rounded hover:bg-gray-50"
        >
          Reset
        </button>
      )}
    </div>
  );
};
