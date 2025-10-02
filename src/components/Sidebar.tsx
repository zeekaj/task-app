// src/components/Sidebar.tsx
import React, { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
// imports already at top

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
}: SidebarProjectDroppableProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `sidebar-project-${project.id}` });
  return (
    <li
      ref={setNodeRef}
      className={`group flex items-center pr-2 rounded-lg transition-colors duration-200 ${isOver ? "dark:bg-accent/30 bg-blue-200" : "dark:hover:bg-surface hover:bg-gray-200"}`}
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
        <button
          onClick={() => handleProjectClick(project)}
          className={`flex-1 text-left flex items-center gap-3 px-3 py-2 rounded-lg text-sm truncate transition-colors duration-200 text-white ${
            currentView.type === "project" && currentView.id === project.id
              ? "bg-accent text-white"
              : "hover:bg-sidebar/80"
          }`}
        >
          <div
            className={`w-2.5 h-2.5 ${
              project.status === "blocked" ? "bg-red-500" : "bg-green-500"
            } rounded-full flex-shrink-0`}
          />
          <span className="truncate">{project.title}</span>
        </button>
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
        <span className="font-semibold">Quick Tasks</span>
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
  | { type: "project"; id: string };

export const Sidebar: React.FC<{
  uid: string;
  currentView: View;
  setCurrentView: (v: View) => void;
}> = ({ uid, currentView, setCurrentView }) => {
  const projects = useProjects(uid);
  const [newProjectTitle, setNewProjectTitle] = useState("");
  const [showAddProject, setShowAddProject] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingProjectTitle, setEditingProjectTitle] = useState("");

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectTitle.trim()) return;
    await createProject(uid, newProjectTitle.trim());
    setNewProjectTitle("");
    setShowAddProject(false);
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
        )}

        <ul className="space-y-1">
          {projects.map((p) => (
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
            />
          ))}
        </ul>
      </div>
    </nav>
  );
};
