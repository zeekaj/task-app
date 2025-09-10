// src/components/PromotionModal.tsx
import React, { useEffect, useState } from "react";
import { createProject } from "../services/projects";
import { updateTask } from "../services/tasks";

export const PromotionModal: React.FC<{
  uid: string;
  task: any;
  onClose: () => void;
}> = ({ uid, task, onClose }) => {
  const [projectName, setProjectName] = useState(task.title);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handlePromote = async () => {
    if (!projectName.trim()) return;
    const newProjectId = await createProject(uid, projectName.trim());
    await updateTask(uid, task.id, { projectId: newProjectId });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold mb-4">Promote Task to Project</h2>
        <div className="mt-4">
          <label htmlFor="projectName" className="block text-sm font-medium text-gray-700">New Project Name</label>
          <input
            id="projectName"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            autoFocus
          />
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={handlePromote} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700">
            Create Project
          </button>
        </div>
      </div>
    </div>
  );
};
