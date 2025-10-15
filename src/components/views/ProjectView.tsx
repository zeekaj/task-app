import React, { useState, useEffect, useRef } from "react";
// Removed dnd-kit imports
import { getProjectProgress } from '../../services/progress';
import { getUrgencyColor } from '../../utils/urgency';

import type { Project, TaskFilters, WithId, Task } from "../../types";
import { TaskItem } from "../TaskItem";
import { TaskEditForm } from "../TaskEditForm";
import { FilterBar } from "../FilterBar";
import { Dropdown } from "../shared/Dropdown";
import { createTask } from "../../services/tasks";
import { BlockerManagerModal } from "../BlockerManagerModal";

const projectStatusConfig: { [key in Project["status"]]: { label: string; icon: JSX.Element; bgColor: string } } = {
  not_started: { 
    label: "Not Started", 
    bgColor: "bg-gray-200",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-4 h-4 text-gray-700">
        <path d="M376 88C376 57.1 350.9 32 320 32C289.1 32 264 57.1 264 88C264 118.9 289.1 144 320 144C350.9 144 376 118.9 376 88zM400 300.7L446.3 363.1C456.8 377.3 476.9 380.3 491.1 369.7C505.3 359.1 508.3 339.1 497.7 324.9L427.2 229.9C402 196 362.3 176 320 176C277.7 176 238 196 212.8 229.9L142.3 324.9C131.8 339.1 134.7 359.1 148.9 369.7C163.1 380.3 183.1 377.3 193.7 363.1L240 300.7L240 576C240 593.7 254.3 608 272 608C289.7 608 304 593.7 304 576L304 416C304 407.2 311.2 400 320 400C328.8 400 336 407.2 336 416L336 576C336 593.7 350.3 608 368 608C385.7 608 400 593.7 400 576L400 300.7z"/>
      </svg>
    )
  },
  in_progress: { 
    label: "In Progress", 
    bgColor: "bg-blue-300",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-4 h-4 text-blue-500">
        <path d="M352.5 32C383.4 32 408.5 57.1 408.5 88C408.5 118.9 383.4 144 352.5 144C321.6 144 296.5 118.9 296.5 88C296.5 57.1 321.6 32 352.5 32zM219.6 240C216.3 240 213.4 242 212.2 245L190.2 299.9C183.6 316.3 165 324.3 148.6 317.7C132.2 311.1 124.2 292.5 130.8 276.1L152.7 221.2C163.7 193.9 190.1 176 219.6 176L316.9 176C345.4 176 371.7 191.1 386 215.7L418.8 272L480.4 272C498.1 272 512.4 286.3 512.4 304C512.4 321.7 498.1 336 480.4 336L418.8 336C396 336 375 323.9 363.5 304.2L353.5 287.1L332.8 357.5L408.2 380.1C435.9 388.4 450 419.1 438.3 445.6L381.7 573C374.5 589.2 355.6 596.4 339.5 589.2C323.4 582 316.1 563.1 323.3 547L372.5 436.2L276.6 407.4C243.9 397.6 224.6 363.7 232.9 330.6L255.6 240L219.7 240zM211.6 421C224.9 435.9 242.3 447.3 262.8 453.4L267.5 454.8L260.6 474.1C254.8 490.4 244.6 504.9 231.3 515.9L148.9 583.8C135.3 595 115.1 593.1 103.9 579.5C92.7 565.9 94.6 545.7 108.2 534.5L190.6 466.6C195.1 462.9 198.4 458.1 200.4 452.7L211.6 421z"/>
      </svg>
    )
  },
  blocked: { 
    label: "Blocked", 
    bgColor: "bg-red-300",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-red-600">
        <path fillRule="evenodd" d="M6.72 5.66l11.62 11.62A8.25 8.25 0 006.72 5.66zm10.56 12.68L5.66 6.72a8.25 8.25 0 0011.62 11.62zM5.105 5.106c3.807-3.808 9.98-3.808 13.788 0 3.808 3.807 3.808 9.98 0 13.788-3.807 3.808-9.98 3.808-13.788 0-3.808-3.807-3.808-9.98 0-13.788z" clipRule="evenodd" />
      </svg>
    )
  },
  completed: { 
    label: "Completed", 
    bgColor: "bg-green-300",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-4 h-4 text-green-600">
        <path d="M280 88C280 57.1 254.9 32 224 32C193.1 32 168 57.1 168 88C168 118.9 193.1 144 224 144C254.9 144 280 118.9 280 88zM304 300.7L341 350.6C353.8 333.1 369.5 317.9 387.3 305.6L331.1 229.9C306 196 266.3 176 224 176C181.7 176 142 196 116.8 229.9L46.3 324.9C35.8 339.1 38.7 359.1 52.9 369.7C67.1 380.3 87.1 377.3 97.7 363.1L144 300.7L144 576C144 593.7 158.3 608 176 608C193.7 608 208 593.7 208 576L208 416C208 407.2 215.2 400 224 400C232.8 400 240 407.2 240 416L240 576C240 593.7 254.3 608 272 608C289.7 608 304 593.7 304 576L304 300.7zM640 464C640 384.5 575.5 320 496 320C416.5 320 352 384.5 352 464C352 543.5 416.5 608 496 608C575.5 608 640 543.5 640 464zM553.4 403.1C560.5 408.3 562.1 418.3 556.9 425.4L492.9 513.4C490.1 517.2 485.9 519.6 481.2 519.9C476.5 520.2 471.9 518.6 468.6 515.3L428.6 475.3C422.4 469.1 422.4 458.9 428.6 452.7C434.8 446.5 445 446.5 451.2 452.7L478 479.5L531 406.6C536.2 399.5 546.2 397.9 553.4 403.1z"/>
      </svg>
    )
  },
  archived: { 
    label: "Archived", 
    bgColor: "bg-yellow-300",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-yellow-700">
        <path d="M3.375 3C2.339 3 1.5 3.84 1.5 4.875v.75c0 1.036.84 1.875 1.875 1.875h17.25c1.035 0 1.875-.84 1.875-1.875v-.75C22.5 3.839 21.66 3 20.625 3H3.375z" />
        <path fillRule="evenodd" d="m3.087 9l.54 9.176A3 3 0 006.62 21h10.757a3 3 0 002.995-2.824L20.913 9H3.087zm6.163 3.75A.75.75 0 0110 12h4a.75.75 0 010 1.5h-4a.75.75 0 01-.75-.75z" clipRule="evenodd" />
      </svg>
    )
  },
};

const ProjectView: React.FC<{
  // Props only, no logic or debug logs here
  uid: string;
  projectId: string;
  allTasks: any[];
  allBlockers: any[];
  allProjects: any[];
  onBack?: () => void;
  previousViewType?: string;
}> = ({
  uid,
  projectId,
  allTasks,
  allBlockers,
  allProjects,
  onBack,
  previousViewType,


}) => {
  // Find the current project FIRST so hooks can use it
  const currentProject = allProjects.find((p: any) => p.id === projectId);
  const [statusIconHovered, setStatusIconHovered] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(currentProject?.title || '');

  // Local state for R2# and Install Date fields
  const [r2NumberInput, setR2NumberInput] = useState(currentProject?.r2Number || '');
  const [installDateInput, setInstallDateInput] = useState(() => {
    if (!currentProject?.installDate) return '';
    let d;
    if (typeof currentProject.installDate === 'object' && 'toDate' in currentProject.installDate) {
      d = (currentProject.installDate as any).toDate();
    } else if (currentProject?.installDate) {
      d = new Date(currentProject.installDate as string);
    } else {
      return '';
    }
    return d.toISOString().split('T')[0];
  });

  // Sync local state when project changes
  useEffect(() => {
    setR2NumberInput(currentProject?.r2Number || '');
    setTitleInput(currentProject?.title || '');
    if (!currentProject?.installDate) {
      setInstallDateInput('');
    } else {
      let d;
      if (typeof currentProject.installDate === 'object' && 'toDate' in currentProject.installDate) {
        d = (currentProject.installDate as any).toDate();
      } else {
        d = new Date(currentProject.installDate as string);
      }
      setInstallDateInput(d.toISOString().split('T')[0]);
    }
  }, [currentProject?.r2Number, currentProject?.installDate, currentProject?.id, currentProject?.title]);
  // Your component logic here
  // Modal state for managing blockers
  const [showBlockerManager, setShowBlockerManager] = useState<{ open: boolean; taskId: string | null }>({ open: false, taskId: null });

  // Function to open the manage blockers modal for a task
  const openManageBlockers = (task: any) => {
    setShowBlockerManager({ open: true, taskId: task.id });
  };
  // (removed duplicate declaration of currentProject)
  // Project tasks for progress
  const projectTasks = allTasks.filter((t: any) => t.projectId === projectId);
  const progress = getProjectProgress(projectTasks);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const projectBlockers = allBlockers.filter((b: any) => b.entityId === projectId);
  // Blocked tasks for this project
  const blockedTasks = allTasks.filter((t: any) => t.projectId === projectId && t.status === 'blocked');
  const FILTERS_KEY = "taskAppDefaultFilters_ProjectView";
  const projectDefaultFilters = {
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
        return projectDefaultFilters;
      }
    }
    return projectDefaultFilters;
  });
  const [showAll, setShowAll] = useState(false);
  const [quickAdd, setQuickAdd] = useState("");
  // Quick add handler for project tasks
  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAdd.trim()) return;
    try {
      await createTask(uid, quickAdd.trim(), projectId);
      setQuickAdd("");
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };
  const [arrangeBy, setArrangeBy] = useState<string>("age");
  const [reverseOrder, setReverseOrder] = useState<boolean>(false);
  const [showTeamManager, setShowTeamManager] = useState(false);
  const teamManagerRef = useRef<HTMLDivElement>(null);

  // Click away listener for team manager
  useEffect(() => {
    if (!showTeamManager) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (teamManagerRef.current && !teamManagerRef.current.contains(event.target as Node)) {
        setShowTeamManager(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showTeamManager]);



  const arrangeOptions = [
    { value: "status", label: "Status" },
    { value: "title", label: "Title" },
    { value: "dueDate", label: "Due Date" },
    { value: "priority", label: "Priority" },
    { value: "assigned", label: "Assigned" },
    { value: "age", label: "Age" },
  ];

  // Filtering logic (copied from TasksView)
  type DueFilter = "any" | "overdue" | "today" | "week" | "month";
  function isWithinDueFilter(dueISO: string | null, filter: DueFilter) {
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

  // ...other hooks and helper functions...


  // Compute filtered/sorted list for display and drag
  const computeProjectTasks = () => {
    let list = allTasks.filter((t: any) => t.projectId === projectId && t.status !== 'blocked');
    if (showAll) return list;
    if (!filters.includeArchived) {
      list = list.filter((t: any) => t.status !== "archived");
    }
    if (filters.status && filters.status.length > 0) {
      list = list.filter((t: any) => {
        const statusMap: Record<string, string[]> = {
          active: ["not_started", "in_progress", "blocked"],
          blocked: ["blocked"],
          done: ["done"],
          archived: ["archived"],
        };
        return filters.status.some((f) => statusMap[f]?.includes(t.status));
      });
    }
    if (filters.minPriority && filters.minPriority.length > 0) {
      list = list.filter((t: any) => filters.minPriority.some((p) => t.priority === p));
    }
    if (filters.due && filters.due.length > 0) {
      list = list.filter((t: any) => (filters.due as DueFilter[]).some((d) => isWithinDueFilter(t.dueDate, d)));
    }
    if (filters.assigned && filters.assigned.length > 0) {
      list = list.filter((t: any) => {
        const isNone = !t.assignee || t.assignee === null || t.assignee === undefined;
        if (filters.assigned && filters.assigned.includes("(None)")) {
          if (isNone) return true;
        }
        if (typeof t.assignee === "object" && t.assignee !== null) {
          return filters.assigned && (filters.assigned.includes(t.assignee.name) || filters.assigned.includes(t.assignee.id));
        }
        return filters.assigned && filters.assigned.includes(t.assignee);
      });
    }
    list = [...list];
    switch (arrangeBy) {
      case "status":
        list.sort((a, b) => a.status.localeCompare(b.status));
        break;
      case "title":
        list.sort((a, b) => String(a.title).localeCompare(String(b.title)));
        break;
      case "dueDate":
        list.sort((a, b) => {
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return a.dueDate.localeCompare(b.dueDate);
        });
        break;
      case "priority":
        list.sort((a, b) => b.priority - a.priority);
        break;
      case "assigned":
        list.sort((a: any, b: any) => {
          const aAssignee = typeof a.assignee === "object" && a.assignee !== null
            ? a.assignee.name || a.assignee.id || JSON.stringify(a.assignee)
            : a.assignee || "";
          const bAssignee = typeof b.assignee === "object" && b.assignee !== null
            ? b.assignee.name || b.assignee.id || JSON.stringify(b.assignee)
            : b.assignee || "";
          return String(aAssignee).localeCompare(String(bAssignee));
        });
        break;
      case "age":
      default:
        list.sort((a, b) => {
          const aTime = (a.createdAt && typeof (a.createdAt as any).toDate === "function")
            ? (a.createdAt as any).toDate().getTime()
            : 0;
          const bTime = (b.createdAt && typeof (b.createdAt as any).toDate === "function")
            ? (b.createdAt as any).toDate().getTime()
            : 0;
          return aTime - bTime;
        });
        break;
    }
    if (reverseOrder) list.reverse();
    return list;
  };

  // Count hidden project tasks (active and blocked only)
  const hiddenProjectTasksCount = () => {
    if (showAll) return 0;
    
    const allProjectTasks = allTasks.filter((t: any) => t.projectId === projectId);
    const activeAndBlockedProjectTasks = allProjectTasks.filter((t: any) => 
      t.status === "not_started" || t.status === "in_progress" || t.status === "blocked"
    );
    
    const currentFilteredTasks = computeProjectTasks();
    return activeAndBlockedProjectTasks.length - currentFilteredTasks.length;
  };

  // No dragList; always use computeProjectTasks()
  // ...existing code...


  // dnd-kit drag-and-drop handlers

  return (
    <div className="dark:bg-background bg-white rounded-xl p-6 shadow-lg transition-colors duration-200 max-w-full overflow-hidden">
      {/* Back button */}
      {onBack && (
        <button
          onClick={onBack}
          className="mb-4 flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 transition-colors duration-200"
          title={`Back to ${previousViewType === 'techs' ? 'Techs View' : 'Previous View'}`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to {previousViewType === 'techs' ? 'Techs View' : 'Previous View'}
        </button>
      )}
      
      {/* Header - Multi-row layout for better organization */}
      <div className="mb-6 space-y-4">
        
        {/* Row 1: Project Title, Status, and Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            {editingTitle ? (
              <input
                type="text"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                onBlur={async () => {
                  if (titleInput.trim() && titleInput !== currentProject?.title && currentProject) {
                    const { updateProject } = await import("../../services/projects");
                    await updateProject(uid, currentProject.id, { title: titleInput.trim() });
                  }
                  setEditingTitle(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.currentTarget.blur();
                  }
                  if (e.key === 'Escape') {
                    setTitleInput(currentProject?.title || '');
                    setEditingTitle(false);
                  }
                }}
                className="text-3xl font-bold dark:text-accent text-gray-900 bg-transparent border-b-2 border-blue-500 focus:outline-none min-w-0 max-w-full"
                autoFocus
              />
            ) : (
              <h2 
                className="text-3xl font-bold dark:text-accent text-gray-900 truncate min-w-0 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 px-2 py-1 rounded transition-colors"
                onClick={() => setEditingTitle(true)}
                title="Click to edit project title"
              >
                {currentProject?.title || "Project"}
              </h2>
            )}
            
            {/* Status selector with collapsing icons */}
            {currentProject && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">Status:</span>
                <div 
                  className="flex items-center transition-all duration-300 overflow-hidden"
                  style={{
                    width: statusIconHovered ? '200px' : '48px',
                    minWidth: statusIconHovered ? '200px' : '48px',
                  }}
                  onMouseEnter={() => setStatusIconHovered(true)}
                  onMouseLeave={() => setStatusIconHovered(false)}
                >
                  {/* Show only current status when not hovered */}
                  {!statusIconHovered && (
                    <button
                      onClick={async () => {
                        // On click when collapsed, expand to show all options
                        setStatusIconHovered(true);
                      }}
                      className={`p-1.5 rounded-full transition-all duration-200 ${projectStatusConfig[currentProject.status as Project["status"]].bgColor}`}
                      title={`${projectStatusConfig[currentProject.status as Project["status"]].label} - Click to change`}
                    >
                      <span className="inline-flex items-center justify-center w-4 h-4">
                        {projectStatusConfig[currentProject.status as Project["status"]].icon}
                      </span>
                    </button>
                  )}
                  
                  {/* Show all status options when hovered */}
                  {statusIconHovered && (
                    <div className="flex items-center gap-1">
                      {(Object.entries(projectStatusConfig) as [Project["status"], typeof projectStatusConfig[Project["status"]]][]).map(([status, config]) => (
                        <button
                          key={status}
                          onClick={async () => {
                            if (status !== currentProject.status) {
                              const { updateProject } = await import("../../services/projects");
                              await updateProject(uid, currentProject.id, { status });
                            }
                            setStatusIconHovered(false);
                          }}
                          className={`p-1.5 rounded-full transition-all duration-200 ${
                            currentProject.status === status 
                              ? `${config.bgColor} ring-2 ring-offset-2 ring-blue-500` 
                              : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600'
                          }`}
                          title={config.label}
                        >
                          <span className={`inline-flex items-center justify-center ${
                            currentProject.status === status ? 'w-4 h-4' : 'w-4 h-4'
                          }`}>
                            {config.icon}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {currentProject && (
              <>
                {/* Archive project button */}
                <button
                  onClick={async () => {
                    if (window.confirm("Archive this project? It will be hidden from the main view but can be restored later.")) {
                      const { archiveProject } = await import("../../services/projects");
                      await archiveProject(uid, currentProject.id);
                      if (onBack) {
                        onBack();
                      }
                    }
                  }}
                  className="p-2 text-gray-400 hover:text-yellow-500 dark:text-gray-500 dark:hover:text-yellow-400 transition-colors duration-200"
                  title="Archive Project"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                  </svg>
                </button>
                
                {/* Delete project button */}
                <button
                  onClick={async () => {
                    const taskCount = projectTasks.length;
                    const confirmMessage = taskCount > 0 
                      ? `Delete project "${currentProject.title}"? This will permanently delete the project and ${taskCount} task${taskCount === 1 ? '' : 's'}. This action cannot be undone.`
                      : `Delete project "${currentProject.title}"? This action cannot be undone.`;
                    
                    if (window.confirm(confirmMessage)) {
                      const { deleteProject } = await import("../../services/projects");
                      await deleteProject(uid, currentProject.id);
                    if (onBack) {
                      onBack();
                    }
                  }
                }}
                className="p-2 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 transition-colors duration-200"
                title="Delete Project"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1-1H9a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </>
          )}
          </div>
        </div>
        
        {/* Row 2: Project Details in organized sections */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-8">
          
          {/* Project Info Section */}
          {currentProject && (
            <div className="flex flex-wrap items-center gap-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg px-4 py-3 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">R2#:</span>
                <input
                  type="text"
                  value={r2NumberInput}
                  onChange={async (e) => {
                    setR2NumberInput(e.target.value);
                    const { updateProject } = await import("../../services/projects");
                    await updateProject(uid, currentProject.id, { r2Number: e.target.value });
                  }}
                  className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 w-24"
                  placeholder="R2#"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Install Date:</span>
                <input
                  type="date"
                  value={installDateInput}
                  onChange={async (e) => {
                    setInstallDateInput(e.target.value);
                    const { updateProject } = await import("../../services/projects");
                    await updateProject(uid, currentProject.id, { 
                      installDate: e.target.value ? new Date(e.target.value) : undefined 
                    });
                  }}
                  className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                />
              </div>
              
              {/* Urgency marker */}
              {currentProject.installDate && (() => {
                const urgency = getUrgencyColor(currentProject.installDate);
                return (
                  <div className={`px-3 py-1.5 rounded-full ${urgency.bg} border`}>
                    <span className={`text-xs font-medium ${urgency.text}`}>
                      {urgency.label}
                    </span>
                  </div>
                );
              })()}
            </div>
          )}
          
          {/* Progress Section */}
          <div className="flex items-center gap-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg px-4 py-3 border border-blue-200 dark:border-blue-800">
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Progress:</span>
            <div className="flex items-center gap-2">
              <span className="w-32 h-3 bg-blue-200 dark:bg-blue-800 rounded-full overflow-hidden relative">
                <span
                  className="block h-full bg-blue-500 rounded-full transition-all"
                  style={{ width: `${progress.percent}%` }}
                />
              </span>
              <span className="text-sm font-semibold text-blue-700 dark:text-blue-300 min-w-[3rem]">
                {progress.percent}%
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Interactive Team Section */}
      {currentProject && (
        <div className="mb-4 relative" ref={teamManagerRef}>
          <div 
            className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors"
            onClick={() => setShowTeamManager(!showTeamManager)}
          >
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Team:</span>
              
              {/* Owner */}
              {currentProject.owner && (
                <div 
                  className="relative group flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 rounded-full cursor-pointer hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowTeamManager(!showTeamManager);
                  }}
                >
                  <svg className="w-4 h-4 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 3l14 9-14 9V3z" />
                  </svg>
                  <span className="text-sm font-semibold text-amber-800 dark:text-amber-200">{currentProject.owner}</span>
                  <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">OWNER</span>
                  
                  {/* Demote from owner button - appears on hover (left shoulder) */}
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      const { updateProject } = await import("../../services/projects");
                      const { deleteField } = await import("firebase/firestore");
                      
                      // When demoting owner, keep them as regular assignee
                      let newAssignees = [...(currentProject.assignees || [])];
                      
                      // Add the current owner to assignees if they're not already there
                      if (!newAssignees.includes(currentProject.owner) && currentProject.assignee !== currentProject.owner) {
                        newAssignees.push(currentProject.owner);
                      }
                      
                      await updateProject(uid, currentProject.id, {
                        owner: deleteField() as any,
                        assignees: newAssignees
                      });
                    }}
                    className="absolute -top-1 -left-1 w-5 h-5 bg-yellow-500 hover:bg-yellow-600 text-white rounded-full flex items-center justify-center text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-md z-10"
                    title="Remove as owner (keep as assignee)"
                  >
                    −
                  </button>
                  
                  {/* Delete button - appears on hover (right shoulder) */}
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      const { updateProject } = await import("../../services/projects");
                      const { deleteField } = await import("firebase/firestore");
                      
                      // When deleting owner, remove them from all fields
                      let newAssignees = [...(currentProject.assignees || [])];
                      let newAssignee = currentProject.assignee;
                      
                      // Remove owner from assignees array if present
                      newAssignees = newAssignees.filter(a => a !== currentProject.owner);
                      
                      // Remove owner from single assignee field if present
                      if (currentProject.assignee === currentProject.owner) {
                        newAssignee = undefined;
                      }
                      
                      await updateProject(uid, currentProject.id, {
                        owner: deleteField() as any,
                        assignee: newAssignee,
                        assignees: newAssignees
                      });
                    }}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-md z-10"
                    title="Remove from project"
                  >
                    ×
                  </button>
                </div>
              )}
              
              {/* All other assignees */}
              {(() => {
                const allAssignees = [
                  ...(currentProject.assignee && currentProject.assignee !== currentProject.owner ? [currentProject.assignee] : []),
                  ...(currentProject.assignees || []).filter((a: string) => a !== currentProject.owner)
                ];
                
                return allAssignees.map((assignee: string) => (
                  <div 
                    key={assignee}
                    className="relative group flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700 rounded-full cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowTeamManager(!showTeamManager);
                    }}
                  >
                    <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="text-sm font-medium text-blue-800 dark:text-blue-200">{assignee}</span>
                    
                    {/* Promote to owner button - appears on hover (left shoulder) */}
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        
                        const { updateProject } = await import("../../services/projects");
                        await updateProject(uid, currentProject.id, {
                          owner: assignee
                        });
                      }}
                      className="absolute -top-1 -left-1 w-5 h-5 bg-yellow-500 hover:bg-yellow-600 text-white rounded-full flex items-center justify-center text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-md"
                      title="Promote to owner"
                    >
                      +
                    </button>
                    
                    {/* Delete button - appears on hover (right shoulder) */}
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        
                        const { updateProject } = await import("../../services/projects");
                        let newAssignees = [...(currentProject.assignees || [])];
                        let newAssignee = currentProject.assignee;
                        
                        // Remove from all fields where this member appears
                        if (currentProject.assignee === assignee) {
                          newAssignee = undefined;
                        }
                        
                        // Always try to remove from assignees array
                        newAssignees = newAssignees.filter(a => a !== assignee);
                        
                        await updateProject(uid, currentProject.id, {
                          assignee: newAssignee,
                          assignees: newAssignees
                        });
                      }}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-md"
                      title="Remove from project"
                    >
                      ×
                    </button>
                  </div>
                ));
              })()}
              
              {/* Add team member button */}
              <div 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowTeamManager(!showTeamManager);
                }}
                className="flex items-center justify-center w-8 h-8 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded-full cursor-pointer hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
              >
                <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </div>
              
              {/* No one assigned */}
              {!currentProject.owner && 
               !currentProject.assignee && 
               (!currentProject.assignees || currentProject.assignees.length === 0) && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-full">
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Click to add team members</span>
                </div>
              )}
            </div>
          </div>

          {/* Team Management Dropdown */}
          {showTeamManager && (
            <div ref={teamManagerRef} className="absolute top-full left-0 right-0 z-10 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
              <div className="p-4">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Add Team Member</h4>
                
                {/* Add New Members */}
                <div>
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Select or add new member:</div>
                  
                  {/* Available people from tasks */}
                  {Array.from(new Set(allTasks.map((t) => typeof t.assignee === "string" ? t.assignee : t.assignee?.name).filter((v): v is string => Boolean(v)))).map((techName) => {
                    // Check if person is already on this project (owner, assignee, or in assignees array)
                    const isAlreadyOnProject = [
                      currentProject.owner,
                      currentProject.assignee,
                      ...(currentProject.assignees || [])
                    ].includes(techName);
                    
                    if (isAlreadyOnProject) return null;
                    
                    return (
                      <button
                        key={techName}
                        onClick={async () => {
                          const { updateProject } = await import("../../services/projects");
                          const newAssignees = [...(currentProject.assignees || []), techName];
                          await updateProject(uid, currentProject.id, { assignees: newAssignees });
                          setShowTeamManager(false);
                        }}
                        className="block w-full text-left px-2 py-1 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
                      >
                        {techName}
                      </button>
                    );
                  })}
                  
                  {/* Add new person input */}
                  <input
                    type="text"
                    placeholder="Add new person..."
                    className="w-full text-sm px-2 py-1 border border-gray-300 dark:border-gray-600 rounded mt-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                    onKeyDown={async (e) => {
                      if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                        const newMember = e.currentTarget.value.trim();
                        // Clear the input first, before any async operations
                        e.currentTarget.value = '';
                        
                        const { updateProject } = await import("../../services/projects");
                        const newAssignees = [...(currentProject.assignees || []), newMember];
                        await updateProject(uid, currentProject.id, { assignees: newAssignees });
                        setShowTeamManager(false);
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2 dark:text-accent text-gray-900">Tasks</h3>
        <form onSubmit={handleQuickAdd} className="mt-3">
          <input
            className="w-full border dark:border-gray-700 border-gray-300 rounded-lg px-3 py-2 text-base dark:bg-surface dark:text-gray-100"
            placeholder="✨ Add a new task to this project..."
            value={quickAdd}
            onChange={(e) => setQuickAdd(e.target.value)}
          />
        </form>
        {/* Filters, Show All, Group/Arrange controls (match TasksView) */}
        <div className="mt-4 flex flex-col md:flex-row md:items-center md:gap-4">
          <div className="flex flex-wrap items-center gap-3 bg-white/80 dark:bg-surface/80 rounded-2xl shadow px-4 py-3 border border-gray-200 dark:border-gray-700 w-full">
            <FilterBar
              filters={filters}
              onChange={setFilters}
              allAssignees={Array.from(new Set(allTasks.map((t) => typeof t.assignee === "string" ? t.assignee : t.assignee?.name).filter((v): v is string => Boolean(v))))}
              compact={false}
              showAll={showAll}
              onToggleShowAll={() => setShowAll((v) => !v)}
              localStorageKey={FILTERS_KEY}
            />
            
            {/* Hidden tasks indicator */}
            {hiddenProjectTasksCount() > 0 && (
              <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd"/>
                  <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z"/>
                </svg>
                <span>{hiddenProjectTasksCount()} task{hiddenProjectTasksCount() === 1 ? '' : 's'} hidden by filters</span>
              </div>
            )}
            
            {/* Separator after filters */}
            <div className="h-8 w-px bg-gray-300 dark:bg-gray-700 mx-2" />
            {/* Group by and Arrange by controls */}
            <div className="flex items-center gap-2">
              <Dropdown label={`Group by${filters.groupBy && filters.groupBy !== "none" ? `: ${["None","Status","Priority","Due","Assignee"][ ["none","status","priority","due","assigned"].indexOf(filters.groupBy) ]}` : ""}`}>
                {["none","status","priority","due","assigned"].map((val, i) => (
                  <label key={val} className="flex items-center gap-2 px-2 py-1">
                    <input
                      type="radio"
                      name="groupBy"
                      checked={(filters.groupBy || "none") === val}
                      onChange={() => setFilters({ ...filters, groupBy: val as "none" | "status" | "priority" | "due" | "assigned" })}
                    />
                    <span>{["None","Status","Priority","Due","Assignee"][i]}</span>
                  </label>
                ))}
              </Dropdown>
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
        {computeProjectTasks().length > 0 ? (
          <ul className="space-y-2 max-w-full overflow-hidden">
            {computeProjectTasks().map((task: WithId<Task>) => (
              <li
                key={task.id}
                className="max-w-full overflow-hidden"
              >
                {editingTaskId === task.id ? (
                  <div className="mt-2">
                    <TaskEditForm
                      uid={uid}
                      task={task}
                      allProjects={allProjects}
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
                    onManageBlockers={() => openManageBlockers(task)}
                    onStartBlock={() => openManageBlockers(task)}
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
                  />
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="dark:text-gray-500 text-gray-500">No tasks for this project.</p>
        )}
      </div>

      {(projectBlockers.length > 0 || blockedTasks.length > 0) && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold dark:text-red-400 text-red-800">Blockers</h3>
            {(projectBlockers.length + blockedTasks.length) > 1 && (
              <button
                className="px-3 py-1 rounded bg-accent text-white text-sm font-semibold hover:bg-indigo-700 dark:bg-accent dark:hover:bg-indigo-500 transition-colors"
                onClick={() => setShowBlockerManager({ open: true, taskId: 'ALL' })}
              >
                Manage Blockers
              </button>
            )}
          </div>
          <div className="space-y-6">
            {/* Project-level blockers */}
            <div>
              <h4 className="font-semibold text-red-700 dark:text-red-300 mb-2">Project Blockers</h4>
              {projectBlockers.length > 0 ? (
                <ul className="space-y-2">
                  {projectBlockers.map((blocker: any) => (
                    <li key={blocker.id} className="p-3 dark:bg-red-900 bg-red-50 dark:border-red-800 border-red-200 rounded-lg flex items-center justify-between">
                      <div>
                        <div className="font-semibold dark:text-red-300 text-red-800">{blocker.reason}</div>
                        {blocker.waitingOn && <div className="text-xs dark:text-red-200 text-red-700">Waiting on: {blocker.waitingOn}</div>}
                        {blocker.expectedDate && <div className="text-xs dark:text-red-200 text-red-700">Expected: {blocker.expectedDate.toDate ? blocker.expectedDate.toDate().toLocaleDateString() : new Date(blocker.expectedDate).toLocaleDateString()}</div>}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">No project blockers.</p>
              )}
            </div>
            {/* Task-level blockers, grouped by task */}
            <div>
              <h4 className="font-semibold text-red-700 dark:text-red-300 mb-2">Task Blockers</h4>
              {blockedTasks.length > 0 ? (
                <ul className="space-y-4">
                  {blockedTasks.map((task: any) => {
                    const taskBlockers = allBlockers.filter((b: any) => b.entityId === task.id && b.status === 'active');
                    if (taskBlockers.length === 0) return null;
                    return (
                      <li key={task.id} className="bg-white dark:bg-red-950 border border-gray-200 dark:border-red-800 rounded-lg p-3">
                        <div className="font-semibold text-gray-800 dark:text-red-200 mb-1">Task: {typeof task.title === 'string' ? task.title : JSON.stringify(task.title)}</div>
                        <ul className="space-y-2">
                          {taskBlockers.map((blocker: any) => (
                            <li key={blocker.id} className="p-3 dark:bg-red-900 bg-red-50 dark:border-red-800 border-red-200 rounded-lg flex items-center justify-between">
                              <div>
                                <div className="font-semibold dark:text-red-300 text-red-800">{blocker.reason}</div>
                                {blocker.waitingOn && <div className="text-xs dark:text-red-200 text-red-700">Waiting on: {blocker.waitingOn}</div>}
                                {blocker.expectedDate && <div className="text-xs dark:text-red-200 text-red-700">Expected: {blocker.expectedDate.toDate ? blocker.expectedDate.toDate().toLocaleDateString() : new Date(blocker.expectedDate).toLocaleDateString()}</div>}
                              </div>
                              <button onClick={() => openManageBlockers(task)} className="text-sm dark:text-accent text-blue-600 hover:underline">Edit</button>
                            </li>
                          ))}
                        </ul>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">No blocked tasks.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Removed All Projects list as requested */}

      {showBlockerManager.open && (
      <BlockerManagerModal
        uid={uid}
        entity={
          showBlockerManager.taskId === 'ALL'
            ? { id: projectId, title: currentProject?.title || '', type: 'project', showAll: true }
            : showBlockerManager.taskId
              ? {
                  id: showBlockerManager.taskId,
                  title: (() => {
                    const t = allTasks.find((tt: any) => tt.id === showBlockerManager.taskId);
                    return t ? (typeof t.title === 'string' ? t.title : String(t.title)) : '';
                  })(),
                  type: 'task',
                }
              : {
                  id: projectId,
                  title: currentProject?.title || '',
                  type: 'project',
                }
        }
        allBlockers={allBlockers}
        allTasks={allTasks}
        onClose={() => setShowBlockerManager({ open: false, taskId: null })}
      />
    )}
    </div>
  );
};

export { ProjectView };