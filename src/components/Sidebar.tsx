// src/components/Sidebar.tsx
import React, { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { getProjectProgress } from '../services/progress';

// import { QuickAddTask } from "./views/QuickAddTask";

type SidebarProjectDroppableProps = {
  project: WithId<Project>;
  currentView: View;
  editingProjectId: string | null;
  editingProjectTitle: string;
  handleProjectClick: (p: WithId<Project>) => void;
  handleDeleteProject: (id: string) => void;
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
  handleDeleteProject,
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
              <span className="truncate flex-1 text-center drop-shadow-sm" style={{textShadow: '0 1px 2px rgba(0,0,0,0.25)'}}>{project.title}</span>
              <span className="ml-2 text-xs text-white/80 tabular-nums drop-shadow-sm" style={{textShadow: '0 1px 2px rgba(0,0,0,0.25)'}}>{progress.percent}%</span>
            </span>
          </button>
        </div>
      )}
      <div className="opacity-0 group-hover:opacity-100 flex items-center">
        {editingProjectId !== project.id && (
          <button
            onClick={() => handleDeleteProject(project.id!)}
            className="p-1 dark:text-gray-400 text-gray-500 dark:hover:text-red-400 hover:text-red-600"
            title="Delete Project"
          >
            <Icon path="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
          </button>
        )}
      </div>
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
import { Icon } from "./shared/Icon";
import { createProject, deleteProject, updateProject } from "../services/projects";
import type { WithId, Project } from "../types";

type View =
  | { type: "tasks"; id: null }
  | { type: "blocked"; id: null }
  | { type: "project"; id: string }
  | { type: "calendar"; id: null };

export const Sidebar: React.FC<{
  uid: string;
  currentView: View;
  setCurrentView: (v: View) => void;
  allTasks: any[];
}> = ({ uid, currentView, setCurrentView, allTasks }) => {
  const projects = useProjects(uid);
  const [newProjectTitle, setNewProjectTitle] = useState("");
  const [showAddProject, setShowAddProject] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingProjectTitle, setEditingProjectTitle] = useState("");
  const [openGroups, setOpenGroups] = useState<{ [k: string]: boolean }>({});

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectTitle.trim()) return;
    try {
      await createProject(uid, newProjectTitle.trim());
      setNewProjectTitle("");
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

  const handleDeleteProject = async (projectId: string) => {
    if (
      window.confirm("Delete this project and all its tasks? This cannot be undone.")
    ) {
      if (currentView.type === "project" && currentView.id === projectId) {
        setCurrentView({ type: "tasks", id: null });
      }
      await deleteProject(uid, projectId);
    }
  };

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
            <form onSubmit={handleCreateProject} className="flex gap-2 mb-4">
              <input
                className="flex-1 border dark:bg-background bg-white dark:text-gray-100 text-gray-900 rounded-md px-2 py-1 text-sm"
                placeholder="New project name"
                value={newProjectTitle}
                onChange={(e) => setNewProjectTitle(e.target.value)}
                autoFocus
              />
              <button className="px-2 py-1 dark:bg-accent bg-black dark:text-white text-white text-sm rounded-md">Add</button>
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
                <span>{label}</span>
                <span className="ml-auto">{isOpen ? "▼" : "►"}</span>
              </button>
              {isOpen && (
                <ul className="space-y-1 ml-2">
                  {groupProjects.map((p) => (
                    <SidebarProjectDroppable
                      key={p.id}
                      project={p}
                      currentView={currentView}
                      editingProjectId={editingProjectId}
                      editingProjectTitle={editingProjectTitle}
                      handleProjectClick={handleProjectClick}
                      handleDeleteProject={handleDeleteProject}
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
  </nav>
  );
};
