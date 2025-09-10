import React, { useState } from "react";
import type { WithId, Project, ProjectStatus, Task } from "/src/types";
import { updateProject } from "/src/services/projects";
import { TaskRow } from "/src/components/TaskRow";
import { TaskCreateForm } from "/src/components/TaskCreateForm";
import { TaskEditForm } from "/src/components/TaskEditForm";

type Props = {
  uid: string;
  projectId: string;
  allTasks: WithId<Task>[];
  allProjects: WithId<Project>[];
  openBlockerModal: (item: WithId<Project> | WithId<Task>) => void;
  openBlockerManagerModal: (project: WithId<Project>) => void;
  setPromotingTask: (task: WithId<Task>) => void;
  setCurrentView: (view: { type: string; id?: string }) => void;
};

export const ProjectView: React.FC<Props> = ({
  uid,
  projectId,
  allTasks,
  allProjects,
  openBlockerModal,
  openBlockerManagerModal,
  setPromotingTask,
  setCurrentView,
}) => {
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  const project = allProjects.find((p) => p.id === projectId);
  if (!project) {
    return (
      <div className="p-4">
        <p className="text-sm text-gray-500">Project not found.</p>
      </div>
    );
  }

  const isArchived = project.status === "archived";
  const isProjectBlocked = project.status === "blocked";

  const projectTasks = allTasks.filter((t) => t.projectId === project.id);

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-2">
        <h2 className="text-lg font-semibold">{project.title}</h2>
        <div className="flex items-center gap-2">
          {isProjectBlocked && (
            <span className="px-2 py-1 text-xs bg-red-200 text-red-800 rounded-md font-semibold">
              BLOCKED
            </span>
          )}

          {/* When NOT blocked: allow status changes */}
          {!isArchived && !isProjectBlocked && (
            <select
              value={project.status}
              onChange={async (e) => {
                const val = e.target.value as ProjectStatus;
                if (val === "blocked") {
                  // open project-level block modal
                  openBlockerModal({ ...project, type: "project" } as any);
                } else {
                  await updateProject(uid, projectId, { status: val });
                }
              }}
              className="p-1 border rounded-md bg-white text-sm"
              disabled={isArchived}
              title={isArchived ? "Unarchive to change status" : undefined}
            >
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
              <option value="blocked">Block…</option>
            </select>
          )}

          {/* When BLOCKED: hide status dropdown; show Manage blockers */}
          {isProjectBlocked && !isArchived && (
            <button
              type="button"
              className="text-xs ml-2 px-2 py-1 border rounded-md bg-white hover:bg-gray-50"
              onClick={() => openBlockerManagerModal({ ...project })}
              title="Resolve specific blocking items to clear this project"
            >
              Manage blockers
            </button>
          )}
        </div>
      </div>

      {/* Tasks */}
      <div>
        {projectTasks.length === 0 && (
          <p className="text-sm text-gray-500 italic">
            No tasks in this project.
          </p>
        )}

        <ul className="space-y-2">
          {projectTasks.map((task) =>
            editingTaskId === task.id ? (
              <TaskEditForm
                key={task.id}
                uid={uid}
                task={task}
                allProjects={allProjects}
                onSave={() => setEditingTaskId(null)}
                onCancel={() => setEditingTaskId(null)}
                onStartPromote={() => setPromotingTask(task)}
                onDelete={() => {
                  // handled inside TaskEditForm
                  setEditingTaskId(null);
                }}
              />
            ) : (
              <TaskRow
                key={task.id}
                task={task}
                onEdit={() => setEditingTaskId(task.id)}
                onPromote={() => setPromotingTask(task)}
                openBlockerModal={openBlockerModal}
                setCurrentView={setCurrentView}
              />
            )
          )}
        </ul>
      </div>

      {/* Task create form */}
      {!isArchived && (
        <TaskCreateForm
          uid={uid}
          projectId={project.id}
          allProjects={allProjects}
        />
      )}
    </div>
  );
};
