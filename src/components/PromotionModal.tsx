/* eslint-disable react/prop-types */
// src/components/PromotionModal.tsx
import { useState } from "react";
import { createProject } from "../services/projects";
import { updateTask } from "../services/tasks";
import { useKeydown } from "../hooks/useKeydown";

export const PromotionModal: React.FC<{
  uid: string;
  task: any;
  onClose: () => void;
}> = ({ uid, task, onClose }) => {
  const [projectName, setProjectName] = useState(task.title);

  useKeydown({
    Escape: onClose,
  });

  const handlePromote = async () => {
    if (!projectName.trim()) return;
    const newProjectId = await createProject(uid, projectName.trim());
    await updateTask(uid, task.id, { projectId: newProjectId });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="dark:bg-surface bg-white rounded-lg shadow-xl p-6 w-full max-w-md dark:border dark:border-gray-800" onClick={(e) => e.stopPropagation()}>
  <h2 className="text-lg font-bold mb-4 dark:text-accent text-gray-900">Promote Task to Project</h2>
        <div className="mt-4">
          <label htmlFor="projectName" className="block text-sm font-medium dark:text-gray-300 text-gray-700">New Project Name</label>
          <input
            id="projectName"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="mt-1 block w-full border dark:border-gray-700 border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-accent focus:border-accent sm:text-sm dark:bg-background dark:text-gray-100"
            autoFocus
          />
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium dark:text-gray-100 text-gray-700 dark:bg-background bg-white border dark:border-gray-700 border-gray-300 rounded-md dark:hover:bg-surface hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={handlePromote} className="px-4 py-2 text-sm font-medium text-white dark:bg-accent bg-blue-600 border border-transparent rounded-md dark:hover:bg-indigo-700 hover:bg-blue-700">
            Create Project
          </button>
        </div>
      </div>
    </div>
  );
};
