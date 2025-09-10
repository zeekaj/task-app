// src/components/TaskEditForm.tsx
import React, { useState } from "react";
import type { WithId, Task, Project } from "../types";
import { updateTask } from "../services/tasks";

const priorities: { value: number; label: string }[] = [
  { value: 0, label: "P0 (Lowest)" },
  { value: 1, label: "P1" },
  { value: 2, label: "P2" },
  { value: 3, label: "P3" },
  { value: 4, label: "P4 (Highest)" },
];

type Props = {
  uid: string;
  task: WithId<Task>;
  allProjects?: WithId<Project>[];
  onSave: () => void;
  onCancel: () => void;
  onStartPromote: () => void;
  onDelete: () => void;
};

export const TaskEditForm: React.FC<Props> = ({
  uid,
  task,
  allProjects = [],
  onSave,
  onCancel,
  onStartPromote,
  onDelete,
}) => {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [priority, setPriority] = useState<number>(task.priority ?? 0);
  const [dueDate, setDueDate] = useState<string>(task.dueDate ?? "");
  const [projectId, setProjectId] = useState<string | null>(task.projectId);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await updateTask(uid, task.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        dueDate: dueDate || null,
        projectId: projectId ?? null,
      });
      onSave();
    } catch (err: any) {
      console.error("updateTask failed", err);
      setError(err?.message || "Failed to save task.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <li className="border rounded-xl p-4 bg-white shadow-sm">
      <form onSubmit={handleSave} className="space-y-3">
        <div className="flex items-center gap-2">
          <input
            className="flex-1 border rounded-md px-3 py-2"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task title"
            autoFocus
          />
        </div>

        <textarea
          className="w-full border rounded-md px-3 py-2"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional)"
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="flex flex-col text-sm">
            <span className="mb-1 text-gray-600">Priority</span>
            <select
              className="border rounded-md px-3 py-2"
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value))}
            >
              {priorities.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col text-sm">
            <span className="mb-1 text-gray-600">Due Date</span>
            <input
              type="date"
              className="border rounded-md px-3 py-2"
              value={dueDate ? dueDate.substring(0, 10) : ""}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </label>

          <label className="flex flex-col text-sm">
            <span className="mb-1 text-gray-600">Project</span>
            <select
              className="border rounded-md px-3 py-2"
              value={projectId ?? ""}
              onChange={(e) => setProjectId(e.target.value || null)}
            >
              <option value="">— None —</option>
              {allProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </label>
        </div>

        {error && <div className="text-sm text-red-600">{error}</div>}

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="submit"
            disabled={saving}
            className="px-3 py-2 rounded-md bg-blue-600 text-white disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-2 rounded-md border"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onStartPromote}
            className="px-3 py-2 rounded-md border"
            title="Promote to project or higher visibility"
          >
            Promote
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="px-3 py-2 rounded-md border text-red-600"
          >
            Delete
          </button>
        </div>
      </form>
    </li>
  );
};
