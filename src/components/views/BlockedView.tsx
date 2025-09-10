// src/components/views/BlockedView.tsx
import React from "react";
import type { WithId, Project, Task, Blocker, BlockableEntity } from "../../types";
import { TaskItem } from "../TaskItem";

export const BlockedView: React.FC<{
  uid: string;
  allProjects: WithId<Project>[];
  allTasks: WithId<Task>[];
  allBlockers: WithId<Blocker>[];
  openBlockerManagerModal: (target: BlockableEntity) => void;
  setPromotingTask: (task: WithId<Task>) => void;
  setCurrentView: (view: { type: "tasks" | "project" | "blocked"; id?: string | null }) => void;
}> = ({ uid, allProjects, allTasks, allBlockers, openBlockerManagerModal, setPromotingTask, setCurrentView }) => {
  const blockedProjects = allProjects.filter((p) => p.status === "blocked");
  const blockedTasks = allTasks.filter((t) => t.status === "blocked");
  const byProject = (allBlockers ?? []).reduce((map, t) => {
    const pid = t.projectId ?? "__none__";
    (map[pid] ||= []).push(t);
    return map;
  }, {} as Record<string, WithId<Task>[]>);
  
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">All Blocked Items</h1>

      <h2 className="text-lg font-semibold mb-3 border-b pb-2">Blocked Projects</h2>
      {blockedProjects.length > 0 ? (
        <ul className="space-y-2 mb-6">
          {blockedProjects.map((p) => (
            <li key={p.id} className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
              <span className="font-semibold text-red-800">{p.title}</span>
              <button onClick={() => setCurrentView({ type: "project", id: p.id })} className="text-sm text-blue-600 hover:underline">
                Go to project
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-500 mb-6">No projects are blocked. Great!</p>
      )}

      <h2 className="text-lg font-semibold mb-3 border-b pb-2">Blocked Tasks</h2>
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
            />
          ))}
        </ul>
      ) : (
        <p className="text-gray-500">No tasks are blocked. Keep it up!</p>
      )}
    </div>
  );
};
