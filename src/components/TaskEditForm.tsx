// src/components/TaskEditForm.tsx
import React, { useState, useRef, useEffect } from "react";
import type { WithId, Task, Project } from "../types";
import { updateTask } from "../services/tasks";
import { createBlocker, resolveBlocker } from "../services/blockers";
import { BlockerManagerModal } from "./BlockerManagerModal";
import type { Blocker } from "../types";

const priorities: { value: number; label: string }[] = [
  { value: 0, label: "None" },
  { value: 1, label: "Low" },
  { value: 2, label: "Medium" },
  { value: 3, label: "High" },
  { value: 4, label: "Urgent" },
];

type Props = {
  uid: string;
  task: WithId<Task>;
  allProjects?: WithId<Project>[];
  allBlockers?: Blocker[];
  onSave: () => void;
  onCancel: () => void;
  onStartPromote: () => void;
  onDelete: () => void;
  onArchive?: () => void;
  onUnarchive?: () => void;
  onStatusChange?: (newStatus: Task["status"]) => void;
};

export const TaskEditForm: React.FC<Props> = (props) => {
  const {
    uid,
    task,
    allProjects = [],
    allBlockers = [],
    onSave,
    onCancel,
    onStartPromote,
    onDelete,
    onArchive,
    onUnarchive,
    onStatusChange,
  } = props;
  const [showBlockerManager, setShowBlockerManager] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [priority, setPriority] = useState<number>(task.priority ?? 0);
  const [dueDate, setDueDate] = useState<string>(task.dueDate ?? "");
  const [projectId, setProjectId] = useState<string>(task.projectId ?? "");
  const [assignee, setAssignee] = useState<string>(task.assignee ?? "");
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  // Escape closes immediately, clicking outside asks for confirmation
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [resolveReason, setResolveReason] = useState("");
  const [blockReason, setBlockReason] = useState("");
  const [pendingStatus, setPendingStatus] = useState<Task["status"] | null>(null);
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setShowDiscardConfirm(false);
        onCancel();
      }
    }
    function handleClick(e: MouseEvent) {
      if (formRef.current && !formRef.current.contains(e.target as Node)) {
        setShowDiscardConfirm(true);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClick);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [onCancel]);

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
        projectId: projectId || null,
        assignee: assignee || undefined,
      });
      // Update local assignee state so it reflects immediately
      task.assignee = assignee || undefined;
      onSave();
    } catch (err: any) {
      console.error("updateTask failed", err);
      setError(err?.message || "Failed to save task.");
    } finally {
      setSaving(false);
    }
  }


  // Find active blocker for this task

  // Intercept status change to prompt for block/resolve reason
  const handleStatusChange = (newStatus: Task["status"]) => {
    if (task.status === "blocked" && newStatus !== "blocked") {
      setPendingStatus(newStatus);
      setShowResolveModal(true);
    } else if (newStatus === "blocked" && task.status !== "blocked") {
      setPendingStatus(newStatus);
      setShowBlockModal(true);
    } else {
      onStatusChange && onStatusChange(newStatus);
    }
  };

  // Handle block reason submit
  const handleBlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowBlockModal(false);
    if (blockReason.trim() && pendingStatus === "blocked") {
      await createBlocker(uid, { id: task.id, type: "task" }, { reason: blockReason.trim() });
      onStatusChange && onStatusChange("blocked");
      setPendingStatus(null);
      setBlockReason("");
    }
  };

  // Handle resolve reason submit
  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowResolveModal(false);
    if (resolveReason.trim() && pendingStatus && allBlockers) {
      // Find all active blockers for this task
      const activeBlockers = allBlockers.filter(b => b.entityId === task.id && b.status === "active" && typeof b.id === "string");
      for (const blocker of activeBlockers) {
        if (typeof blocker.id === "string") {
          await resolveBlocker(uid, {
            id: blocker.id,
            reason: blocker.reason,
            entityId: blocker.entityId,
            entityType: blocker.entityType,
            prevStatus: blocker.prevStatus,
            capturesPrev: blocker.capturesPrev,
          }, resolveReason.trim());
        }
      }
      onStatusChange && onStatusChange(pendingStatus);
      setPendingStatus(null);
      setResolveReason("");
    }
  };

  return (
  <div className="border rounded-xl p-4 bg-white shadow-sm relative">
      {showBlockModal && (
        <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center z-20">
          <form className="bg-white rounded-lg shadow-lg p-6 text-center" onSubmit={handleBlockSubmit}>
            <div className="mb-4 text-lg">Reason for blocking this task?</div>
            <textarea
              className="w-full border rounded-md px-3 py-2 mb-4"
              rows={3}
              value={blockReason}
              onChange={e => setBlockReason(e.target.value)}
              placeholder="Why is this task blocked? (required)"
              required
            />
            <div className="flex gap-4 justify-center">
              <button
                type="submit"
                className="px-4 py-2 rounded bg-red-600 text-white"
              >Block</button>
              <button
                type="button"
                className="px-4 py-2 rounded bg-gray-200"
                onClick={() => { setShowBlockModal(false); setPendingStatus(null); }}
              >Cancel</button>
            </div>
          </form>
        </div>
      )}
      {showResolveModal && (
        <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center z-20">
          <form className="bg-white rounded-lg shadow-lg p-6 text-center" onSubmit={handleResolveSubmit}>
            <div className="mb-4 text-lg">Reason for clearing block?</div>
            <textarea
              className="w-full border rounded-md px-3 py-2 mb-4"
              rows={3}
              value={resolveReason}
              onChange={e => setResolveReason(e.target.value)}
              placeholder="How was this resolved? (required)"
              required
            />
            <div className="flex gap-4 justify-center">
              <button
                type="submit"
                className="px-4 py-2 rounded bg-green-600 text-white"
              >Submit</button>
              <button
                type="button"
                className="px-4 py-2 rounded bg-gray-200"
                onClick={() => { setShowResolveModal(false); setPendingStatus(null); }}
              >Cancel</button>
            </div>
          </form>
        </div>
      )}
      {showDiscardConfirm && (
        <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center z-10">
          <div className="bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="mb-4 text-lg">Discard changes?</div>
            <div className="flex gap-4 justify-center">
              <button
                className="px-4 py-2 rounded bg-red-600 text-white"
                onClick={() => { setShowDiscardConfirm(false); onCancel(); }}
              >Discard</button>
              <button
                className="px-4 py-2 rounded bg-gray-200"
                onClick={() => setShowDiscardConfirm(false)}
              >Continue Editing</button>
            </div>
          </div>
        </div>
      )}
      <form ref={formRef} onSubmit={handleSave} className="space-y-3">
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

  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
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
              <span className="mb-1 text-gray-600">Assigned</span>
              <input
                className="border rounded-md px-3 py-2"
                value={assignee}
                onChange={e => setAssignee(e.target.value)}
                placeholder="User ID or name"
              />
            </label>
          <label className="flex flex-col text-sm">
            <span className="mb-1 text-gray-600">Status</span>
            <select
              className="border rounded-md px-3 py-2"
              value={task.status}
              onChange={e => handleStatusChange(e.target.value as Task["status"])}
            >
              <option value="not_started">Not Started</option>
              <option value="in_progress">In Progress</option>
              <option value="done">Done</option>
              <option value="blocked">Blocked</option>
              <option value="archived">Archived</option>
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
                value={projectId}
              onChange={(e) => setProjectId(e.target.value || "")}
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
          {task.status !== "archived" && onArchive && (
            <button
              type="button"
              onClick={onArchive}
              className="px-3 py-2 rounded-md border text-gray-600"
            >
              Archive
            </button>
          )}
          {task.status === "archived" && onUnarchive && (
            <button
              type="button"
              onClick={onUnarchive}
              className="px-3 py-2 rounded-md border text-green-600"
            >
              Unarchive
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowBlockerManager(true)}
            className="px-3 py-2 rounded-md border bg-red-50 text-red-700"
            title="View and manage blockers for this task"
          >
            View Blockers
          </button>
        </div>
        {showBlockerManager && (
          <BlockerManagerModal
            uid={uid}
            entity={{ id: task.id, title: typeof task.title === 'string' ? task.title : String(task.title), type: 'task' }}
            allBlockers={allBlockers.filter((b): b is WithId<Blocker> => typeof b.id === 'string')}
            onClose={() => setShowBlockerManager(false)}
          />
        )}
    </form>
    {showBlockerManager && (
      <BlockerManagerModal
        uid={uid}
        entity={{ id: task.id, title: typeof task.title === 'string' ? task.title : String(task.title), type: 'task' }}
        allBlockers={allBlockers.filter((b): b is WithId<Blocker> => typeof b.id === 'string')}
        onClose={() => setShowBlockerManager(false)}
      />
    )}
  </div>
  );
};
