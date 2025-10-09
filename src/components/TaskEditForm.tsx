import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { v4 as uuidv4 } from "uuid";
import { createBlocker, resolveBlocker } from "../services/blockers";
import { BlockerManagerModal } from "./BlockerManagerModal";
import React, { useState, useRef, useEffect } from "react";

// Map status to header color (static, no need for useMemo)
const statusBg: Record<string, string> = {
  not_started: "from-gray-100 to-gray-200",
  in_progress: "from-blue-100 to-blue-200",
  done: "from-green-100 to-green-200",
  blocked: "from-red-100 to-red-200",
  archived: "from-gray-200 to-gray-300 opacity-60",
};
import { useTasks } from "../hooks/useTasks";
import type { WithId, Task, Project, Subtask, Blocker, RecurrencePattern, TaskAttachment } from "../types";
import { updateTask } from "../services/tasks";

type Props = {
  uid: string;
  task: WithId<Task>;
  allProjects?: WithId<Project>[];
  allBlockers?: Blocker[];
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onArchive?: () => void;
  onUnarchive?: () => void;
  onStatusChange?: (newStatus: Task["status"]) => void;
};

export const TaskEditForm: React.FC<Props> = (props) => {
  // State and prop declarations
  const {
    uid,
    task,
    allProjects = [],
    allBlockers = [],
    onSave,
    onCancel,
    onDelete,
    onArchive,
    onUnarchive,
    onStatusChange,
  } = props;
  const [attachments, setAttachments] = useState<TaskAttachment[]>(task.attachments || []);
  const [subtasks, setSubtasks] = useState<Subtask[]>(task.subtasks || []);
  const [dependencies, setDependencies] = useState<string[]>(task.dependencies || []);
  const [recurrence, setRecurrence] = useState<RecurrencePattern>(task.recurrence || { type: "none" });
  const allTasks = useTasks(uid);
  const [showBlockerManager, setShowBlockerManager] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [priority, setPriority] = useState<number>(task.priority ?? 0);
  const [dueDate, setDueDate] = useState<string>(task.dueDate ?? "");
  const [projectId, setProjectId] = useState<string>(task.projectId ?? "");
  const [assignee, setAssignee] = useState<string>(typeof task.assignee === "string" ? task.assignee : (task.assignee?.id ?? ""));
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [resolveReason, setResolveReason] = useState("");
  const [blockReason, setBlockReason] = useState("");
  const [pendingStatus, setPendingStatus] = useState<Task["status"] | null>(null);
  const [comments, setComments] = useState(task.comments ?? "");
  const [newLink, setNewLink] = useState("");
  const [newLinkName, setNewLinkName] = useState("");
  const [uploading, setUploading] = useState(false);
  // Removed unused saving and error state to resolve warnings
  const priorities = [
    { value: 0, label: "None" },
    { value: 1, label: "Low" },
    { value: 2, label: "Medium" },
    { value: 3, label: "High" },
    { value: 4, label: "Urgent" },
  ];

  // Handler functions (must be after state/props, before return)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    // (removed duplicate state/prop declarations above)
    if (!title.trim()) {
      // setError("Title is required.");
      return;
    }
    // setError(null);
    // setSaving(true);
    try {
      await updateTask(
        uid,
        task.id,
        {
          title: title.trim(),
          description: description.trim() || undefined,
          comments: comments,
          priority,
          dueDate: dueDate || null,
          projectId: projectId || null,
          assignee: assignee || undefined,
          recurrence,
          attachments,
        }
      );
      onSave();
    } catch (err) {
      // handle error if needed
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const storage = getStorage();
      const fileRef = storageRef(storage, `attachments/${uid}/${uuidv4()}-${file.name}`);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);
      const newAttachment: TaskAttachment = {
        id: uuidv4(),
        name: file.name,
        url,
        type: 'file',
        uploadedAt: (window as any).serverTimestamp ? (window as any).serverTimestamp() : undefined,
        uploadedBy: uid,
      };
      setAttachments((prev) => [...prev, newAttachment]);
    } catch (err) {
      // handle error if needed
    } finally {
      setUploading(false);
    }
  };

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowResolveModal(false);
    if (resolveReason.trim() && pendingStatus && pendingStatus !== "blocked") {
      await resolveBlocker(
        uid,
        {
          id: task.id,
          reason: "Cleared by user",
          entityId: task.id,
          entityType: "task"
        },
        resolveReason.trim()
      );
      onStatusChange && onStatusChange(pendingStatus);
      setPendingStatus(null);
      setResolveReason("");
    }
  };
  // (removed duplicate state/prop declarations below)
  // Keep dependencies in sync if task changes (e.g. after save or prop update)
  useEffect(() => {
    setDependencies(task.dependencies || []);
  }, [task.id, task.dependencies]);
  // Keep subtasks in sync if task changes (e.g. after save or prop update)
  useEffect(() => {
    setSubtasks(task.subtasks || []);
  }, [task.id, task.subtasks]);
  // Keep recurrence in sync if task changes
  useEffect(() => {
    setRecurrence(task.recurrence || { type: "none" });
  }, [task.id, task.recurrence]);

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

  // Handler functions (must be above return)
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


  const handleAddLink = () => {
    if (!newLink.trim() || !newLinkName.trim()) return;
    const newAttachment: TaskAttachment = {
      id: uuidv4(),
      name: newLinkName.trim(),
      url: newLink.trim(),
      type: 'link',
      uploadedAt: (window as any).serverTimestamp ? (window as any).serverTimestamp() : undefined,
      uploadedBy: uid,
    };
    setAttachments((prev) => [...prev, newAttachment]);
    setNewLink("");
    setNewLinkName("");
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev) => prev.filter(a => a.id !== id));
  };

  return (
    <div className="border rounded-xl p-4 bg-white shadow-sm relative">
      {/* Task Title as header */}
      <div className="mb-4">
        <div className={`bg-gradient-to-r ${statusBg[task.status] || 'from-gray-100 to-gray-200'} rounded-lg px-4 py-3 shadow-sm`}>
          <input
            id="task-title-input"
            className="w-full bg-transparent border-none text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-gray-400"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Task title"
            autoFocus
          />
        </div>
      </div>

      {/* Recurrence selector */}
      <div className="mb-2">
        <div className="font-semibold mb-1">Recurrence</div>
        <select
          className="border rounded px-2 py-1 text-sm"
          value={recurrence.type}
          onChange={e => {
            const type = e.target.value as RecurrencePattern["type"];
            if (type === "none") setRecurrence({ type: "none" });
            else if (type === "daily") setRecurrence({ type: "daily", interval: 1 });
            else if (type === "weekly") setRecurrence({ type: "weekly", interval: 1, daysOfWeek: [1] });
            else if (type === "monthly") setRecurrence({ type: "monthly", interval: 1, dayOfMonth: 1 });
            else if (type === "custom") setRecurrence({ type: "custom", rule: "" });
          }}
        >
          <option value="none">None</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="custom">Custom</option>
        </select>
        {/* Recurrence details */}
        {recurrence.type === "daily" && (
          <div className="mt-2 flex items-center gap-2">
            <span>Every</span>
            <input
              type="number"
              min={1}
              className="w-16 border rounded px-1 py-0.5"
              value={recurrence.interval}
              onChange={e => setRecurrence({ type: "daily", interval: Math.max(1, Number(e.target.value)) })}
            />
            <span>day(s)</span>
          </div>
        )}
        {recurrence.type === "weekly" && (
          <div className="mt-2 flex items-center gap-2">
            <span>Every</span>
            <input
              type="number"
              min={1}
              className="w-16 border rounded px-1 py-0.5"
              value={recurrence.interval}
              onChange={e => setRecurrence({ ...recurrence, interval: Math.max(1, Number(e.target.value)) })}
            />
            <span>week(s) on</span>
            {[0,1,2,3,4,5,6].map(d => (
              <label key={d} className="inline-flex items-center mx-1">
                <input
                  type="checkbox"
                  checked={recurrence.daysOfWeek?.includes(d) || false}
                  onChange={e => {
                    const days = new Set(recurrence.daysOfWeek || []);
                    if (e.target.checked) days.add(d); else days.delete(d);
                    setRecurrence({ ...recurrence, daysOfWeek: Array.from(days) });
                  }}
                />
                <span className="ml-0.5 text-xs">{["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d]}</span>
              </label>
            ))}
          </div>
        )}
        {recurrence.type === "monthly" && (
          <div className="mt-2 flex items-center gap-2">
            <span>Every</span>
            <input
              type="number"
              min={1}
              className="w-16 border rounded px-1 py-0.5"
              value={recurrence.interval}
              onChange={e => setRecurrence({ ...recurrence, interval: Math.max(1, Number(e.target.value)) })}
            />
            <span>month(s) on day</span>
            <input
              type="number"
              min={1}
              max={31}
              className="w-16 border rounded px-1 py-0.5"
              value={recurrence.dayOfMonth}
              onChange={e => setRecurrence({ ...recurrence, dayOfMonth: Math.max(1, Math.min(31, Number(e.target.value))) })}
            />
          </div>
        )}
        {recurrence.type === "custom" && (
          <div className="mt-2 flex flex-col gap-2">
            <select
              className="border rounded px-2 py-1 text-sm"
              value=""
              onChange={e => {
                const val = e.target.value;
                if (val) setRecurrence({ ...recurrence, rule: val });
              }}
            >
              <option value="">Select a common rule…</option>
              <option value="FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR">Every weekday (Mon-Fri)</option>
              <option value="FREQ=WEEKLY;INTERVAL=2;BYDAY=FR">Every other Friday</option>
              <option value="FREQ=MONTHLY;BYDAY=1MO">First Monday of the month</option>
              <option value="FREQ=YEARLY;BYMONTH=12;BYMONTHDAY=25">Every Dec 25 (Yearly)</option>
            </select>
            <input
              className="w-full border rounded px-2 py-1"
              value={recurrence.rule}
              onChange={e => setRecurrence({ ...recurrence, rule: e.target.value })}
              placeholder="Custom recurrence rule (e.g. RRULE)"
            />
            <span className="text-xs text-gray-500">
              Need help? <a href="https://icalendar.org/iCalendar-RFC-5545/3-8-5-3-recurrence-rule.html" target="_blank" rel="noopener noreferrer" className="underline">RRULE reference</a>
            </span>
          </div>
        )}
      </div>

        {/* Dependencies selector */}
        <div className="mb-2">
          <div className="font-semibold mb-1">Dependencies</div>
          <ul className="space-y-1">
            {dependencies.map((depId) => {
              const depTask = allTasks.find((t) => t.id === depId);
              return (
                <li key={depId} className="flex items-center gap-2">
                  <span className="flex-1 truncate text-sm text-gray-700 bg-gray-100 rounded px-2 py-1">
                    {depTask ? depTask.title : depId}
                  </span>
                  <button
                    type="button"
                    className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 border border-red-200"
                    onClick={() => setDependencies(dependencies.filter((id) => id !== depId))}
                    title="Remove dependency"
                  >✕</button>
                </li>
              );
            })}
          </ul>
          <select
            className="mt-2 border rounded px-2 py-1 text-sm"
            value=""
            onChange={e => {
              const newDep = e.target.value;
              if (newDep && !dependencies.includes(newDep)) {
                setDependencies([...dependencies, newDep]);
              }
            }}
          >
            <option value="">+ Add dependency…</option>
            {allTasks
              .filter(t => t.id !== task.id && !dependencies.includes(t.id) && !(t.dependencies || []).includes(task.id))
              .map(t => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
          </select>
        </div>

        {/* The rest of the form and controls go here (as previously in the file) */}
    {/* ... */}
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
      {/* Attachments section */}
      <div className="mb-2">
        <div className="font-semibold mb-1">Attachments</div>
        <ul className="space-y-1">
          {attachments.map(att => (
            <li key={att.id} className="flex items-center gap-2 text-sm">
              {att.type === 'file' ? (
                <a href={att.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                  <span className="inline-block mr-1">📎</span>{att.name}
                </a>
              ) : (
                <a href={att.url} target="_blank" rel="noopener noreferrer" className="text-green-700 underline">
                  <span className="inline-block mr-1">🔗</span>{att.name}
                </a>
              )}
              <button type="button" className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 border border-red-200" onClick={() => handleRemoveAttachment(att.id)} title="Remove attachment">✕</button>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-2 mt-2">
          <input type="file" onChange={handleFileUpload} disabled={uploading} />
          {uploading && <span className="text-xs text-gray-500">Uploading…</span>}
        </div>
        <div className="flex items-center gap-2 mt-2">
          <input type="text" className="border rounded px-2 py-1 text-sm" placeholder="Link URL" value={newLink} onChange={e => setNewLink(e.target.value)} />
          <input type="text" className="border rounded px-2 py-1 text-sm" placeholder="Link name" value={newLinkName} onChange={e => setNewLinkName(e.target.value)} />
          <button type="button" className="px-2 py-1 rounded bg-blue-100 text-blue-700 border border-blue-200 text-xs" onClick={handleAddLink}>+ Add Link</button>
        </div>
      </div>
        <div className="flex items-center gap-2">
          <input
            className="flex-1 border rounded-md px-3 py-2"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task title"
            autoFocus
          />
        </div>


        <div className="mb-2">
          <label className="block font-semibold mb-1 text-gray-700">Description</label>
          <textarea
            className="w-full border rounded-md px-3 py-2"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
          />
        </div>

        <div className="mb-2">
          <label className="block font-semibold mb-1 text-gray-700">Comments / Notes</label>
          <textarea
            className="w-full border rounded-md px-3 py-2"
            rows={3}
            value={comments}
            onChange={e => setComments(e.target.value)}
            placeholder="For discussion, updates, etc."
          />
        </div>

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

          {/* Recurrence selector */}
          <div className="flex flex-col text-sm">
            <span className="mb-1 text-gray-600">Recurrence</span>
            <select
              className="border rounded px-2 py-1 text-sm"
              value={recurrence.type}
              onChange={e => {
                const type = e.target.value as RecurrencePattern["type"];
                if (type === "none") setRecurrence({ type: "none" });
                else if (type === "daily") setRecurrence({ type: "daily", interval: 1 });
                else if (type === "weekly") setRecurrence({ type: "weekly", interval: 1, daysOfWeek: [1] });
                else if (type === "monthly") setRecurrence({ type: "monthly", interval: 1, dayOfMonth: 1 });
                else if (type === "custom") setRecurrence({ type: "custom", rule: "" });
              }}
            >
              <option value="none">None</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="custom">Custom</option>
            </select>
            {/* Recurrence details */}
            {recurrence.type === "daily" && (
              <div className="mt-2 flex items-center gap-2">
                <span>Every</span>
                <input
                  type="number"
                  min={1}
                  className="w-16 border rounded px-1 py-0.5"
                  value={recurrence.interval}
                  onChange={e => setRecurrence({ type: "daily", interval: Math.max(1, Number(e.target.value)) })}
                />
                <span>day(s)</span>
              </div>
            )}
            {recurrence.type === "weekly" && (
              <div className="mt-2 flex items-center gap-2">
                <span>Every</span>
                <input
                  type="number"
                  min={1}
                  className="w-16 border rounded px-1 py-0.5"
                  value={recurrence.interval}
                  onChange={e => setRecurrence({ ...recurrence, interval: Math.max(1, Number(e.target.value)) })}
                />
                <span>week(s) on</span>
                {[0,1,2,3,4,5,6].map(d => (
                  <label key={d} className="inline-flex items-center mx-1">
                    <input
                      type="checkbox"
                      checked={recurrence.daysOfWeek?.includes(d) || false}
                      onChange={e => {
                        const days = new Set(recurrence.daysOfWeek || []);
                        if (e.target.checked) days.add(d); else days.delete(d);
                        setRecurrence({ ...recurrence, daysOfWeek: Array.from(days) });
                      }}
                    />
                    <span className="ml-0.5 text-xs">{["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d]}</span>
                  </label>
                ))}
              </div>
            )}
            {recurrence.type === "monthly" && (
              <div className="mt-2 flex items-center gap-2">
                <span>Every</span>
                <input
                  type="number"
                  min={1}
                  className="w-16 border rounded px-1 py-0.5"
                  value={recurrence.interval}
                  onChange={e => setRecurrence({ ...recurrence, interval: Math.max(1, Number(e.target.value)) })}
                />
                <span>month(s) on day</span>
                <input
                  type="number"
                  min={1}
                  max={31}
                  className="w-16 border rounded px-1 py-0.5"
                  value={recurrence.dayOfMonth}
                  onChange={e => setRecurrence({ ...recurrence, dayOfMonth: Math.max(1, Math.min(31, Number(e.target.value))) })}
                />
              </div>
            )}
            {recurrence.type === "custom" && (
              <div className="mt-2">
                <input
                  className="w-full border rounded px-2 py-1"
                  value={recurrence.rule}
                  onChange={e => setRecurrence({ ...recurrence, rule: e.target.value })}
                  placeholder="Custom recurrence rule (e.g. RRULE)"
                />
              </div>
            )}
          </div>

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


        {/* Subtasks checklist */}
        <div className="mb-2">
          <div className="font-semibold mb-1">Subtasks</div>
          <ul className="space-y-1">
            {subtasks.map((sub, i) => (
              <li key={sub.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={sub.done}
                  onChange={e => {
                    const updated = subtasks.map((s, idx) => idx === i ? { ...s, done: e.target.checked } : s);
                    setSubtasks(updated);
                  }}
                />
                <input
                  className="border rounded px-2 py-1 flex-1 text-sm"
                  value={sub.title}
                  onChange={e => {
                    const updated = subtasks.map((s, idx) => idx === i ? { ...s, title: e.target.value } : s);
                    setSubtasks(updated);
                  }}
                  placeholder="Subtask title"
                />
                <button
                  type="button"
                  className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 border border-red-200"
                  onClick={() => setSubtasks(subtasks.filter((_, idx) => idx !== i))}
                  title="Delete subtask"
                >✕</button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="mt-2 px-3 py-1 rounded bg-gray-100 border text-sm"
            onClick={() => setSubtasks([...subtasks, { id: Math.random().toString(36).slice(2), title: "", done: false }])}
          >+ Add subtask</button>
        </div>



        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="submit"
            className="px-3 py-2 rounded-md bg-blue-600 text-white"
          >
            Save
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
            // onClick for promote removed
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
    </div>

  );
}
