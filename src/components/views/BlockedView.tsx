// src/components/views/BlockedView.tsx
import React, { useState } from "react";
import type { WithId, Project, Task, Blocker } from "../../types";
import { TaskItem } from "../TaskItem";
import { ConfirmModal } from "../shared/ConfirmModal";
import { BlockerManagerModal } from "../BlockerManagerModal";
import { useAllBlockers } from "../../hooks/useBlockers";
import { useProjects } from "../../hooks/useProjects";
import { useTasks } from "../../hooks/useTasks";

export const BlockedView: React.FC<{
  uid: string;
  allProjects?: WithId<Project>[];
  allTasks?: WithId<Task>[];
  allBlockers?: WithId<Blocker>[];
  setCurrentView: (v: any) => void;
}> = ({ uid, allProjects: propAllProjects, allTasks: propAllTasks, allBlockers: propAllBlockers, setCurrentView }) => {
  const hookAllBlockers = useAllBlockers(uid);
  const safeAllBlockers = propAllBlockers ?? hookAllBlockers;
  const hookProjects = useProjects(uid);
  const hookTasks = useTasks(uid);
  const allProjects = propAllProjects ?? hookProjects;
  const allTasks = propAllTasks ?? hookTasks;
  const blockedProjects = allProjects.filter((p: WithId<Project>) => p.status === "blocked");
  const blockedTasks = allTasks.filter((t: WithId<Task>) => t.status === "blocked");
  type ConfirmAction = (() => Promise<void>) | null;
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState<string>("");
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [blockerManagerTask, setBlockerManagerTask] = useState<{ id: string; title: string; type: "task" } | null>(null);
  // Removed unused 'byProject' and related type issues
  
  return (
    <>
    <div className="dark:bg-background bg-white rounded-xl p-6 shadow-lg transition-colors duration-200">
      <h1 className="text-2xl font-bold mb-6 dark:text-accent text-gray-900">All Blocked Items</h1>

      <h2 className="text-lg font-semibold mb-3 border-b pb-2 dark:text-red-400 text-red-800">Blocked Projects</h2>
      {blockedProjects.length > 0 ? (
        <ul className="space-y-2 mb-6">
          {blockedProjects.map((p: WithId<Project>) => (
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
          {blockedTasks.map((t: WithId<Task>) => (
              <TaskItem
              key={t.id}
              uid={uid}
              task={t}
              allBlockers={safeAllBlockers}
              allTasks={blockedTasks}
              onStartEdit={() => {}}
              onManageBlockers={() => setBlockerManagerTask({ id: t.id, title: t.title, type: "task" })}
              onStartBlock={() => {}}
              onArchive={async () => {
                const { archiveTask } = await import("../../services/tasks");
                await archiveTask(uid, t.id);
              }}
              onDelete={async () => {
                setConfirmMessage(`Delete task "${t.title}"? This action cannot be undone.`);
                setConfirmAction(() => async () => {
                  const { removeTask } = await import("../../services/tasks");
                  await removeTask(uid, t.id);
                });
                setConfirmOpen(true);
              }}
              onUnarchive={async () => {
                const { unarchiveTask } = await import("../../services/tasks");
                await unarchiveTask(uid, t.id);
              }}
              onStatusChange={async (newStatus) => {
                const { updateTask } = await import("../../services/tasks");
                await updateTask(uid, t.id, { status: newStatus });
              }}
              onUndo={async () => false}
            />
          ))}
        </ul>
      ) : (
        <p className="dark:text-gray-500 text-gray-500">No tasks are blocked. Keep it up!</p>
      )}
    </div>
    <ConfirmModal
      open={confirmOpen}
      title="Confirm"
      message={confirmMessage}
      confirmLabel="Delete"
      cancelLabel="Cancel"
      onCancel={() => setConfirmOpen(false)}
      onConfirm={async () => {
        setConfirmOpen(false);
        if (confirmAction) await confirmAction();
      }}
    />
    {blockerManagerTask && (
      <BlockerManagerModal
        uid={uid}
        entity={blockerManagerTask}
        onClose={() => setBlockerManagerTask(null)}
      />
    )}
    </>
  );
};
