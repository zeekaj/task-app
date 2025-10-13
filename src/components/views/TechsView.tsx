// src/components/views/AssigneesView.tsx
import React, { useState, useMemo } from "react";
import { TaskItem } from "../TaskItem";
import { TaskEditForm } from "../TaskEditForm";
import { FilterBar } from "../FilterBar";
import { Dropdown } from "../shared/Dropdown";
import { getUrgencyColor } from "../../utils/urgency";
import type { WithId, Task, Blocker, TaskFilters } from "../../types";

interface TechsViewProps {
  uid: string;
  allTasks: WithId<Task>[];
  allBlockers: WithId<Blocker>[];
  allProjects?: any[];
  selectedTech?: string | null;
  onNavigateToAllTechs?: () => void;
  onNavigateToProject?: (projectId: string) => void;
}

export const TechsView: React.FC<TechsViewProps> = ({
  uid,
  allTasks,
  allBlockers,
  allProjects = [],
  selectedTech,
  onNavigateToAllTechs,
  onNavigateToProject,
}) => {
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  // Filter state
  const FILTERS_KEY = "taskAppDefaultFilters_TechsView";
  const techsDefaultFilters = {
    status: ["active", "done"],
    minPriority: [0, 1, 2, 3, 4], // Include all priorities
    due: ["any"],
    assigned: [],
    includeArchived: false,
  };
  const [filters, setFilters] = useState<TaskFilters & { groupBy?: string }>(() => {
    const saved = localStorage.getItem(FILTERS_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return techsDefaultFilters;
      }
    }
    return techsDefaultFilters;
  });
  const [showAll, setShowAll] = useState(false);
  const [arrangeBy, setArrangeBy] = useState<string>("priority");
  const [reverseOrder, setReverseOrder] = useState<boolean>(false);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

  const toggleProjectExpansion = (projectId: string) => {
    setExpandedProjects(prev => {
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
    return allTasks.filter(task => task.projectId === projectId && task.status !== 'done' && task.status !== 'archived');
  };



  const arrangeOptions = [
    { value: "priority", label: "Priority" },
    { value: "status", label: "Status" },
    { value: "title", label: "Title" },
    { value: "dueDate", label: "Due Date" },
    { value: "age", label: "Age" },
  ];

  // Helper function for due date filtering
  function isWithinDueFilter(dueISO: string | null, filter: "any" | "overdue" | "today" | "week" | "month") {
    if (!dueISO) return filter === "any";
    const due = new Date(dueISO);
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    
    // Calculate end of current week (Sunday)
    const endOfWeek = new Date(startOfToday);
    const currentDayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const daysUntilSunday = currentDayOfWeek === 0 ? 0 : 7 - currentDayOfWeek;
    endOfWeek.setDate(startOfToday.getDate() + daysUntilSunday + 1); // +1 to include Sunday
    
    switch (filter) {
      case "any":
        return true;
      case "overdue":
        return due < startOfToday;
      case "today":
        return due >= startOfToday && due < endOfToday;
      case "week":
        return due >= startOfToday && due < endOfWeek;
      case "month":
        // Calculate end of current month
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        return due >= startOfToday && due < endOfMonth;
      default:
        return false;
    }
  }

  // Group tasks by assignee with filtering
  const tasksByAssignee = useMemo(() => {
    const groups: { [assignee: string]: WithId<Task>[] } = {};
    
    // First, add all people who have projects (even if no tasks)
    allProjects.forEach(project => {
      // Add owner
      if (project.owner && !groups[project.owner]) {
        groups[project.owner] = [];
      }
      // Add legacy assignee
      if (project.assignee && !groups[project.assignee]) {
        groups[project.assignee] = [];
      }
      // Add multiple assignees
      if (project.assignees) {
        project.assignees.forEach((assignee: string) => {
          if (!groups[assignee]) {
            groups[assignee] = [];
          }
        });
      }
    });
    
    // Apply filters
    let filteredTasks = allTasks;
    
    if (showAll) {
      // When showAll is true, just filter out blocked status and apply basic filters
      filteredTasks = allTasks.filter(task => task.status !== 'blocked');
    } else {
      // Apply all filters
      if (!filters.includeArchived) {
        filteredTasks = filteredTasks.filter(task => task.status !== 'archived');
      }
      
      if (filters.status && filters.status.length > 0) {
        filteredTasks = filteredTasks.filter(task => {
          const statusMap: Record<string, string[]> = {
            active: ["not_started", "in_progress", "blocked"],
            blocked: ["blocked"],
            done: ["done"],
            archived: ["archived"],
          };
          return filters.status.some((f) => statusMap[f]?.includes(task.status));
        });
      }
      
      if (filters.minPriority && filters.minPriority.length > 0) {
        filteredTasks = filteredTasks.filter(task => filters.minPriority.some((p) => task.priority === p));
      }
      
      if (filters.due && filters.due.length > 0) {
        filteredTasks = filteredTasks.filter(task => 
          filters.due.some((d) => isWithinDueFilter(task.dueDate, d as "any" | "overdue" | "today" | "week" | "month"))
        );
      }
      
      if (filters.assigned && filters.assigned.length > 0) {
        filteredTasks = filteredTasks.filter(task => {
          const isNone = !task.assignee || task.assignee === null || task.assignee === undefined;
          if (filters.assigned && filters.assigned.includes("(None)")) {
            if (isNone) return true;
          }
          if (typeof task.assignee === "object" && task.assignee !== null) {
            return filters.assigned && (filters.assigned.includes(task.assignee.name) || filters.assigned.includes(task.assignee.id));
          }
          return filters.assigned && filters.assigned.includes(task.assignee as string);
        });
      }
    }
    
    filteredTasks.forEach(task => {
      let assigneeName = 'Unassigned';
      
      if (task.assignee) {
        if (typeof task.assignee === 'string') {
          assigneeName = task.assignee;
        } else if (task.assignee.name) {
          assigneeName = task.assignee.name;
        } else if (task.assignee.id) {
          assigneeName = task.assignee.id;
        }
      }
      
      if (!groups[assigneeName]) {
        groups[assigneeName] = [];
      }
      groups[assigneeName].push(task);
    });

    // Sort tasks within each group by the selected arrangement
    Object.keys(groups).forEach(assignee => {
      groups[assignee].sort((a, b) => {
        let result = 0;
        switch (arrangeBy) {
          case "status":
            result = a.status.localeCompare(b.status);
            break;
          case "title":
            result = a.title.localeCompare(b.title);
            break;
          case "dueDate":
            if (!a.dueDate && !b.dueDate) result = 0;
            else if (!a.dueDate) result = 1;
            else if (!b.dueDate) result = -1;
            else result = a.dueDate.localeCompare(b.dueDate);
            break;
          case "priority":
            result = b.priority - a.priority; // Higher priority first by default
            break;
          case "age":
          default:
            const aTime = a.createdAt && typeof a.createdAt === 'object' && 'toDate' in a.createdAt ? a.createdAt.toDate().getTime() : 0;
            const bTime = b.createdAt && typeof b.createdAt === 'object' && 'toDate' in b.createdAt ? b.createdAt.toDate().getTime() : 0;
            result = aTime - bTime; // Older first by default
            break;
        }
        return reverseOrder ? -result : result;
      });
    });

    return groups;
  }, [allTasks, filters, showAll, arrangeBy, reverseOrder]);

  const assigneeNames = Object.keys(tasksByAssignee)
    .filter(name => selectedTech ? name === selectedTech : true)
    .sort((a, b) => {
      // Put "Unassigned" last
      if (a === 'Unassigned') return 1;
      if (b === 'Unassigned') return -1;
      return a.localeCompare(b);
    });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold dark:text-accent text-gray-900">
          {selectedTech ? `Tasks for ${selectedTech}` : 'Tasks by Tech'}
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
              allAssignees={undefined} // No assignee filter needed for individual tech view
              compact={false}
              showAll={showAll}
              onToggleShowAll={() => setShowAll((v) => !v)}
              localStorageKey={FILTERS_KEY}
            />
            {/* Separator after filters */}
            <div className="h-8 w-px bg-gray-300 dark:bg-gray-700 mx-2" />
            {/* Arrange by controls */}
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
        <p className="dark:text-gray-500 text-gray-500">No tasks found.</p>
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
            // Check legacy assignee, new assignees array, and owner
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
                  {activeProjects.length > 0 && (
                    <span className="dark:text-gray-400 text-gray-600">{activeProjects.length} projects</span>
                  )}
                </div>
              </div>

              {/* Projects Section */}
              {activeProjects.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium dark:text-gray-300 text-gray-700 mb-2">Assigned Projects</h3>
                  <div className="grid gap-2">
                    {activeProjects.map(project => {
                      const projectTasks = getProjectTasks(project.id);
                      const isExpanded = expandedProjects.has(project.id);
                      
                      return (
                        <div key={project.id} className="bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                          <div className="p-3">
                            <div className="flex items-center justify-between mb-2">
                              {/* Left side - urgency marker, dropdown caret and project info */}
                              <div className="flex items-center gap-2">
                                {/* Urgency marker */}
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
                                
                                {/* Dropdown caret button */}
                                {projectTasks.length > 0 ? (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleProjectExpansion(project.id);
                                    }}
                                    className="p-1 rounded hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors duration-200"
                                    title={isExpanded ? "Hide tasks" : "Show tasks"}
                                  >
                                    <svg 
                                      className={`w-4 h-4 text-blue-700 dark:text-blue-300 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                                      fill="none" 
                                      stroke="currentColor" 
                                      viewBox="0 0 24 24"
                                    >
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                  </button>
                                ) : (
                                  <div className="w-6 h-6"></div> // Spacer for projects without tasks
                                )}
                                
                                {/* Clickable project area */}
                                <div 
                                  className="flex items-center gap-2 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-md p-1 -m-1 transition-all duration-200"
                                  onClick={() => onNavigateToProject?.(project.id)}
                                  title={`Click to view ${project.title} project`}
                                >
                                  <span className="font-medium text-blue-900 dark:text-blue-200">{project.title}</span>
                                  {project.owner === assigneeName && (
                                    <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-semibold">OWNER</span>
                                  )}
                                </div>
                              </div>
                              
                              {/* Right side - status */}
                              <div className="flex items-center">
                                <span className={`text-xs px-2 py-1 rounded-full ${
                                  project.status === 'not_started' ? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' :
                                  project.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                                  project.status === 'blocked' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                                  'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                }`}>
                                  {project.status.replace('_', ' ')}
                                </span>
                              </div>
                            </div>

                            {/* Project details row - only show when expanded */}
                            {isExpanded && (
                              <div className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-4">
                                  {/* R2# */}
                                  {project.r2Number && (
                                    <span className="text-blue-700 dark:text-blue-300 font-mono">
                                      R2#{project.r2Number}
                                    </span>
                                  )}
                                  
                                  {/* Install Date */}
                                  {project.installDate && (
                                    <span className="text-gray-600 dark:text-gray-400">
                                      Install: {project.installDate.toDate ? 
                                        project.installDate.toDate().toLocaleDateString() : 
                                        new Date(project.installDate).toLocaleDateString()
                                      }
                                    </span>
                                  )}
                                </div>
                                
                                {/* Urgency marker */}
                                {project.installDate && (() => {
                                  const urgency = getUrgencyColor(project.installDate);
                                  return (
                                    <div className={`px-2 py-0.5 rounded-full ${urgency.bg} border`}>
                                      <span className={`text-xs font-medium ${urgency.text}`}>
                                        {urgency.label}
                                      </span>
                                    </div>
                                  );
                                })()}
                              </div>
                            )}
                          </div>
                          
                          {/* Expandable tasks list */}
                          {isExpanded && projectTasks.length > 0 && (
                            <div className="px-3 pb-3">
                              <div className="border-t border-blue-200 dark:border-blue-800 pt-2 mt-2">
                                <div className="text-xs font-medium text-blue-800 dark:text-blue-300 mb-2">
                                  Tasks ({projectTasks.length})
                                </div>
                                <div className="space-y-1">
                                  {projectTasks.map(task => (
                                    <div 
                                      key={task.id} 
                                      className="flex items-center justify-between py-1 px-2 bg-white dark:bg-gray-800 rounded text-xs"
                                    >
                                      <span className="text-gray-700 dark:text-gray-300 truncate">{task.title}</span>
                                      <span className={`px-1.5 py-0.5 rounded text-xs ${
                                        task.status === 'not_started' ? 'bg-gray-100 text-gray-600 dark:bg-gray-600 dark:text-gray-300' :
                                        task.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-800 dark:text-yellow-200' :
                                        task.status === 'blocked' ? 'bg-red-100 text-red-700 dark:bg-red-800 dark:text-red-200' :
                                        'bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-200'
                                      }`}>
                                        {task.status.replace('_', ' ')}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tasks Section */}
              {tasks.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium dark:text-gray-300 text-gray-700 mb-2">Assigned Tasks</h3>
                </div>
              )}

              <ul className="space-y-2">
                {tasks.map(task => (
                  <li key={task.id}>
                    {editingTaskId === task.id ? (
                      <div className="mt-2">
                        <TaskEditForm
                          uid={uid}
                          task={task}
                          allProjects={allProjects || []}
                          allBlockers={allBlockers}
                          onSave={() => setEditingTaskId(null)}
                          onCancel={() => setEditingTaskId(null)}
                          onDelete={async () => {
                            if (window.confirm("Delete this task?")) {
                              const { removeTask } = await import("../../services/tasks");
                              await removeTask(uid, task.id);
                              setEditingTaskId(null);
                            }
                          }}
                          onArchive={async () => {
                            const { archiveTask } = await import("../../services/tasks");
                            await archiveTask(uid, task.id);
                          }}
                          onUnarchive={async () => {
                            const { unarchiveTask } = await import("../../services/tasks");
                            await unarchiveTask(uid, task.id);
                          }}
                          onStatusChange={async (newStatus) => {
                            const { updateTask } = await import("../../services/tasks");
                            await updateTask(uid, task.id, { status: newStatus });
                          }}
                        />
                      </div>
                    ) : (
                      <TaskItem
                        uid={uid}
                        task={task}
                        allBlockers={allBlockers}
                        allTasks={allTasks}
                        onStartEdit={() => setEditingTaskId(task.id)}
                        onManageBlockers={() => {
                          // Handle blocker management
                        }}
                        onStartBlock={() => {
                          // Handle start blocking
                        }}
                        onArchive={async () => {
                          const { archiveTask } = await import("../../services/tasks");
                          await archiveTask(uid, task.id);
                        }}
                        onDelete={async () => {
                          const { removeTask } = await import("../../services/tasks");
                          await removeTask(uid, task.id);
                        }}
                        onUnarchive={async () => {
                          const { unarchiveTask } = await import("../../services/tasks");
                          await unarchiveTask(uid, task.id);
                        }}
                        onStatusChange={async (newStatus) => {
                          const { updateTask } = await import("../../services/tasks");
                          await updateTask(uid, task.id, { status: newStatus });
                        }}
                        onPriorityChange={async (taskId, newPriority) => {
                          const { updateTask } = await import("../../services/tasks");
                          await updateTask(uid, taskId, { priority: newPriority });
                        }}
                      />
                    )}
                  </li>
                ))}
              </ul>
            </div>
          );
        })
      )}
    </div>
  );
};