import React, { useState, useMemo } from "react";
import { ConfirmModal } from "../shared/ConfirmModal";
import { FilterBar } from "../FilterBar";
import { Dropdown } from "../shared/Dropdown";
import { getUrgencyColor } from "../../utils/urgency";
import type { WithId, Task, Blocker, TaskFilters } from "../../types";
import { useTasks } from "../../hooks/useTasks";
import { useProjects } from "../../hooks/useProjects";
import { logError } from "../../utils/logger";

interface TechsViewProps {
  uid: string;
  allTasks?: WithId<Task>[];
  allBlockers?: WithId<Blocker>[];
  allProjects?: any[];
  selectedTech?: string | null;
  onNavigateToAllTechs?: () => void;
  onNavigateToProject?: (projectId: string) => void;
}

export const TechsView: React.FC<TechsViewProps> = (props) => {
  // Destructure props at the top
  const {
    uid,
    allTasks: propAllTasks,
    allProjects: propAllProjectProp,
    selectedTech,
    onNavigateToAllTechs,
    onNavigateToProject,
  } = props;

  // Get projects from hook if not provided
  const hookProjects = useProjects(uid);
  const allProjects = propAllProjectProp ?? hookProjects;
  const allTasks = propAllTasks ?? useTasks(uid);

  // Filter state
  const FILTERS_KEY = "taskAppDefaultFilters_TechsView";
  const techsDefaultFilters = {
    status: ["active", "done"],
    minPriority: [0, 1, 2, 3, 4],
    due: ["any"],
    assigned: [],
    includeArchived: false,
  };
  const [filters, setFilters] = useState<TaskFilters & { groupBy?: string }>(() => {
    const saved = localStorage.getItem(FILTERS_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (err) {
        logError("Error parsing saved tech filters:", err);
        return techsDefaultFilters;
      }
    }
    return techsDefaultFilters;
  });
  const [showAll, setShowAll] = useState(false);
  const [arrangeBy, setArrangeBy] = useState<string>("priority");
  const [reverseOrder, setReverseOrder] = useState<boolean>(false);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<(() => Promise<void>) | null>(null);

  // Group tasks by assignee with filtering
  const tasksByAssignee = useMemo(() => {
    const groups: { [assignee: string]: WithId<Task>[] } = {};
    
    // Filter tasks based on current filters
    const filteredTasks = allTasks.filter((task) => {
      // Archived filter
      if (!filters.includeArchived && task.status === "archived") return false;

      // Status filter: FilterBar uses an "active" pseudo-status which should map to several real statuses
      if (!showAll && filters.status && filters.status.length > 0) {
        const selected = filters.status;
        const isActive = (task.status === "not_started" || task.status === "in_progress");
        const statusMatch =
          (selected.includes("active") && isActive) ||
          selected.includes(task.status as any);
        if (!statusMatch) return false;
      }

      // Priority filter (bucket-based). FilterBar uses buckets 0..4 representing ranges.
      if (filters.minPriority && filters.minPriority.length > 0) {
        const p = task.priority ?? 0;
        const bucket = p === 0 ? 0 : p <= 20 ? 0 : p <= 40 ? 1 : p <= 60 ? 2 : p <= 80 ? 3 : 4;
        if (!filters.minPriority.includes(bucket)) return false;
      }

      return true;
    });
    
    filteredTasks.forEach((task) => {
      const assignee = task.assignee ? String(task.assignee) : "Unassigned";
      if (!groups[assignee]) groups[assignee] = [];
      groups[assignee].push(task);
    });
    
    // Add all people who have projects (even if no tasks)
    allProjects.forEach((project: any) => {
      if (project.owner && !groups[project.owner]) {
        groups[project.owner] = [];
      }
      if (project.assignees && Array.isArray(project.assignees)) {
        project.assignees.forEach((a: string) => {
          if (a && !groups[a]) groups[a] = [];
        });
      }
      if (project.assignee && !groups[project.assignee]) {
        groups[project.assignee] = [];
      }
    });
    return groups;
  }, [allTasks, allProjects, filters, showAll]);

  const assigneeNames = useMemo(() => {
    let names = Object.keys(tasksByAssignee);
    if (selectedTech) {
      names = names.filter((n) => n === selectedTech);
    }
    return names.sort();
  }, [tasksByAssignee, selectedTech]);

  const toggleProjectExpansion = (projectId: string) => {
    setExpandedProjects((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(projectId)) {
        newSet.delete(projectId);
      } else {
        newSet.add(projectId);
      }
      return newSet;
    });
  };

  const getProjectTasks = (projectId: string) => {
    return allTasks.filter(
      (task) => task.projectId === projectId && task.status !== "done" && task.status !== "archived"
    );
  };

  const arrangeOptions = [
    { value: "priority", label: "Priority" },
    { value: "status", label: "Status" },
    { value: "title", label: "Title" },
    { value: "dueDate", label: "Due Date" },
    { value: "age", label: "Age" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold dark:text-accent text-gray-900">
          {selectedTech ? `Tasks & Projects for ${selectedTech}` : 'Tasks & Projects by Tech'}
        </h1>
        {selectedTech && onNavigateToAllTechs && (
          <button
            onClick={onNavigateToAllTechs}
            className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            ← All Techs
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:gap-4">
          <div className="flex flex-wrap items-center gap-3 bg-white/80 dark:bg-surface/80 rounded-2xl shadow px-4 py-3 border border-gray-200 dark:border-gray-700 w-full">
            <FilterBar
              filters={filters}
              onChange={(newFilters) => {
                setFilters(newFilters);
                localStorage.setItem(FILTERS_KEY, JSON.stringify(newFilters));
              }}
              allAssignees={undefined}
              compact={false}
              showAll={showAll}
              onToggleShowAll={() => setShowAll((v) => !v)}
              localStorageKey={FILTERS_KEY}
            />
            <div className="h-8 w-px bg-gray-300 dark:bg-gray-700 mx-2" />
            <div className="flex items-center gap-2">
              <Dropdown label={`Arrange by${arrangeBy ? `: ${arrangeOptions.find(o => o.value === arrangeBy)?.label}` : ""}`}>
                {arrangeOptions.map(opt => (
                  <label key={opt.value} className="flex items-center gap-2 px-2 py-1">
                    <input
                      type="radio"
                      name="arrangeBy"
                      checked={arrangeBy === opt.value}
                      onChange={() => setArrangeBy(opt.value)}
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </Dropdown>
              <button
                type="button"
                className={`ml-2 px-2 py-1 rounded border text-xs dark:bg-surface ${reverseOrder ? "bg-gray-200" : "bg-white"}`}
                title={reverseOrder ? "Descending" : "Ascending"}
                onClick={() => setReverseOrder(r => !r)}
              >
                {reverseOrder ? "↓" : "↑"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {assigneeNames.length === 0 ? (
        <p className="dark:text-gray-500 text-gray-500">No tasks or projects found.</p>
      ) : (
        assigneeNames.map(assigneeName => {
          const tasks = tasksByAssignee[assigneeName];
          const taskCount = tasks.length;
          const completedCount = tasks.filter(t => t.status === 'done').length;
          const blockedCount = tasks.filter(t => t.status === 'blocked').length;

          // Get projects for this assignee
          const assigneeProjects = allProjects.filter(project => {
            if (assigneeName === 'Unassigned') {
              return !project.assignee && (!project.assignees || project.assignees.length === 0) && !project.owner;
            }
            const hasLegacyAssignment = project.assignee === assigneeName;
            const hasMultipleAssignment = project.assignees && project.assignees.includes(assigneeName);
            const isOwner = project.owner === assigneeName;
            return hasLegacyAssignment || hasMultipleAssignment || isOwner;
          });
          const activeProjects = assigneeProjects.filter(p => p.status !== 'completed' && p.status !== 'archived');

          return (
            <div key={assigneeName} className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold dark:text-accent text-gray-900 flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  {assigneeName}
                </h2>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-green-600 font-medium">{completedCount} done</span>
                  {blockedCount > 0 && (
                    <span className="text-red-600 font-medium">{blockedCount} blocked</span>
                  )}
                  <span className="dark:text-gray-400 text-gray-600">{taskCount} tasks</span>
                  <span className="dark:text-gray-400 text-gray-600">{activeProjects.length} projects</span>
                </div>
              </div>

              {/* Projects Section */}
              <div className="mb-4">
                <h3 className="text-sm font-medium dark:text-gray-300 text-gray-700 mb-2">Assigned Projects</h3>
                <div className="grid gap-2">
                  {activeProjects.length === 0 ? (
                    <div className="text-xs text-gray-500">No projects assigned.</div>
                  ) : (
                    activeProjects.map(project => {
                      const projectTasks = getProjectTasks(project.id);
                      const isExpanded = expandedProjects.has(project.id);
                      return (
                          <div key={project.id} className="bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                            <div className="p-3">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  {project.installDate && (() => {
                                    const urgency = getUrgencyColor(project.installDate);
                                    return (
                                      <div className={`px-2 py-0.5 rounded-full ${urgency.bg} border flex-shrink-0`}>
                                        <span className={`text-xs font-medium ${urgency.text}`}>
                                          {urgency.label}
                                        </span>
                                      </div>
                                    );
                                  })()}
                                  <span className="font-semibold text-blue-700 dark:text-blue-200 cursor-pointer" onClick={() => onNavigateToProject && onNavigateToProject(project.id)}>
                                    {project.title}
                                  </span>
                                </div>
                                <button
                                  className="text-xs text-blue-600 hover:underline"
                                  onClick={() => toggleProjectExpansion(project.id)}
                                >
                                  {isExpanded ? "Hide Tasks" : `Show Tasks (${projectTasks.length})`}
                                </button>
                              </div>
                              {isExpanded && (
                                <div className="pl-4">
                                  {projectTasks.length === 0 ? (
                                    <div className="text-xs text-gray-500">No tasks in this project.</div>
                                  ) : (
                                  projectTasks.map(task => (
                                    <div key={task.id} className="p-2 bg-white dark:bg-gray-800 rounded text-sm">
                                      {task.title}
                                    </div>
                                  ))
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Tasks Section */}
              <div className="mb-4">
                <h3 className="text-sm font-medium dark:text-gray-300 text-gray-700 mb-2">Assigned Tasks</h3>
                <div className="grid gap-2">
                  {tasks.length === 0 ? (
                    <div className="text-xs text-gray-500">No tasks assigned.</div>
                  ) : (
                    tasks.map(task => (
                      <div key={task.id} className="p-2 bg-white dark:bg-gray-800 rounded text-sm">
                        {task.title}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          );
        })
      )}
      <ConfirmModal
        open={confirmOpen}
        title="Confirm"
        message="Are you sure?"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={async () => {
          setConfirmOpen(false);
          if (confirmAction) await confirmAction();
          setConfirmAction(null);
        }}
      />
    </div>
  );
};