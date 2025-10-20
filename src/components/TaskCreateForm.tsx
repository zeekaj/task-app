import React, { useState } from "react";
import type { WithId, Project } from "../types";
import { createTask } from "../services/tasks";
import { logError } from "../utils/logger";

type Props = {
  uid: string;
  projectId?: string | null;               // optional: allow creating unassigned tasks
  allProjects?: WithId<Project>[];
  onCreated?: (taskId: string) => void;
};

export const TaskCreateForm: React.FC<Props> = ({
  uid,
  projectId = null,
  allProjects = [],
  onCreated,
}) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<number>(50); // Default to medium (50)
  const [dueDate, setDueDate] = useState<string>("");
  const [proj, setProj] = useState<string | "">(projectId ?? "");
  const [assignee, setAssignee] = useState<string>(""); // New assignee state

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Priority helper functions (0-100 scale)
  const getPriorityLabel = (value: number): string => {
    if (value === 0) return "None";
    if (value <= 20) return "Very Low";
    if (value <= 40) return "Low";
    if (value <= 60) return "Medium";
    if (value <= 80) return "High";
    return "Urgent";
  };

  const getPrioritySliderColor = (value: number): string => {
    if (value === 0) return "#9ca3af"; // gray
    if (value <= 20) return "#60a5fa"; // blue
    if (value <= 40) return "#4ade80"; // green
    if (value <= 80) return "#fb923c"; // orange
    return "#ef4444"; // red
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const id = await createTask(
        uid,
        title.trim(),
        proj || null,
        {
          description: description.trim() || undefined,
          priority,
          dueDate: dueDate || null,
          assignee: assignee || undefined,
        }
      );
      setTitle("");
      setDescription("");
      setPriority(50);
      setDueDate("");
      setAssignee("");
      if (!projectId) setProj("");

      onCreated?.(id);
    } catch (err: any) {
      logError("createTask failed", (err as any)?.message ?? err);
      setError(err?.message || "Failed to create task.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="border rounded-xl p-4 bg-white shadow-sm space-y-3">
      <div className="flex items-center gap-2">
        <input
          className="flex-1 border rounded-md px-3 py-2"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="New task title"
        />
        <button
          type="submit"
          disabled={saving}
          className="px-3 py-2 rounded-md bg-blue-600 text-white disabled:opacity-60"
          title="Add task"
        >
          {saving ? "Adding…" : "Add"}
        </button>
      </div>

      <textarea
        className="w-full border rounded-md px-3 py-2"
        rows={3}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (optional)"
      />

  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <label className="flex flex-col text-sm">
          <span className="mb-1 text-gray-600">Priority: {getPriorityLabel(priority)} ({priority})</span>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="0"
              max="100"
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value))}
              className="flex-1 h-2 rounded-lg appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, 
                  #9ca3af 0%, 
                  #60a5fa 20%, 
                  #4ade80 40%, 
                  #facc15 60%, 
                  #fb923c 80%, 
                  #ef4444 100%)`,
              }}
            />
            <span 
              className="flex-shrink-0 w-10 h-6 rounded flex items-center justify-center text-xs font-bold text-white"
              style={{ backgroundColor: getPrioritySliderColor(priority) }}
            >
              {priority}
            </span>
          </div>
        </label>
          <label className="flex flex-col text-sm">
            <span className="mb-1 text-gray-600">Assignee</span>
            <input
              className="border rounded-md px-3 py-2"
              value={assignee}
              onChange={e => setAssignee(e.target.value)}
              placeholder="User ID or name"
            />
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
            value={proj}
            onChange={(e) => setProj(e.target.value)}
            disabled={!!projectId} // if ProjectView passed a fixed projectId
            title={projectId ? "This task will be added to the current project" : undefined}
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
    </form>
  );
};
