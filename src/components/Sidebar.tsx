// src/components/Sidebar.tsx
import React, { useState, useMemo } from "react";
import { useDroppable } from "@dnd-kit/core";
import { getProjectProgress } from '../services/progress';
import { getUrgencyColor } from '../utils/urgency';

// import { QuickAddTask } from "./views/QuickAddTask";

type SidebarProjectDroppableProps = {
  project: WithId<Project>;
  currentView: View;
  editingProjectId: string | null;
  editingProjectTitle: string;
  handleProjectClick: (p: WithId<Project>) => void;
  handleSaveEdit: () => void;
  handleCancelEdit: () => void;
  setEditingProjectTitle: (title: string) => void;
  allTasks: any[];
};

function SidebarProjectDroppable({
  project,
  currentView,
  editingProjectId,
  editingProjectTitle,
  handleProjectClick,
  handleSaveEdit,
  handleCancelEdit,
  setEditingProjectTitle,
  allTasks,
}: SidebarProjectDroppableProps) {
  const { setNodeRef } = useDroppable({ id: `sidebar-project-${project.id}` });
  const projectTasks = allTasks.filter((t: any) => t.projectId === project.id);
  const progress = getProjectProgress(projectTasks);
  return (
    <li
      ref={setNodeRef}
      className="group flex items-center pr-2 rounded-lg transition-colors duration-200"
    >
      {editingProjectId === project.id ? (
        <input
          type="text"
          value={editingProjectTitle}
          onChange={(e) => setEditingProjectTitle(e.target.value)}
          onBlur={handleSaveEdit}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSaveEdit();
            if (e.key === "Escape") handleCancelEdit();
          }}
          className="flex-1 border-b m-2 p-1 bg-transparent"
          autoFocus
        />
      ) : (
        <div className="flex flex-col w-full">
          <button
            onClick={() => handleProjectClick(project)}
            className={`relative flex items-center gap-2 pl-2 pr-4 py-1 w-full rounded-full text-sm font-medium truncate transition-all duration-200 text-white border-none outline-none focus:ring-2 focus:ring-blue-400 leading-tight
              shadow-[0_4px_16px_0_rgba(0,0,0,0.18),0_1.5px_0_0_rgba(255,255,255,0.18)_inset] -translate-y-0.5
              ${currentView.type === "project" && currentView.id === project.id
                ? "shadow-[inset_0_2px_12px_2px_rgba(0,0,0,0.28),inset_0_1.5px_0_0_rgba(255,255,255,0.10)] translate-y-0.5 bg-gray-300/30 dark:bg-gray-700/60"
                : "shadow-[0_4px_16px_0_rgba(0,0,0,0.18),0_1.5px_0_0_rgba(255,255,255,0.18)_inset] -translate-y-0.5"}
              hover:scale-105 hover:shadow-[0_6px_24px_0_rgba(0,120,255,0.18),0_2px_0_0_rgba(255,255,255,0.22)_inset] active:scale-97 active:ring-2 active:ring-blue-300
            `}
            style={{
              background: undefined,
              minHeight: '1.5rem',
              lineHeight: '1.25',
            }}
          >
            {/* Progress bar background */}
            {/* Progress bar background, color by status, no status dot */}
            <span
              className="absolute left-0 top-0 h-full rounded-full transition-all z-0"
              style={{
                width: `${progress.percent}%`,
                background: project.status === "not_started" ? '#9ca3af' // gray-400
                  : project.status === "in_progress" ? '#3b82f6' // blue-500
                  : project.status === "blocked" ? '#ef4444' // red-500
                  : project.status === "completed" ? '#22c55e' // green-500
                  : project.status === "archived" ? '#facc15' // yellow-500
                  : '#9ca3af',
                opacity: 0.7,
              }}
            />
            {/* Project name and percent above progress */}
            <span className="relative z-10 flex items-center justify-between w-full">
              {/* Left side - Urgency marker */}
              <div className="flex items-center flex-shrink-0">
                {project.installDate && (() => {
                  const urgency = getUrgencyColor(project.installDate);
                  return (
                    <div className={`px-1.5 py-0.5 rounded-full ${urgency.bg} border flex-shrink-0`}>
                      <span className={`text-xs font-medium ${urgency.text}`}>
                        {urgency.label}
                      </span>
                    </div>
                  );
                })()}
              </div>
              
              {/* Center - Project name */}
              <span className="truncate flex-1 text-center drop-shadow-sm mx-2" style={{textShadow: '0 1px 2px rgba(0,0,0,0.25)'}}>
                {project.title}
              </span>
              
              {/* Right side - Progress percentage */}
              <span className="text-xs text-white/80 tabular-nums drop-shadow-sm flex-shrink-0" style={{textShadow: '0 1px 2px rgba(0,0,0,0.25)'}}>{progress.percent}%</span>
            </span>
          </button>
        </div>
      )}
      {/* Archive button moved to ProjectView */}
    </li>
  );
}

type SidebarQuickTasksDroppableProps = {
  currentView: View;
  setCurrentView: (v: View) => void;
};

function SidebarQuickTasksDroppable({ currentView, setCurrentView }: SidebarQuickTasksDroppableProps) {
  const { setNodeRef, isOver } = useDroppable({ id: "sidebar-quicktasks" });
  return (
    <li
      ref={setNodeRef}
      className={isOver ? "dark:bg-accent/30 bg-blue-200 rounded-lg" : ""}
    >
      <button
        onClick={() => setCurrentView({ type: "tasks", id: null })}
        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors duration-200 ${
          currentView.type === "tasks"
            ? "bg-surface text-gray-900"
            : "hover:bg-sidebar/80 text-white"
        }`}
      >
        <Icon path="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" />
        <span className="font-semibold">Tasks</span>
      </button>
    </li>
  );
}
import { useProjects } from "../hooks/useProjects";
import Icon from "./Icon";
import { createProject, updateProject } from "../services/projects";
import type { WithId, Project } from "../types";

type View =
  | { type: "tasks"; id: null }
  | { type: "blocked"; id: null }
  | { type: "project"; id: string }
  | { type: "calendar"; id: null }
  | { type: "techs"; id: null | string };

export const Sidebar: React.FC<{
  uid: string;
  currentView: View;
  setCurrentView: (v: View) => void;
  allTasks: any[];
}> = ({ uid, currentView, setCurrentView, allTasks }) => {
  const projects = useProjects(uid);
  const [newProjectTitle, setNewProjectTitle] = useState("");
  const [newProjectAssignee, setNewProjectAssignee] = useState("");
  const [showAddProject, setShowAddProject] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingProjectTitle, setEditingProjectTitle] = useState("");
  const [openGroups, setOpenGroups] = useState<{ [k: string]: boolean }>({});

  // Calculate tech statistics
    const techStats = useMemo(() => {
    const techNames = new Set<string>();
    const techTaskCounts: { [techName: string]: number } = {};

    // Process tasks to get tech names and counts
    allTasks.forEach((task: any) => {
      if (task.status === 'done' || task.status === 'archived') return; // Skip completed tasks

      let techName: string | undefined;
      if (typeof task.assignee === 'string') {
        techName = task.assignee;
      } else if (task.assignee && typeof task.assignee === 'object' && task.assignee.name) {
        techName = task.assignee.name;
      }

      if (techName) {
        techNames.add(techName);
        techTaskCounts[techName] = (techTaskCounts[techName] || 0) + 1;
      }
    });

    // Process projects to get tech names and add to counts
    projects.forEach((project: any) => {
      if (project.status === 'completed' || project.status === 'archived') return; // Skip completed projects

      // Handle legacy single assignee (but skip string "undefined")
      if (project.assignee && project.assignee !== "undefined") {
        techNames.add(project.assignee);
        techTaskCounts[project.assignee] = (techTaskCounts[project.assignee] || 0) + 1;
      }
      
      // Handle new multiple assignees
      if (project.assignees && Array.isArray(project.assignees)) {
        project.assignees.forEach((assignee: string) => {
          techNames.add(assignee);
          techTaskCounts[assignee] = (techTaskCounts[assignee] || 0) + 1;
        });
      }
      
      // Handle project owner (only count if not already counted as assignee)
      if (project.owner && project.owner !== project.assignee && !project.assignees?.includes(project.owner)) {
        techNames.add(project.owner);
        techTaskCounts[project.owner] = (techTaskCounts[project.owner] || 0) + 1;
      }
    });

    return {
      techTaskCounts,
      techNames: Array.from(techNames).sort()
    };
  }, [allTasks, projects]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectTitle.trim()) return;
    try {
      await createProject(uid, newProjectTitle.trim(), newProjectAssignee || undefined);
      setNewProjectTitle("");
      setNewProjectAssignee("");
      setShowAddProject(false);
    } catch (err) {
      alert("Failed to create project. Please try again.");
    }
  };

  const handleProjectClick = (project: WithId<Project>) => {
    if (currentView.type === "project" && currentView.id === project.id) {
      setEditingProjectId(project.id);
      setEditingProjectTitle(project.title);
    } else {
      setCurrentView({ type: "project", id: project.id! });
    }
  };

  const handleCancelEdit = () => {
    setEditingProjectId(null);
    setEditingProjectTitle("");
  };

  const handleSaveEdit = async () => {
    if (!editingProjectId || !editingProjectTitle.trim()) return;
    await updateProject(uid, editingProjectId, { title: editingProjectTitle.trim() });
    handleCancelEdit();
  };

  // Archive project function moved to ProjectView

  return (
  <nav className="w-64 bg-sidebar text-white border-r border-border p-4 flex flex-col flex-shrink-0 transition-colors duration-200">
  <div className="font-bold text-lg mb-6 text-white">My App</div>
      <ul className="space-y-1">
        <SidebarQuickTasksDroppable currentView={currentView} setCurrentView={setCurrentView} />
        <li>
          <button
            onClick={() => setCurrentView({ type: "blocked", id: null })}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left ${
               currentView.type === "blocked"
                 ? "bg-surface text-gray-900"
                 : "hover:bg-sidebar/80 text-white"
            }`}
          >
            <Icon path="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8 0-1.85.63-3.55 1.69-4.9L16.9 18.31C15.55 19.37 13.85 20 12 20zm4.9-3.1L5.7 5.7C7.05 4.63 8.75 4 10.5 4c4.42 0 8 3.58 8 8 0 1.85-.63-3.55-1.69-4.9z" />
            <span className="font-semibold">Blocked</span>
          </button>
        </li>
        <li>
          <button
            onClick={() => setCurrentView({ type: "calendar", id: null })}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left ${
               currentView.type === "calendar"
                 ? "bg-surface text-gray-900"
                 : "hover:bg-sidebar/80 text-white"
            }`}
          >
            <Icon path="M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11zm0-13H5V6h14v1z" />
            <span className="font-semibold">Calendar</span>
          </button>
        </li>
        <li>
          <button
            onClick={() => setCurrentView({ type: "techs", id: null })}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left ${
               currentView.type === "techs"
                 ? "bg-surface text-gray-900"
                 : "hover:bg-sidebar/80 text-white"
            }`}
          >
            <Icon path="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            <span className="font-semibold">Techs</span>
            {techStats.techNames.length > 0 && (
              <span className="ml-auto text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">
                {Object.values(techStats.techTaskCounts).reduce((sum, count) => sum + count, 0)}
              </span>
            )}
          </button>
        </li>
      </ul>

      <div className="mt-6 pt-4 border-t">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-semibold text-white text-sm">Projects</h3>
          <button
            onClick={() => setShowAddProject(!showAddProject)}
            className="text-gray-200 hover:text-white"
            title="Add new project"
          >
            <Icon path="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
          </button>
        </div>

        {showAddProject && (
          uid && uid.trim() ? (
            <form onSubmit={handleCreateProject} className="flex flex-col gap-2 mb-4">
              <input
                className="flex-1 border dark:bg-background bg-white dark:text-gray-100 text-gray-900 rounded-md px-2 py-1 text-sm"
                placeholder="New project name"
                value={newProjectTitle}
                onChange={(e) => setNewProjectTitle(e.target.value)}
                autoFocus
              />
              <select
                className="flex-1 border dark:bg-background bg-white dark:text-gray-100 text-gray-900 rounded-md px-2 py-1 text-sm"
                value={newProjectAssignee}
                onChange={(e) => setNewProjectAssignee(e.target.value)}
              >
                <option value="">Select Tech (Optional)</option>
                {techStats.techNames.map((techName) => (
                  <option key={techName} value={techName}>
                    {techName}
                  </option>
                ))}
              </select>
              <button className="px-2 py-1 dark:bg-accent bg-black dark:text-white text-white text-sm rounded-md">Add Project</button>
            </form>
          ) : (
            <div className="mb-4 text-sm text-red-200">You must be signed in to create a project.</div>
          )
        )}

        {/* Group projects by status with dropdowns */}
        {[
          { key: "not_started", label: "Not Started" },
          { key: "in_progress", label: "In Progress" },
          { key: "blocked", label: "Blocked" },
          { key: "completed", label: "Completed" },
          { key: "archived", label: "Archived" },
        ].map(({ key, label }) => {
          const groupProjects = projects.filter((p) => p.status === key);
          if (groupProjects.length === 0) return null;
          const isOpen = openGroups[key] ?? true;
          return (
            <div key={key} className="mb-2">
              <button
                type="button"
                className={`flex items-center gap-2 w-full text-left text-xs font-semibold px-3 py-1 rounded-full mb-1
                  ${key === "not_started" ? "bg-gray-400 text-gray-900"
                  : key === "in_progress" ? "bg-gradient-to-br from-[#0B234B] via-[#1D3A7C] to-[#2563EB] text-white shadow-[inset_0_6px_18px_0_rgba(255,255,255,0.38)] border border-blue-900 text-base font-bold py-2.5"
                  : key === "blocked" ? "bg-gradient-to-br from-[#4B0B0B] via-[#7C1D1D] to-[#B91C1C] text-white shadow-[inset_0_6px_18px_0_rgba(255,255,255,0.38)] border border-red-950 text-base font-bold py-2.5"
                  : key === "completed" ? "bg-green-500 text-white"
                  : key === "archived" ? "bg-yellow-500 text-gray-900"
                  : "bg-gray-300 text-gray-900"}
                  hover:opacity-90 transition-colors`}
                onClick={() => setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }))}
              >
                <span className="flex items-center gap-2">
                  <span>{label}</span>
                  <span className="bg-black/20 text-xs px-2 py-0.5 rounded-full font-bold">
                    {groupProjects.length}
                  </span>
                </span>
                <span className="ml-auto">{isOpen ? "▼" : "►"}</span>
              </button>
              {isOpen && (
                <ul className="space-y-2 ml-2">
                  {groupProjects.map((p) => (
                    <SidebarProjectDroppable
                      key={p.id}
                      project={p}
                      currentView={currentView}
                      editingProjectId={editingProjectId}
                      editingProjectTitle={editingProjectTitle}
                      handleProjectClick={handleProjectClick}
                      handleSaveEdit={handleSaveEdit}
                      handleCancelEdit={handleCancelEdit}
                      setEditingProjectTitle={setEditingProjectTitle}
                      // uid prop removed
                      allTasks={allTasks}
                    />
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      {/* Techs Section */}
      <div className="mt-6 pt-4 border-t">
        <h3 className="font-semibold text-white text-sm mb-2">Techs</h3>
        {techStats.techNames.length > 0 ? (
          <ul className="space-y-2">
            {techStats.techNames.map((techName) => {
              // Calculate separate counts for tasks and projects
              const taskCount = allTasks.filter((task: any) => {
                if (task.status === 'done' || task.status === 'archived') return false;
                const assignee = typeof task.assignee === 'string' ? task.assignee : task.assignee?.name;
                return assignee === techName;
              }).length;
              
              const projectCount = projects.filter((project: any) => {
                if (project.status === 'completed' || project.status === 'archived') return false;
                // Check legacy assignee, new assignees array, and owner
                const hasLegacyAssignment = project.assignee === techName && project.assignee !== "undefined";
                const hasMultipleAssignment = project.assignees && project.assignees.includes(techName);
                const isOwner = project.owner === techName;
                return hasLegacyAssignment || hasMultipleAssignment || isOwner;
              }).length;
              
              return (
                <li key={techName}>
                  <button
                    onClick={() => setCurrentView({ type: "techs", id: techName })}
                    className="relative flex items-center gap-2 pl-2 pr-4 py-1 w-full rounded-full text-sm font-medium truncate transition-all duration-200 text-white border-none outline-none focus:ring-2 focus:ring-blue-400 bg-white/10
                      shadow-[0_4px_16px_0_rgba(0,0,0,0.18),0_1.5px_0_0_rgba(255,255,255,0.18)_inset] -translate-y-0.5
                      hover:scale-105 hover:shadow-[0_6px_24px_0_rgba(0,120,255,0.18),0_2px_0_0_rgba(255,255,255,0.22)_inset] active:scale-97 active:ring-2 active:ring-blue-300"
                    style={{
                      background: undefined,
                      minHeight: '1.5rem',
                      lineHeight: '1.25',
                    }}
                    title={`${taskCount} task${taskCount !== 1 ? 's' : ''}, ${projectCount} project${projectCount !== 1 ? 's' : ''}`}
                  >
                    <span className="flex items-center justify-between w-full">
                      <span className="truncate flex-1">{techName}</span>
                      <span className="ml-2 flex items-center gap-1 text-xs text-white/80">
                        {taskCount > 0 && (
                          <span className="flex items-center gap-0.5">
                            <Icon path="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" className="w-3 h-3" />
                            <span className="tabular-nums">{taskCount}</span>
                          </span>
                        )}
                        {projectCount > 0 && (
                          <span className="flex items-center gap-0.5">
                            <Icon path="M10 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2h-8l-2-2z" className="w-3 h-3" />
                            <span className="tabular-nums">{projectCount}</span>
                          </span>
                        )}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-gray-400">No techs with active tasks.</p>
        )}
      </div>
    </nav>
  );
};
