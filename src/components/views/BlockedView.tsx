// src/components/views/BlockedView.tsx
import React from "react";
import type { WithId, Project, Task, Blocker } from "../../types";
import { TaskItem } from "../TaskItem";

export const BlockedView: React.FC<{
  uid: string;
  allProjects: WithId<Project>[];
  allTasks: WithId<Task>[];
  allBlockers: WithId<Blocker>[];
  openBlockerManagerModal: (t: any) => void;
  setPromotingTask: (t: any) => void;
  setCurrentView: (v: any) => void;
}> = ({ uid, allProjects, allTasks, allBlockers, openBlockerManagerModal, setPromotingTask, setCurrentView }) => {
  const blockedProjects = allProjects.filter((p) => p.status === "blocked");
  const blockedTasks = allTasks.filter((t) => t.status === "blocked");
  // Removed unused 'byProject' and related type issues
  
  return (
    <div className="dark:bg-background bg-white rounded-xl p-6 shadow-lg transition-colors duration-200">
      <h1 className="text-2xl font-bold mb-6 dark:text-accent text-gray-900">All Blocked Items</h1>

      <h2 className="text-lg font-semibold mb-3 border-b pb-2 dark:text-red-400 text-red-800">Blocked Projects</h2>
      {blockedProjects.length > 0 ? (
        <ul className="space-y-2 mb-6">
          {blockedProjects.map((p) => (
            <li key={p.id} className="p-3 dark:bg-red-900 bg-red-50 dark:border-red-800 border-red-200 rounded-lg flex items-center justify-between">
              <span className="font-semibold dark:text-red-300 text-red-800">{p.title}</span>
              <button onClick={() => setCurrentView({ type: "project", id: p.id })} className="text-sm dark:text-accent text-blue-600 hover:underline">
                Go to project
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="dark:text-gray-500 text-gray-500 mb-6">No projects are blocked. Great!</p>
      )}

      <h2 className="text-lg font-semibold mb-3 border-b pb-2 dark:text-accent text-gray-900">Blocked Tasks</h2>
      {blockedTasks.length > 0 ? (
        <ul className="space-y-2">
          {blockedTasks.map((t) => (
            <TaskItem
              key={t.id}
              uid={uid}
              task={t}
              allBlockers={allBlockers}
              onStartEdit={() => {}}
              onStartPromote={() => setPromotingTask(t)}
              onManageBlockers={() => openBlockerManagerModal({ ...t, type: "task" })}
              onStartBlock={() => {}}
              onArchive={() => {}}
              onDelete={() => {}}
              onUnarchive={() => {}}
              onStatusChange={() => {}}
            />
          ))}
        </ul>
      ) : (
        <p className="dark:text-gray-500 text-gray-500">No tasks are blocked. Keep it up!</p>
      )}
    </div>
  );
};
