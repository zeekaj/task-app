import React from "react";
import { Dropdown } from "./shared/Dropdown";
// src/components/FilterBar.tsx



// Simple dropdown component for filter groups
import type { TaskFilters } from "../types";

const priorities = [
  { value: 0, min: 0, max: 20, label: "None (0-20)" },
  { value: 1, min: 21, max: 40, label: "Low (21-40)" },
  { value: 2, min: 41, max: 60, label: "Medium (41-60)" },
  { value: 3, min: 61, max: 80, label: "High (61-80)" },
  { value: 4, min: 81, max: 100, label: "Urgent (81-100)" },
] as const;

export const defaultFilters: TaskFilters = {
  status: ["active"],
  minPriority: [0, 1, 2, 3, 4], // Include all priority ranges by default
  due: ["any"],
  assigned: [],
  includeArchived: false,
};



export const FilterBar: React.FC<{
  filters: TaskFilters & { groupBy?: string };
  onChange: (f: TaskFilters & { groupBy?: string }) => void;
  compact?: boolean;
  allAssignees?: string[];
  showAll: boolean;
  onToggleShowAll: () => void;
  localStorageKey: string;
}> = ({ filters, onChange, compact, allAssignees, showAll, onToggleShowAll, localStorageKey }) => {
  const [saved, setSaved] = React.useState(false);
  React.useEffect(() => {
    if (saved) {
      const t = setTimeout(() => setSaved(false), 1200);
      return () => clearTimeout(t);
    }
  }, [saved]);
  return (
    <div className={`flex flex-row flex-wrap items-center gap-3 min-h-[40px]`}>
      {/* Show all tasks toggle */}
      <button
        type="button"
        className={`rounded-full px-4 py-1 text-sm font-medium border shadow items-center ${showAll ? "bg-accent text-white border-accent" : "bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200"}`}
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
                          <Dropdown label="Priority">
                            {(() => {
                              const allLevels = [0, 1, 2, 3, 4] as const;
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
                                      <span>{priorities.find((p) => p.value === level)?.label}</span>
                                    </label>
                                  ))}
                                </>
                              );
                            })()}
                          </Dropdown>
                          <Dropdown label="Due">
                            {(() => {
                              const allDue = ["any", "overdue", "today", "week", "month"] as const;
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
                          {Array.isArray(allAssignees) && allAssignees.length > 0 && (
                            <Dropdown label="Assigned">
                              {(() => {
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
                            })()}
                            </Dropdown>
                          )}
                          {!compact && (
                            <button
                              type="button"
                              onClick={() => {
                                localStorage.setItem(localStorageKey, JSON.stringify(filters));
                                setSaved(true);
                              }}
                              className={
                                `relative rounded-full px-4 py-1 text-sm font-medium border shadow bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 ml-2 hover:bg-gray-200 dark:hover:bg-gray-700 items-center transition-colors duration-200 ${saved ? 'bg-green-100 border-green-400 text-green-700' : ''}`
                              }
                              title="Save these filters as your default for this view only"
                              disabled={saved}
                            >
                              {saved ? (
                                <span className="flex items-center gap-1 animate-fade-in">
                                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                  Saved!
                                </span>
                              ) : (
                                'Save as Default'
                              )}
                            </button>
                          )}
    </div>
  );
}
