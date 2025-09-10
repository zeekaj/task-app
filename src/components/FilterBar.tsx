// src/components/FilterBar.tsx
import React from "react";
import type { TaskFilters } from "../types";

const priorities = [
  { value: 0, label: "Any" },
  { value: 1, label: "≥ Low" },
  { value: 2, label: "≥ Medium" },
  { value: 3, label: "≥ High" },
  { value: 4, label: "≥ Urgent" },
] as const;

export const defaultFilters: TaskFilters = {
  status: "active",
  minPriority: 0,
  due: "any",
  includeArchived: false,
};

export const FilterBar: React.FC<{
  filters: TaskFilters;
  onChange: (f: TaskFilters) => void;
  compact?: boolean;
}> = ({ filters, onChange, compact }) => {
  return (
    <div className={`flex flex-wrap gap-3 items-center ${compact ? "" : "mb-4"}`}>
      {/* Status */}
      <label className="text-sm">
        <span className="mr-2 text-gray-500">Status</span>
        <select
          className="border rounded px-2 py-1 text-sm"
          value={filters.status}
          onChange={(e) => onChange({ ...filters, status: e.target.value as any })}
        >
          <option value="active">Active</option>
          <option value="blocked">Blocked</option>
          <option value="done">Done</option>
          <option value="all">All</option>
          <option value="archived">Archived</option>
        </select>
      </label>

      {/* Priority */}
      <label className="text-sm">
        <span className="mr-2 text-gray-500">Priority</span>
        <select
          className="border rounded px-2 py-1 text-sm"
          value={filters.minPriority}
          onChange={(e) => onChange({ ...filters, minPriority: Number(e.target.value) as any })}
        >
          {priorities.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </label>

      {/* Due */}
      <label className="text-sm">
        <span className="mr-2 text-gray-500">Due</span>
        <select
          className="border rounded px-2 py-1 text-sm"
          value={filters.due}
          onChange={(e) => onChange({ ...filters, due: e.target.value as any })}
        >
          <option value="any">Any</option>
          <option value="overdue">Overdue</option>
          <option value="today">Today</option>
          <option value="week">This week</option>
        </select>
      </label>

      <label className="text-sm inline-flex items-center gap-2 ml-2">
        <input
          type="checkbox"
          checked={filters.includeArchived}
          onChange={(e) => onChange({ ...filters, includeArchived: e.target.checked })}
        />
        <span>Include archived</span>
      </label>

      {!compact && (
        <button
          onClick={() =>
            onChange({
              status: "active",
              minPriority: 0,
              due: "any",
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
