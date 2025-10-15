import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { v4 as uuidv4 } from "uuid";
import { createBlocker, resolveBlocker } from "../services/blockers";
import { BlockerManagerModal } from "./BlockerManagerModal";
import { ActivityHistory } from "./ActivityHistory";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { useKeydown } from "../hooks/useKeydown";

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
  searchQuery?: string;
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
    searchQuery = '',
  } = props;
  const [attachments, setAttachments] = useState<TaskAttachment[]>(task.attachments || []);
  const [subtasks, setSubtasks] = useState<Subtask[]>(task.subtasks || []);
  const [dependencies, setDependencies] = useState<string[]>(task.dependencies || []);
  const [recurrence, setRecurrence] = useState<RecurrencePattern>(task.recurrence || { type: "none" });
  const allTasks = useTasks(uid);
  const [showBlockerManager, setShowBlockerManager] = useState(false);
  const [isAutosaving, setIsAutosaving] = useState(false);
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
  const [activeTab, setActiveTab] = useState<'advanced' | 'attachments' | 'activity' | null>(null);
  // Removed unused saving and error state to resolve warnings
  const priorities = [
    { value: 0, label: "None" },
    { value: 1, label: "Low" },
    { value: 2, label: "Medium" },
    { value: 3, label: "High" },
    { value: 4, label: "Urgent" },
  ];

  // Highlight helper: splits text and wraps matches
  const highlightText = (text: string | undefined | null) => {
    if (!text) return text;
    const q = searchQuery.trim();
    if (!q) return text;
    try {
      const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'ig');
      const parts: React.ReactNode[] = [];
      let lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = regex.exec(text)) !== null) {
        const start = match.index;
        const end = regex.lastIndex;
        if (start > lastIndex) {
          parts.push(text.slice(lastIndex, start));
        }
        const matched = text.slice(start, end);
        parts.push(
          <mark
            key={start + '-' + end}
            className="bg-yellow-300 text-black px-0.5 rounded-sm"
          >
            {matched}
          </mark>
        );
        lastIndex = end;
        // Avoid infinite loops with zero-length matches
        if (start === end) break;
      }
      if (lastIndex < text.length) {
        parts.push(text.slice(lastIndex));
      }
      return parts;
    } catch {
      return text;
    }
  };

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
          subtasks,
          dependencies,
        }
      );
      onSave();
    } catch (err) {
      // handle error if needed
    }
  };

  // Autosave function with debouncing
  const autosaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const handleAutosave = useCallback(async () => {
    if (!title.trim()) {
      return; // Don't autosave if title is empty
    }
    
    setIsAutosaving(true);
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
          subtasks,
          dependencies,
        }
      );
      // Don't call onSave() for autosave to avoid closing modal
    } catch (err) {
      console.error("Error autosaving task:", err);
    } finally {
      setTimeout(() => setIsAutosaving(false), 300); // Show briefly for 300ms
    }
  }, [uid, task.id, title, description, comments, priority, dueDate, projectId, assignee, recurrence, attachments, subtasks, dependencies]);

  const triggerAutosave = useCallback(() => {
    // Clear existing timeout
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }
    
    // Set new timeout for autosave (500ms delay)
    autosaveTimeoutRef.current = setTimeout(() => {
      handleAutosave();
    }, 500);
  }, [handleAutosave]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }
    };
  }, []);

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

  // Handle escape key to cancel edit using custom hook
  useKeydown({
    enabled: true,
    key: "Escape",
    onKeyDown: () => {
      // Don't cancel if we're in a modal (block/resolve)
      if (!showBlockModal && !showResolveModal && !showDiscardConfirm) {
        onCancel();
      }
    }
  });

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

  // Get status color for header
  const getStatusColor = (status: Task["status"]) => {
    const colors = {
      not_started: "from-gray-100 to-gray-200 border-gray-300",
      in_progress: "from-blue-100 to-blue-200 border-blue-300", 
      done: "from-green-100 to-green-200 border-green-300",
      blocked: "from-red-100 to-red-200 border-red-300",
      archived: "from-gray-200 to-gray-300 border-gray-400 opacity-60"
    };
    return colors[status] || colors.not_started;
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden relative">
      {/* Enhanced Header with Status Indicator */}
      <div className={`bg-gradient-to-r ${getStatusColor(task.status)} border-b-2 px-4 py-3`}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {/* Status Icon */}
              <div className={`w-3 h-3 rounded-full ${
                task.status === 'done' ? 'bg-green-500' :
                task.status === 'in_progress' ? 'bg-blue-500' :
                task.status === 'blocked' ? 'bg-red-500' :
                task.status === 'archived' ? 'bg-gray-500' : 'bg-gray-400'
              }`}></div>
              <span className="text-sm font-medium text-gray-600 capitalize">
                {task.status.replace('_', ' ')}
              </span>
            </div>
            <span className="text-gray-400">•</span>
            <span className="text-sm text-gray-600">
              {task.id ? `Task #${task.id.slice(0, 8)}` : 'New Task'}
            </span>
          </div>
          
          {/* Task Indicators from Task Line */}
          <div className="flex items-center gap-x-2 text-xs text-gray-700">
            {/* Created Date */}
            <span className="flex items-center justify-center w-[75px]" title="Created date">
              <svg className="w-3 h-3 mr-1 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 20 20">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m4 4V3m-7 4h14M5 7v10a2 2 0 002 2h6a2 2 0 002-2V7" />
              </svg>
              {task.createdAt && typeof (task.createdAt as any).toDate === "function"
                ? (task.createdAt as any).toDate().toLocaleDateString(undefined, { month: "short", day: "numeric" })
                : '--'}
            </span>
            <span className="text-gray-300">|</span>
            
            {/* Due Date */}
            <span className="flex items-center justify-center w-[75px]" title="Due date">
              <svg className="w-3 h-3 mr-1 text-red-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 20 20">
                <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="2" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6v4l2 2" />
              </svg>
              {dueDate
                ? new Date(dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })
                : '--'}
            </span>
            <span className="text-gray-300">|</span>
            
            {/* Assigned */}
            <span className="flex items-center justify-center w-[75px]" title="Assigned to">
              <svg className="w-3 h-3 mr-1 text-blue-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 20 20">
                <circle cx="10" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 17v-1a4 4 0 014-4h4a4 4 0 014 4v1" />
              </svg>
              {assignee || '--'}
            </span>
            
            {/* Priority Badge */}
            <span className={`text-xs font-semibold rounded-lg px-2 py-1 shadow-md border border-zinc-400 ${(() => {
              const priorityMap: { [key: number]: { label: string; color: string } } = {
                0: { label: "None", color: "bg-zinc-200" },
                1: { label: "Low", color: "bg-gradient-to-r from-gray-300 via-gray-400 to-gray-500" },
                2: { label: "Medium", color: "bg-gradient-to-r from-slate-100 via-slate-300 to-slate-400" },
                3: { label: "High", color: "bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-500" },
                4: { label: "Urgent", color: "bg-gradient-to-r from-orange-300 via-orange-400 to-yellow-600" },
              };
              return priorityMap[priority]?.color || priorityMap[0].color;
            })()}`}
            style={{ boxShadow: '0 2px 6px rgba(120,120,120,0.15), inset 0 1px 2px #fff' }}>
              {(() => {
                const priorityMap: { [key: number]: { label: string; color: string } } = {
                  0: { label: "None", color: "bg-zinc-200" },
                  1: { label: "Low", color: "bg-gradient-to-r from-gray-300 via-gray-400 to-gray-500" },
                  2: { label: "Medium", color: "bg-gradient-to-r from-slate-100 via-slate-300 to-slate-400" },
                  3: { label: "High", color: "bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-500" },
                  4: { label: "Urgent", color: "bg-gradient-to-r from-orange-300 via-orange-400 to-yellow-600" },
                };
                return priorityMap[priority]?.label || 'None';
              })()}
            </span>
          </div>
          
          {/* Autosave Indicator */}
          {isAutosaving && (
            <svg className="w-5 h-5 animate-spin text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          )}
        </div>
        <input
          id="task-title-input"
          className="w-full bg-transparent border-none text-xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-400 rounded-md px-1 placeholder-gray-500"
          value={title}
          onChange={e => setTitle(e.target.value)}
          onBlur={triggerAutosave}
          placeholder="Enter task title..."
          autoFocus
        />
      </div>

      <form ref={formRef} onSubmit={handleSave} className="flex flex-col">
        {/* 📝 Basic Information Section */}
        <div className="bg-gray-50 border-b border-gray-200 p-4">
          {/* Description */}
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={triggerAutosave}
              placeholder="Describe what needs to be done..."
            />
            {searchQuery && description && (
              <div className="mt-1 text-xs text-gray-600 bg-gray-50 p-2 rounded border border-gray-200">
                <span className="font-medium">Preview: </span>
                <span>{highlightText(description)}</span>
              </div>
            )}
          </div>

          {/* Key Fields Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="lg:col-span-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">Priority</label>
              <select
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
                onBlur={triggerAutosave}
              >
                {priorities.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>

            <div className="lg:col-span-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
              <select
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={task.status}
                onChange={e => handleStatusChange(e.target.value as Task["status"])}
              >
                <option value="not_started">Not Started</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
                <option value="blocked">Blocked</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <div className="lg:col-span-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">Due Date</label>
              <input
                type="date"
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={dueDate ? dueDate.substring(0, 10) : ""}
                onChange={(e) => setDueDate(e.target.value)}
                onBlur={triggerAutosave}
              />
            </div>

            <div className="lg:col-span-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">Assignee</label>
              <input
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={assignee}
                onChange={e => setAssignee(e.target.value)}
                onBlur={triggerAutosave}
                placeholder="Assign to..."
              />
            </div>

            <div className="lg:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Project</label>
              <select
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value || "")}
                onBlur={triggerAutosave}
              >
                <option value="">— No Project —</option>
                {allProjects.map((p) => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 🔄 Tabbed Sections - Advanced Features, Attachments & Notes, Activity History */}
        <div className="border-t border-gray-200">
          {/* Tab Navigation */}
          <div className="flex border-b border-gray-200 bg-gray-50">
            <button
              type="button"
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors border-b-2 flex items-center justify-center gap-2 ${
                activeTab === 'advanced'
                  ? 'text-purple-600 border-purple-600 bg-white'
                  : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-100'
              }`}
              onClick={() => setActiveTab(activeTab === 'advanced' ? null : 'advanced')}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"/>
              </svg>
              Advanced Features
            </button>
            
            <button
              type="button"
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors border-b-2 flex items-center justify-center gap-2 ${
                activeTab === 'attachments'
                  ? 'text-amber-600 border-amber-600 bg-white'
                  : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-100'
              }`}
              onClick={() => setActiveTab(activeTab === 'attachments' ? null : 'attachments')}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z"/>
              </svg>
              Attachments & Notes
            </button>
            
            <button
              type="button"
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors border-b-2 flex items-center justify-center gap-2 ${
                activeTab === 'activity'
                  ? 'text-gray-600 border-gray-600 bg-white'
                  : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-100'
              }`}
              onClick={() => setActiveTab(activeTab === 'activity' ? null : 'activity')}
            >
              <span className="text-sm">📜</span>
              Activity History
            </button>
          </div>

          {/* Tab Content */}
          
          {activeTab === 'advanced' && (
            <div className="px-4 pb-4 bg-purple-50 space-y-4">
              {/* Organization & Planning */}
              <div className="bg-white rounded-lg p-3 border border-purple-200">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"/>
                  </svg>
                  <h4 className="text-sm font-medium text-gray-900">Organization & Planning</h4>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Subtasks */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">Subtasks</label>
                    <div className="space-y-1">
                      {subtasks.map((sub, i) => (
                        <div key={sub.id} className="flex items-center gap-2 p-1.5 bg-gray-50 rounded">
                          <input
                            type="checkbox"
                            checked={sub.done}
                            onChange={e => {
                              const updated = subtasks.map((s, idx) => idx === i ? { ...s, done: e.target.checked } : s);
                              setSubtasks(updated);
                              triggerAutosave();
                            }}
                            className="rounded focus:ring-2 focus:ring-blue-500"
                          />
                          <div className="flex-1">
                            <input
                              className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              value={sub.title}
                              onChange={e => {
                                const updated = subtasks.map((s, idx) => idx === i ? { ...s, title: e.target.value } : s);
                                setSubtasks(updated);
                              }}
                              onBlur={triggerAutosave}
                              placeholder="Subtask description"
                            />
                            {searchQuery && sub.title && (
                              <div className="mt-0.5 text-xs">
                                {highlightText(sub.title)}
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            className="text-red-600 hover:text-red-800 p-0.5"
                            onClick={() => {
                              setSubtasks(subtasks.filter((_, idx) => idx !== i));
                              triggerAutosave();
                            }}
                            title="Remove subtask"
                          >
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"/>
                            </svg>
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        className="w-full py-1.5 px-2 text-xs text-gray-600 border border-gray-300 border-dashed rounded hover:bg-gray-50 focus:ring-2 focus:ring-blue-500"
                        onClick={() => {
                          setSubtasks([...subtasks, { id: Math.random().toString(36).slice(2), title: "", done: false }]);
                          triggerAutosave();
                        }}
                      >
                        + Add subtask
                      </button>
                    </div>
                  </div>

                  {/* Dependencies */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">Dependencies</label>
                    <div className="space-y-1">
                      {dependencies.map((depId) => {
                        const depTask = allTasks.find((t) => t.id === depId);
                        return (
                          <div key={depId} className="flex items-center gap-2 p-1.5 bg-blue-50 rounded">
                            <svg className="w-3 h-3 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z"/>
                            </svg>
                            <span className="flex-1 text-xs text-gray-700 truncate">
                              {depTask ? depTask.title : depId}
                            </span>
                            <button
                              type="button"
                              className="text-red-600 hover:text-red-800 p-0.5"
                              onClick={() => {
                                setDependencies(dependencies.filter((id) => id !== depId));
                                triggerAutosave();
                              }}
                              title="Remove dependency"
                            >
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"/>
                                </svg>
                            </button>
                          </div>
                        );
                      })}
                      <select
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value=""
                        onChange={e => {
                          const newDep = e.target.value;
                          if (newDep && !dependencies.includes(newDep)) {
                            setDependencies([...dependencies, newDep]);
                            triggerAutosave();
                          }
                        }}
                      >
                        <option value="">+ Add dependency...</option>
                        {allTasks
                          .filter(t => t.id !== task.id && !dependencies.includes(t.id) && !(t.dependencies || []).includes(task.id))
                          .map(t => (
                            <option key={t.id} value={t.id}>{t.title}</option>
                          ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recurrence Patterns */}
              <div className="bg-white rounded-lg p-3 border border-purple-200">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"/>
                  </svg>
                  <h4 className="text-sm font-medium text-gray-900">Recurrence Patterns</h4>
                </div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Recurrence Pattern</label>
                <select
                  className="w-full border border-gray-300 rounded px-2 py-1.5 mb-2 text-xs focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  value={recurrence.type}
                  onChange={e => {
                    const type = e.target.value as RecurrencePattern["type"];
                    if (type === "none") setRecurrence({ type: "none" });
                    else if (type === "daily") setRecurrence({ type: "daily", interval: 1 });
                    else if (type === "weekly") setRecurrence({ type: "weekly", interval: 1, daysOfWeek: [1] });
                    else if (type === "monthly") setRecurrence({ type: "monthly", interval: 1, dayOfMonth: 1 });
                    else if (type === "custom") setRecurrence({ type: "custom", rule: "" });
                    triggerAutosave();
                  }}
                >
                  <option value="none">No recurrence</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="custom">Custom</option>
                </select>

                {/* Recurrence Details */}
                {recurrence.type === "daily" && (
                  <div className="flex items-center gap-2 text-xs">
                    <span>Repeat every</span>
                    <input
                      type="number"
                      min={1}
                      className="w-14 border border-gray-300 rounded px-1.5 py-1 text-xs focus:ring-2 focus:ring-purple-500"
                      value={recurrence.interval}
                      onChange={e => setRecurrence({ type: "daily", interval: Math.max(1, Number(e.target.value)) })}
                    />
                    <span>day(s)</span>
                  </div>
                )}

                {recurrence.type === "weekly" && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs">
                      <span>Repeat every</span>
                      <input
                        type="number"
                        min={1}
                        className="w-14 border border-gray-300 rounded px-1.5 py-1 text-xs focus:ring-2 focus:ring-purple-500"
                        value={recurrence.interval}
                        onChange={e => setRecurrence({ ...recurrence, interval: Math.max(1, Number(e.target.value)) })}
                      />
                      <span>week(s) on:</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {[0,1,2,3,4,5,6].map(d => (
                        <label key={d} className="inline-flex items-center">
                          <input
                            type="checkbox"
                            checked={recurrence.daysOfWeek?.includes(d) || false}
                            onChange={e => {
                              const days = new Set(recurrence.daysOfWeek || []);
                              if (e.target.checked) days.add(d); else days.delete(d);
                              setRecurrence({ ...recurrence, daysOfWeek: Array.from(days) });
                            }}
                            className="rounded focus:ring-purple-500 scale-75"
                          />
                          <span className="ml-1 text-xs">{["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d]}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {recurrence.type === "monthly" && (
                  <div className="flex items-center gap-2 text-xs">
                    <span>Repeat every</span>
                    <input
                      type="number"
                      min={1}
                      className="w-14 border border-gray-300 rounded px-1.5 py-1 text-xs focus:ring-2 focus:ring-purple-500"
                      value={recurrence.interval}
                      onChange={e => setRecurrence({ ...recurrence, interval: Math.max(1, Number(e.target.value)) })}
                    />
                    <span>month(s) on day</span>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      className="w-14 border border-gray-300 rounded px-1.5 py-1 text-xs focus:ring-2 focus:ring-purple-500"
                      value={recurrence.dayOfMonth}
                      onChange={e => setRecurrence({ ...recurrence, dayOfMonth: Math.max(1, Math.min(31, Number(e.target.value))) })}
                    />
                  </div>
                )}

                {recurrence.type === "custom" && (
                  <div className="space-y-2">
                    <select
                      className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:ring-2 focus:ring-purple-500"
                      value=""
                      onChange={e => {
                        const val = e.target.value;
                        if (val) setRecurrence({ ...recurrence, rule: val });
                      }}
                    >
                      <option value="">Select a common pattern...</option>
                      <option value="FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR">Every weekday (Mon-Fri)</option>
                      <option value="FREQ=WEEKLY;INTERVAL=2;BYDAY=FR">Every other Friday</option>
                      <option value="FREQ=MONTHLY;BYDAY=1MO">First Monday of the month</option>
                      <option value="FREQ=YEARLY;BYMONTH=12;BYMONTHDAY=25">Every Dec 25 (Yearly)</option>
                    </select>
                    <input
                      className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:ring-2 focus:ring-purple-500"
                      value={recurrence.rule}
                      onChange={e => setRecurrence({ ...recurrence, rule: e.target.value })}
                      placeholder="Custom RRULE (e.g., FREQ=DAILY;INTERVAL=2)"
                    />
                    <p className="text-xs text-gray-400">
                      Need help? <a href="https://icalendar.org/iCalendar-RFC-5545/3-8-5-3-recurrence-rule.html" target="_blank" rel="noopener noreferrer" className="text-purple-500 underline">RRULE Reference</a>
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Attachments & Notes Content */}
          {activeTab === 'attachments' && (
            <div className="px-4 py-4 bg-amber-50">
              <div className="space-y-3">
                {/* Comments/Notes */}
                <div className="bg-white rounded-lg p-3 border border-amber-200">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Comments / Notes</label>
                  <textarea
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    rows={3}
                    value={comments}
                    onChange={e => setComments(e.target.value)}
                    placeholder="Add discussion notes, updates, or additional context..."
                  />
                  {searchQuery && comments && (
                    <div className="mt-2 text-xs text-gray-600 bg-gray-50 p-2 rounded border border-gray-200">
                      <span className="font-medium">Preview: </span>
                      <span>{highlightText(comments)}</span>
                    </div>
                  )}
                </div>

                {/* Attachments */}
                <div className="bg-white rounded-lg p-3 border border-amber-200">
                  <label className="block text-xs font-medium text-gray-700 mb-2">Files & Links</label>
                  
                  {/* Existing Attachments */}
                  {attachments.length > 0 && (
                    <div className="space-y-1 mb-3">
                      {attachments.map(att => (
                        <div key={att.id} className="flex items-center gap-2 p-1.5 bg-gray-50 rounded">
                          {att.type === 'file' ? (
                            <svg className="w-3 h-3 text-blue-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z"/>
                            </svg>
                          ) : (
                            <svg className="w-3 h-3 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z"/>
                            </svg>
                          )}
                          <a 
                            href={att.url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="flex-1 text-xs text-blue-600 hover:text-blue-800 underline truncate"
                          >
                            {att.name}
                          </a>
                          <button 
                            type="button" 
                            className="text-red-600 hover:text-red-800 p-0.5"
                            onClick={() => handleRemoveAttachment(att.id)} 
                            title="Remove attachment"
                          >
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"/>
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add File */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input 
                        type="file" 
                        onChange={handleFileUpload} 
                        disabled={uploading} 
                        className="text-xs text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-medium file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100"
                      />
                      {uploading && <span className="text-xs text-amber-600">Uploading...</span>}
                    </div>

                    {/* Add Link */}
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-xs focus:ring-2 focus:ring-amber-500" 
                        placeholder="Link URL" 
                        value={newLink} 
                        onChange={e => setNewLink(e.target.value)} 
                      />
                      <input 
                        type="text" 
                        className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-xs focus:ring-2 focus:ring-amber-500" 
                        placeholder="Link name" 
                        value={newLinkName} 
                        onChange={e => setNewLinkName(e.target.value)} 
                      />
                      <button 
                        type="button" 
                        className="px-3 py-1.5 bg-amber-600 text-white text-xs rounded hover:bg-amber-700 focus:ring-2 focus:ring-amber-500" 
                        onClick={handleAddLink}
                        disabled={!newLink.trim() || !newLinkName.trim()}
                      >
                        Add Link
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Activity History Content */}
          {activeTab === 'activity' && (
            <div className="px-4 py-4 bg-gray-50 space-y-3">
              <ActivityHistory 
                uid={uid}
                entityId={task.id}
                entityType="task"
              />
            </div>
          )}
        </div>

        {/* 🎯 Actions Section */}
        <div className="bg-gray-50 p-4">
          <div className="flex flex-wrap gap-2 justify-between">
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 font-medium"
              >
                Save Changes
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="px-3 py-1.5 bg-gray-200 text-gray-800 text-sm rounded hover:bg-gray-300 focus:ring-2 focus:ring-gray-500"
              >
                Cancel
              </button>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setShowBlockerManager(true)}
                className="px-2 py-1.5 bg-red-50 text-red-700 border border-red-200 text-xs rounded hover:bg-red-100 focus:ring-2 focus:ring-red-500"
                title="View and manage blockers for this task"
              >
                View Blockers
              </button>
              
              {task.status !== "archived" && onArchive && (
                <button
                  type="button"
                  onClick={onArchive}
                  className="px-2 py-1.5 bg-gray-50 text-gray-700 border border-gray-300 text-xs rounded hover:bg-gray-100 focus:ring-2 focus:ring-gray-500"
                >
                  Archive
                </button>
              )}
              
              {task.status === "archived" && onUnarchive && (
                <button
                  type="button"
                  onClick={onUnarchive}
                  className="px-2 py-1.5 bg-green-50 text-green-700 border border-green-200 text-xs rounded hover:bg-green-100 focus:ring-2 focus:ring-green-500"
                >
                  Unarchive
                </button>
              )}
              
              <button
                type="button"
                onClick={onDelete}
                className="px-2 py-1.5 bg-red-50 text-red-700 border border-red-200 text-xs rounded hover:bg-red-100 focus:ring-2 focus:ring-red-500"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Modals */}
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
      {/* Blocker Manager Modal */}
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
}
