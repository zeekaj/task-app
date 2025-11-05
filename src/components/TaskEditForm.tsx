import { getStorage, ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { v4 as uuidv4 } from "uuid";
import { createBlocker, resolveBlocker } from "../services/blockers";
import { BlockerManagerModal } from "./BlockerManagerModal";
import { ActivityHistory } from "./ActivityHistory";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useKeydown } from "../hooks/useKeydown";
import { useClickOutside } from "../hooks/useClickOutside";
import { Timestamp } from "firebase/firestore";

import { useTasks } from "../hooks/useTasks";
import { useTeamMembers } from "../hooks/useTeamMembers";
import { useOrganizationId } from "../hooks/useOrganization";
import { ConfirmModal } from "./shared/ConfirmModal";
import { logError } from "../utils/logger";
import type { WithId, Task, Project, Subtask, RecurrencePattern, TaskAttachment } from "../types";
import { updateTask } from "../services/tasks";
import { logActivity } from "../services/activityHistory";
import { generateAssigneeSuggestions, type AssigneeSuggestion } from "../utils/assigneeSuggestions";

type Props = {
  uid: string;
  task: WithId<Task>;
  allProjects?: WithId<Project>[];
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
  const teamMembers = useTeamMembers(uid);
  const { orgId } = useOrganizationId();
  const [showBlockerManager, setShowBlockerManager] = useState(false);
  const [confirmAttachmentOpen, setConfirmAttachmentOpen] = useState(false);
  const [confirmAttachmentMessage, setConfirmAttachmentMessage] = useState<string>("");
  const [confirmAttachmentAction, setConfirmAttachmentAction] = useState<(() => Promise<void>) | null>(null);
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
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const [statusDropdownPos, setStatusDropdownPos] = useState<{ top: number; left: number } | null>(null);
  
  // Assignee dropdown state
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const assigneeButtonRef = useRef<HTMLButtonElement>(null);
  const [assigneeDropdownPos, setAssigneeDropdownPos] = useState<{ top: number; left: number } | null>(null);
  
  // Track if any field has changed
  const hasUnsavedChanges = useCallback(() => {
    return (
      title !== task.title ||
      description !== (task.description ?? "") ||
      priority !== (task.priority ?? 0) ||
      dueDate !== (task.dueDate ?? "") ||
      projectId !== (task.projectId ?? "") ||
      assignee !== (typeof task.assignee === "string" ? task.assignee : task.assignee?.id ?? "") ||
      comments !== (task.comments ?? "") ||
      JSON.stringify(subtasks) !== JSON.stringify(task.subtasks || []) ||
      JSON.stringify(dependencies) !== JSON.stringify(task.dependencies || []) ||
      JSON.stringify(recurrence) !== JSON.stringify(task.recurrence || { type: "none" }) ||
      JSON.stringify(attachments) !== JSON.stringify(task.attachments || [])
    );
  }, [
    title, description, priority, dueDate, projectId, assignee, comments,
    subtasks, dependencies, recurrence, attachments,
    task.title, task.description, task.priority, task.dueDate, task.projectId,
    task.assignee, task.comments, task.subtasks, task.dependencies, task.recurrence,
    task.attachments
  ]);
  
  // Generate assignee suggestions
  const suggestions: AssigneeSuggestion[] = React.useMemo(() => {
    if (!allTasks || !teamMembers) return [];
    
    return generateAssigneeSuggestions({
      taskTitle: title,
      taskDescription: description,
      projectId: projectId || null,
      allTasks,
      allTeamMembers: teamMembers,
      allProjects,
    });
  }, [title, description, projectId, allTasks, teamMembers, allProjects]);
  
  // Find associated project
  const project = React.useMemo(() => {
    if (!projectId || !allProjects?.length) return null;
    return allProjects.find(p => p.id === projectId) || null;
  }, [projectId, allProjects]);
  
  // Position assignee dropdown when it opens
  useEffect(() => {
    if (showAssigneeDropdown && assigneeButtonRef.current) {
      const rect = assigneeButtonRef.current.getBoundingClientRect();
      setAssigneeDropdownPos({ top: rect.bottom + 4, left: rect.left });
    } else {
      setAssigneeDropdownPos(null);
    }
  }, [showAssigneeDropdown]);
  
  // Close assignee dropdown on click outside
  useClickOutside({
    enabled: showAssigneeDropdown,
    selector: `[data-assignee-dropdown="${task.id}"]`,
    onClickOutside: () => {
      setShowAssigneeDropdown(false);
    },
  });
  
  // Handle keyboard shortcuts
  useKeydown(
    {
      Enter: async (e: KeyboardEvent) => {
        // Ctrl/Cmd + Enter to save
        if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
          const syntheticEvent = new Event('submit') as unknown as React.FormEvent;
          await handleSave(syntheticEvent);
        }
      },
      Escape: () => handleCancel()
    },
    true // enabled
  );

  // Handle cancel with unsaved changes check
  const handleCancel = useCallback(() => {
    if (hasUnsavedChanges()) {
      setShowDiscardConfirm(true);
    } else {
      onCancel();
    }
  }, [hasUnsavedChanges, onCancel]);

  // Priority helper functions (0-100 scale)
  const getPriorityLabel = (value: number): string => {
    if (value === 0) return "None";
    if (value <= 20) return "Very Low";
    if (value <= 40) return "Low";
    if (value <= 60) return "Medium";
    if (value <= 80) return "High";
    return "Urgent";
  };

  const getPriorityColor = (value: number): string => {
    if (value === 0) return "bg-gray-200";
    if (value <= 20) return "bg-gradient-to-r from-blue-200 via-blue-300 to-blue-400";
    if (value <= 40) return "bg-gradient-to-r from-green-200 via-green-300 to-green-400";
    if (value <= 60) return "bg-gradient-to-r from-yellow-200 via-yellow-300 to-yellow-400";
    if (value <= 80) return "bg-gradient-to-r from-orange-200 via-orange-300 to-orange-400";
    return "bg-gradient-to-r from-red-300 via-red-400 to-red-500";
  };

  const getPrioritySliderColor = (value: number): string => {
    if (value === 0) return "#9ca3af"; // gray
    if (value <= 20) return "#60a5fa"; // blue
    if (value <= 40) return "#4ade80"; // green
    if (value <= 60) return "#facc15"; // yellow
    if (value <= 80) return "#fb923c"; // orange
    return "#ef4444"; // red
  };

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
    } catch (err) {
      logError('Error highlighting text:', (err as any)?.message ?? err);
      return text;
    }
  };

  // Handler functions (must be after state/props, before return)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Validate required fields
    if (!title.trim()) {
      alert("Title is required.");
      return;
    }

    if (!orgId) return;

    try {
      // Save task changes
      await updateTask(
        orgId,
        task.id,
        {
          title: title.trim(),
          description: description.trim(),
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

      // Only close modal if this wasn't triggered by autosave
      if (!isAutosaving) {
        onSave(); // This should close the modal
      }
    } catch (err) {
      logError("Error saving task:", (err as any)?.message ?? err);
      alert("Failed to save task: " + (err instanceof Error ? err.message : String(err)));
      // Don't close modal if save failed
      return;
    }
  };

  // Autosave function with debouncing
  const autosaveTimeoutRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);
  
  const handleAutosave = useCallback(async () => {
    if (!title.trim()) {
      return; // Don't autosave if title is empty
    }
    
    if (!orgId) return;
    
    setIsAutosaving(true);
    try {
      await updateTask(
        orgId,
        task.id,
        {
          title: title.trim(),
          description: description.trim(),
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
      logError("Error autosaving task:", (err as any)?.message ?? err);
    } finally {
      setTimeout(() => setIsAutosaving(false), 300); // Show briefly for 300ms
    }
  }, [orgId, uid, task.id, title, description, comments, priority, dueDate, projectId, assignee, recurrence, attachments, subtasks, dependencies]);

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
        uploadedAt: Timestamp.now(),
        uploadedBy: uid,
      };
      const updatedAttachments = [...attachments, newAttachment];
      setAttachments(updatedAttachments);
      if (orgId) await updateTask(orgId, task.id, { attachments: updatedAttachments });
      await logActivity(uid, "task", task.id, title, "updated", {
        description: `Attached file: ${file.name}`,
        changes: { attachments: { from: attachments, to: updatedAttachments } }
      });
    } catch (err) {
      logError("Error uploading file:", (err as any)?.message ?? err);
      alert("Failed to upload file: " + (err instanceof Error ? err.message : String(err)));
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
  // Only sync dependencies, subtasks, and recurrence from task prop when switching tasks
  // Note: Attachments are NOT synced here because they're saved immediately on upload
  useEffect(() => {
    setRecurrence(task.recurrence || { type: "none" });
  }, [task.id, task.recurrence]);

  // Sync dependencies only when task ID changes (not on every dependencies update)
  // This prevents overwriting local edits during autosave
  useEffect(() => {
    setDependencies(task.dependencies || []);
  }, [task.id]);

  // Sync subtasks only when task ID changes (not on every subtasks update)
  // This prevents overwriting local edits during autosave
  useEffect(() => {
    setSubtasks(task.subtasks || []);
  }, [task.id]);

  // Sync attachments separately only when task.id changes OR when task.attachments length changes
  // This allows real-time updates while preventing overwrites during upload
  useEffect(() => {
    setAttachments(task.attachments || []);
  }, [task.id, task.attachments]);

  // Handle escape key to cancel edit using custom hook
  useKeydown({
    Escape: () => {
      // Don't cancel if we're in a modal (block/resolve)
      if (!showBlockModal && !showResolveModal && !showDiscardConfirm) {
        onCancel();
      }
    }
  });

  // Intercept status change to prompt for block/resolve reason
  const handleStatusChange = async (newStatus: Task["status"]) => {
    if (task.status === "blocked" && newStatus !== "blocked") {
      setPendingStatus(newStatus);
      setShowResolveModal(true);
    } else if (newStatus === "blocked" && task.status !== "blocked") {
      setPendingStatus(newStatus);
      setShowBlockModal(true);
    } else {
      // Update task status directly
      if (!orgId) return;
      try {
        await updateTask(orgId, task.id, { status: newStatus });
        onStatusChange && onStatusChange(newStatus);
      } catch (error) {
        console.error('Failed to update task status:', error);
      }
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


  const handleAddLink = async () => {
    if (!newLink.trim() || !newLinkName.trim()) return;
    const newAttachment: TaskAttachment = {
      id: uuidv4(),
      name: newLinkName.trim(),
      url: newLink.trim(),
      type: 'link',
      uploadedAt: Timestamp.now(),
      uploadedBy: uid,
    };
    const updatedAttachments = [...attachments, newAttachment];
    setAttachments(updatedAttachments);
    try {
      if (orgId) await updateTask(orgId, task.id, { attachments: updatedAttachments });
      await logActivity(uid, "task", task.id, title, "updated", {
        description: `Attached link: ${newLinkName.trim()}`,
        changes: { attachments: { from: attachments, to: updatedAttachments } }
      });
      setNewLink("");
      setNewLinkName("");
    } catch (err) {
      console.error("Error adding link:", err);
      alert("Failed to add link: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleRemoveAttachment = async (id: string) => {
    const attachmentToRemove = attachments.find(a => a.id === id);
    if (!attachmentToRemove) return;

    if (attachmentToRemove.type === 'file') {
      setConfirmAttachmentMessage(`Are you sure you want to permanently delete the file "${attachmentToRemove.name}" from Storage? This cannot be undone.`);
  // store id in closure via action; no separate id state needed
      const action = async () => {
        // Delete from Storage
        try {
          const url = attachmentToRemove.url;
          let path = '';
          const match = url.match(/\/o\/(.+?)\?/);
          if (match && match[1]) {
            path = decodeURIComponent(match[1]);
          } else {
            path = `attachments/${uid}/${attachmentToRemove.name}`;
          }
          const storage = getStorage();
          const fileRef = storageRef(storage, path);
          await deleteObject(fileRef);
        } catch (err) {
          logError("Error deleting file from Storage:", (err as any)?.message ?? err);
          alert("Failed to delete file from Storage: " + (err instanceof Error ? err.message : String(err)));
          throw err;
        }

        // Remove from Firestore
        const updatedAttachments = attachments.filter(a => a.id !== id);
        setAttachments(updatedAttachments);
        try {
          if (orgId) await updateTask(orgId, task.id, { attachments: updatedAttachments });
          await logActivity(uid, "task", task.id, title, "updated", {
            description: `Removed file: ${attachmentToRemove.name}`,
            changes: { attachments: { from: attachments, to: updatedAttachments } }
          });
        } catch (err) {
          logError("Error removing attachment:", (err as any)?.message ?? err);
          alert("Failed to remove attachment: " + (err instanceof Error ? err.message : String(err)));
          setAttachments(attachments);
        }
      };
      setConfirmAttachmentAction(() => action);
      setConfirmAttachmentOpen(true);
      return;
    }

    // Link type - remove immediately
    const updatedAttachments = attachments.filter(a => a.id !== id);
    setAttachments(updatedAttachments);
    try {
      if (orgId) await updateTask(orgId, task.id, { attachments: updatedAttachments });
      await logActivity(uid, "task", task.id, title, "updated", {
        description: `Removed link: ${attachmentToRemove.name}`,
        changes: { attachments: { from: attachments, to: updatedAttachments } }
      });
    } catch (err) {
      logError("Error removing attachment:", (err as any)?.message ?? err);
      alert("Failed to remove attachment: " + (err instanceof Error ? err.message : String(err)));
      setAttachments(attachments);
    }
  };

  // Get status color for header
  const getStatusColor = (status: Task["status"]) => {
    const colors = {
      not_started: "from-gray-800 to-gray-900 border-white/10",
      in_progress: "from-blue-900/50 to-blue-950/50 border-blue-500/30", 
      done: "from-green-900/50 to-green-950/50 border-green-500/30",
      blocked: "from-red-900/50 to-red-950/50 border-red-500/30",
      archived: "from-gray-900/50 to-gray-950/50 border-gray-500/30 opacity-60"
    };
    return colors[status] || colors.not_started;
  };

  // Close status dropdown when clicking outside
  useClickOutside({
    enabled: showStatusDropdown,
    onClickOutside: () => {
      setShowStatusDropdown(false);
      setStatusDropdownPos(null);
    },
    selector: `[data-status-dropdown-modal]`
  });

  // Close the edit modal when clicking outside the modal container
  useClickOutside({
    enabled: !showBlockerManager && !showResolveModal && !showBlockModal && !showDiscardConfirm,
    onClickOutside: () => {
      if (typeof onCancel === 'function') onCancel();
    },
    selector: `[data-edit-modal-root="${task.id}"]`
  });

  return (
    <div className="max-w-4xl mx-auto bg-[rgba(20,20,30,0.95)] backdrop-blur-sm rounded-xl shadow-lg overflow-hidden relative border border-white/10" data-edit-modal-root={task.id}>
      {/* Enhanced Header with Status Indicator */}
      <div className={`bg-gradient-to-r ${getStatusColor(task.status)} border-b-2 px-4 py-3 relative`}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 relative" data-status-dropdown-modal>
              {/* Status Icon - clickable dropdown */}
              <button
                type="button"
                className="p-0.5 rounded-full transition-all duration-200 hover:scale-110"
                onClick={(e) => {
                  e.stopPropagation();
                  // If task is blocked, open blocker manager instead of dropdown
                  if (task.status === 'blocked') {
                    setShowBlockerManager(true);
                    return;
                  }
                  // compute position for fixed dropdown so it appears near the icon
                  const btn = e.currentTarget as HTMLElement;
                  const rect = btn.getBoundingClientRect();
                  // add small offset below the button
                  setStatusDropdownPos({ top: rect.bottom + window.scrollY + 6, left: rect.left + window.scrollX });
                  setShowStatusDropdown((s) => !s);
                }}
                title={task.status === 'blocked' ? 'Task is blocked - Click to manage blockers' : `Status: ${task.status.replace('_', ' ')} - Click to change`}
              >
                {task.status === 'not_started' && (
                  <span className="inline-flex items-center justify-center rounded-full bg-gray-200 w-6 h-6">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-5 h-5 text-brand-text">
                      <path d="M376 88C376 57.1 350.9 32 320 32C289.1 32 264 57.1 264 88C264 118.9 289.1 144 320 144C350.9 144 376 118.9 376 88zM400 300.7L446.3 363.1C456.8 377.3 476.9 380.3 491.1 369.7C505.3 359.1 508.3 339.1 497.7 324.9L427.2 229.9C402 196 362.3 176 320 176C277.7 176 238 196 212.8 229.9L142.3 324.9C131.8 339.1 134.7 359.1 148.9 369.7C163.1 380.3 183.1 377.3 193.7 363.1L240 300.7L240 576C240 593.7 254.3 608 272 608C289.7 608 304 593.7 304 576L304 416C304 407.2 311.2 400 320 400C328.8 400 336 407.2 336 416L336 576C336 593.7 350.3 608 368 608C385.7 608 400 593.7 400 576L400 300.7z"/>
                    </svg>
                  </span>
                )}
                {task.status === 'in_progress' && (
                  <span className="inline-flex items-center justify-center rounded-full bg-blue-300 w-6 h-6">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-5 h-5 text-blue-500">
                      <path d="M352.5 32C383.4 32 408.5 57.1 408.5 88C408.5 118.9 383.4 144 352.5 144C321.6 144 296.5 118.9 296.5 88C296.5 57.1 321.6 32 352.5 32zM219.6 240C216.3 240 213.4 242 212.2 245L190.2 299.9C183.6 316.3 165 324.3 148.6 317.7C132.2 311.1 124.2 292.5 130.8 276.1L152.7 221.2C163.7 193.9 190.1 176 219.6 176L316.9 176C345.4 176 371.7 191.1 386 215.7L418.8 272L480.4 272C498.1 272 512.4 286.3 512.4 304C512.4 321.7 498.1 336 480.4 336L418.8 336C396 336 375 323.9 363.5 304.2L353.5 287.1L332.8 357.5L408.2 380.1C435.9 388.4 450 419.1 438.3 445.6L381.7 573C374.5 589.2 355.6 596.4 339.5 589.2C323.4 582 316.1 563.1 323.3 547L372.5 436.2L276.6 407.4C243.9 397.6 224.6 363.7 232.9 330.6L255.6 240L219.7 240zM211.6 421C224.9 435.9 242.3 447.3 262.8 453.4L267.5 454.8L260.6 474.1C254.8 490.4 244.6 504.9 231.3 515.9L148.9 583.8C135.3 595 115.1 593.1 103.9 579.5C92.7 565.9 94.6 545.7 108.2 534.5L190.6 466.6C195.1 462.9 198.4 458.1 200.4 452.7L211.6 421z"/>
                    </svg>
                  </span>
                )}
                {task.status === 'done' && (
                  <span className="inline-flex items-center justify-center rounded-full bg-green-300 w-6 h-6">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-5 h-5 text-green-600">
                      <path d="M280 88C280 57.1 254.9 32 224 32C193.1 32 168 57.1 168 88C168 118.9 193.1 144 224 144C254.9 144 280 118.9 280 88zM304 300.7L341 350.6C353.8 333.1 369.5 317.9 387.3 305.6L331.1 229.9C306 196 266.3 176 224 176C181.7 176 142 196 116.8 229.9L46.3 324.9C35.8 339.1 38.7 359.1 52.9 369.7C67.1 380.3 87.1 377.3 97.7 363.1L144 300.7L144 576C144 593.7 158.3 608 176 608C193.7 608 208 593.7 208 576L208 416C208 407.2 215.2 400 224 400C232.8 400 240 407.2 240 416L240 576C240 593.7 254.3 608 272 608C289.7 608 304 593.7 304 576L304 300.7zM640 464C640 384.5 575.5 320 496 320C416.5 320 352 384.5 352 464C352 543.5 416.5 608 496 608C575.5 608 640 543.5 640 464zM553.4 403.1C560.5 408.3 562.1 418.3 556.9 425.4L492.9 513.4C490.1 517.2 485.9 519.6 481.2 519.9C476.5 520.2 471.9 518.6 468.6 515.3L428.6 475.3C422.4 469.1 422.4 458.9 428.6 452.7C434.8 446.5 445 446.5 451.2 452.7L478 479.5L531 406.6C536.2 399.5 546.2 397.9 553.4 403.1z"/>
                    </svg>
                  </span>
                )}
                {task.status === 'blocked' && (
                  <span className="inline-flex items-center justify-center rounded-full bg-red-300 w-6 h-6">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-5 h-5 text-red-600">
                      <path d="M288 64C305.7 64 320 78.3 320 96L320 101.4C320 156.6 296.3 208.4 256.1 244.5L319 320L408 320C423.1 320 437.3 327.1 446.4 339.2L489.6 396.8C500.2 410.9 497.3 431 483.2 441.6C469.1 452.2 449 449.3 438.4 435.2L400 384L295.2 384L408.8 523.8C419.9 537.5 417.9 557.7 404.1 568.8C390.3 579.9 370.2 577.9 359.1 564.1L169.4 330.6C163.3 345.6 160 361.9 160 378.6L160 448C160 465.7 145.7 480 128 480C110.3 480 96 465.7 96 448L96 378.6C96 311.2 131.4 248.7 189.2 214L193.8 211.2C232.4 188 256 146.4 256 101.4L256 96C256 78.3 270.3 64 288 64zM48 152C48 121.1 73.1 96 104 96C134.9 96 160 121.1 160 152C160 182.9 134.9 208 104 208C73.1 208 48 182.9 48 152zM424 144.1C424 157.4 413.3 168.1 400 168.1C386.7 168.1 376 157.4 376 144.1L376 96.1C376 82.8 386.7 72.1 400 72.1C413.3 72.1 424 82.8 424 96.1L424 144.1zM528 296.1C514.7 296.1 504 285.4 504 272.1C504 258.8 514.7 248.1 528 248.1L576 248.1C589.3 248.1 600 258.8 600 272.1C600 285.4 589.3 296.1 576 296.1L528 296.1zM473.5 198.6C464.1 189.2 464.1 174 473.5 164.7L507.4 130.8C516.8 121.4 532 121.4 541.3 130.8C550.6 140.2 550.7 155.4 541.3 164.7L507.4 198.6C498 208 482.8 208 473.5 198.6z"/>
                    </svg>
                  </span>
                )}
                {task.status === 'archived' && (
                  <span className="inline-flex items-center justify-center rounded-full bg-gray-400 w-6 h-6">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" className="w-4 h-4 text-brand-text" fill="currentColor">
                      <path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4z" />
                      <path fillRule="evenodd" d="M3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" clipRule="evenodd" />
                    </svg>
                  </span>
                )}
              </button>

              {/* Status Dropdown */}
              {showStatusDropdown && createPortal(
                <div
                  ref={statusDropdownRef}
                  className="fixed bg-gray-800/40 border border-brand-cyan/50 rounded-2xl shadow-xl py-1 z-[9999] min-w-[140px] backdrop-blur-xl"
                  style={{
                    top: statusDropdownPos ? `${statusDropdownPos.top}px` : '80px',
                    left: statusDropdownPos ? `${statusDropdownPos.left}px` : '32px'
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {task.status !== 'not_started' && (
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left hover:bg-brand-cyan/10 flex items-center gap-2 text-sm text-brand-text"
                      onClick={() => {
                        handleStatusChange('not_started');
                        setShowStatusDropdown(false);
                        setStatusDropdownPos(null);
                      }}
                    >
                      <span className="inline-flex items-center justify-center rounded-full bg-gray-200 w-5 h-5">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-4 h-4 text-brand-text">
                          <path d="M376 88C376 57.1 350.9 32 320 32C289.1 32 264 57.1 264 88C264 118.9 289.1 144 320 144C350.9 144 376 118.9 376 88zM400 300.7L446.3 363.1C456.8 377.3 476.9 380.3 491.1 369.7C505.3 359.1 508.3 339.1 497.7 324.9L427.2 229.9C402 196 362.3 176 320 176C277.7 176 238 196 212.8 229.9L142.3 324.9C131.8 339.1 134.7 359.1 148.9 369.7C163.1 380.3 183.1 377.3 193.7 363.1L240 300.7L240 576C240 593.7 254.3 608 272 608C289.7 608 304 593.7 304 576L304 416C304 407.2 311.2 400 320 400C328.8 400 336 407.2 336 416L336 576C336 593.7 350.3 608 368 608C385.7 608 400 593.7 400 576L400 300.7z"/>
                        </svg>
                      </span>
                      Not Started
                    </button>
                  )}
                  {task.status !== 'in_progress' && (
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left hover:bg-brand-cyan/10 flex items-center gap-2 text-sm text-brand-text"
                      onClick={() => {
                        handleStatusChange('in_progress');
                        setShowStatusDropdown(false);
                        setStatusDropdownPos(null);
                      }}
                    >
                      <span className="inline-flex items-center justify-center rounded-full bg-blue-300 w-5 h-5">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-4 h-4 text-blue-500">
                          <path d="M352.5 32C383.4 32 408.5 57.1 408.5 88C408.5 118.9 383.4 144 352.5 144C321.6 144 296.5 118.9 296.5 88C296.5 57.1 321.6 32 352.5 32zM219.6 240C216.3 240 213.4 242 212.2 245L190.2 299.9C183.6 316.3 165 324.3 148.6 317.7C132.2 311.1 124.2 292.5 130.8 276.1L152.7 221.2C163.7 193.9 190.1 176 219.6 176L316.9 176C345.4 176 371.7 191.1 386 215.7L418.8 272L480.4 272C498.1 272 512.4 286.3 512.4 304C512.4 321.7 498.1 336 480.4 336L418.8 336C396 336 375 323.9 363.5 304.2L353.5 287.1L332.8 357.5L408.2 380.1C435.9 388.4 450 419.1 438.3 445.6L381.7 573C374.5 589.2 355.6 596.4 339.5 589.2C323.4 582 316.1 563.1 323.3 547L372.5 436.2L276.6 407.4C243.9 397.6 224.6 363.7 232.9 330.6L255.6 240L219.7 240zM211.6 421C224.9 435.9 242.3 447.3 262.8 453.4L267.5 454.8L260.6 474.1C254.8 490.4 244.6 504.9 231.3 515.9L148.9 583.8C135.3 595 115.1 593.1 103.9 579.5C92.7 565.9 94.6 545.7 108.2 534.5L190.6 466.6C195.1 462.9 198.4 458.1 200.4 452.7L211.6 421z"/>
                        </svg>
                      </span>
                      In Progress
                    </button>
                  )}
                  {task.status !== 'done' && (
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left hover:bg-brand-cyan/10 flex items-center gap-2 text-sm text-brand-text"
                      onClick={() => {
                        handleStatusChange('done');
                        setShowStatusDropdown(false);
                        setStatusDropdownPos(null);
                      }}
                    >
                      <span className="inline-flex items-center justify-center rounded-full bg-green-300 w-5 h-5">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-4 h-4 text-green-600">
                          <path d="M280 88C280 57.1 254.9 32 224 32C193.1 32 168 57.1 168 88C168 118.9 193.1 144 224 144C254.9 144 280 118.9 280 88zM304 300.7L341 350.6C353.8 333.1 369.5 317.9 387.3 305.6L331.1 229.9C306 196 266.3 176 224 176C181.7 176 142 196 116.8 229.9L46.3 324.9C35.8 339.1 38.7 359.1 52.9 369.7C67.1 380.3 87.1 377.3 97.7 363.1L144 300.7L144 576C144 593.7 158.3 608 176 608C193.7 608 208 593.7 208 576L208 416C208 407.2 215.2 400 224 400C232.8 400 240 407.2 240 416L240 576C240 593.7 254.3 608 272 608C289.7 608 304 593.7 304 576L304 300.7zM640 464C640 384.5 575.5 320 496 320C416.5 320 352 384.5 352 464C352 543.5 416.5 608 496 608C575.5 608 640 543.5 640 464zM553.4 403.1C560.5 408.3 562.1 418.3 556.9 425.4L492.9 513.4C490.1 517.2 485.9 519.6 481.2 519.9C476.5 520.2 471.9 518.6 468.6 515.3L428.6 475.3C422.4 469.1 422.4 458.9 428.6 452.7C434.8 446.5 445 446.5 451.2 452.7L478 479.5L531 406.6C536.2 399.5 546.2 397.9 553.4 403.1z"/>
                        </svg>
                      </span>
                      Done
                    </button>
                  )}
                  {task.status !== 'blocked' && (
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left hover:bg-brand-cyan/10 flex items-center gap-2 text-sm text-brand-text"
                      onClick={() => {
                        handleStatusChange('blocked');
                        setShowStatusDropdown(false);
                        setStatusDropdownPos(null);
                      }}
                    >
                      <span className="inline-flex items-center justify-center rounded-full bg-red-300 w-5 h-5">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-4 h-4 text-red-600">
                          <path d="M288 64C305.7 64 320 78.3 320 96L320 101.4C320 156.6 296.3 208.4 256.1 244.5L319 320L408 320C423.1 320 437.3 327.1 446.4 339.2L489.6 396.8C500.2 410.9 497.3 431 483.2 441.6C469.1 452.2 449 449.3 438.4 435.2L400 384L295.2 384L408.8 523.8C419.9 537.5 417.9 557.7 404.1 568.8C390.3 579.9 370.2 577.9 359.1 564.1L169.4 330.6C163.3 345.6 160 361.9 160 378.6L160 448C160 465.7 145.7 480 128 480C110.3 480 96 465.7 96 448L96 378.6C96 311.2 131.4 248.7 189.2 214L193.8 211.2C232.4 188 256 146.4 256 101.4L256 96C256 78.3 270.3 64 288 64zM48 152C48 121.1 73.1 96 104 96C134.9 96 160 121.1 160 152C160 182.9 134.9 208 104 208C73.1 208 48 182.9 48 152zM424 144.1C424 157.4 413.3 168.1 400 168.1C386.7 168.1 376 157.4 376 144.1L376 96.1C376 82.8 386.7 72.1 400 72.1C413.3 72.1 424 82.8 424 96.1L424 144.1zM528 296.1C514.7 296.1 504 285.4 504 272.1C504 258.8 514.7 248.1 528 248.1L576 248.1C589.3 248.1 600 258.8 600 272.1C600 285.4 589.3 296.1 576 296.1L528 296.1zM473.5 198.6C464.1 189.2 464.1 174 473.5 164.7L507.4 130.8C516.8 121.4 532 121.4 541.3 130.8C550.6 140.2 550.7 155.4 541.3 164.7L507.4 198.6C498 208 482.8 208 473.5 198.6z"/>
                        </svg>
                      </span>
                      Blocked
                    </button>
                  )}
                </div>,
                document.body
              )}

              <span className="text-sm font-medium text-gray-400 capitalize">
                {task.status.replace('_', ' ')}
              </span>
            </div>
            <span className="text-gray-400">•</span>
            <span className="text-sm text-gray-400">
              {task.id ? `Task #${task.id.slice(0, 8)}` : 'New Task'}
            </span>
          </div>
          
          {/* Task Indicators from Task Line */}
          <div className="flex items-center gap-x-2 text-xs text-brand-text relative">
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
            <span className="flex items-center justify-center w-[110px] truncate" title="Assigned to">
              <svg className="w-3 h-3 mr-1 text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 20 20">
                <circle cx="10" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 17v-1a4 4 0 014-4h4a4 4 0 014 4v1" />
              </svg>
              <span className="truncate">{assignee || '--'}</span>
            </span>
            
            {/* Priority Badge */}
            <span className={`text-xs font-semibold rounded-lg px-2 py-1 shadow-md border border-zinc-400 ${getPriorityColor(priority)}`}
            style={{ boxShadow: '0 2px 6px rgba(120,120,120,0.15), inset 0 1px 2px #fff' }}>
              {getPriorityLabel(priority)} ({priority})
            </span>
            
            {/* Project Badge */}
            {project && (
              <span
                className="text-xs font-medium px-2 py-1 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                title={`Part of project: ${project.title}`}
              >
                {project.title}
              </span>
            )}
            
            {/* Autosave Indicator - appears after priority badge */}
            {isAutosaving && (
              <svg className="w-4 h-4 ml-1 animate-spin text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
          </div>
        </div>
        {/* Title row with persistent notification icons (same as Task line) */}
        <div className="flex items-center gap-2">
          <input
            id="task-title-input"
            className="flex-1 bg-transparent border-none text-xl font-bold text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-cyan rounded-md px-1 placeholder-gray-500"
            value={title}
            onChange={e => setTitle(e.target.value)}
            onBlur={triggerAutosave}
            placeholder="Enter task title..."
            autoFocus
          />
          <div className="flex items-center gap-2 text-xs text-brand-text">
            {/* Description indicator */}
            {description && (
              <span
                title={typeof description === 'string' ? description : 'Has description'}
                className="ml-1 flex items-center"
              >
                <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="currentColor"><path d="M3 6h18v2H3V6zm0 5h18v2H3v-2zm0 5h13v2H3v-2z"/></svg>
              </span>
            )}
            {/* Notes/comments indicator */}
            {comments && comments.length > 0 && (
              <span title="Has comments/notes" className="ml-1 flex items-center">
                <svg className="w-4 h-4 text-amber-400" viewBox="0 0 24 24" fill="currentColor"><path d="M21 6.5A2.5 2.5 0 0018.5 4h-13A2.5 2.5 0 003 6.5v7A2.5 2.5 0 005.5 16H6v3l4.5-3h8A2.5 2.5 0 0021 13.5v-7z"/></svg>
              </span>
            )}
            {/* Subtask progress icon */}
            {Array.isArray(subtasks) && subtasks.length > 0 && (
              <span className="inline-flex items-center gap-1 text-xs text-gray-400 ml-1" title="Subtasks">
                <svg width="16" height="16" fill="none" viewBox="0 0 20 20"><rect x="2" y="5" width="16" height="10" rx="2" fill="#e5e7eb"/><rect x="4" y="7" width="12" height="6" rx="1" fill="#fff"/><path d="M7 10.5l2 2 4-4" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                {subtasks.filter(s => s.done).length}/{subtasks.length}
              </span>
            )}
            {/* Dependencies icon */}
            {Array.isArray(dependencies) && dependencies.length > 0 && (
              <span className="inline-flex items-center gap-1 text-xs text-blue-500 ml-1" title={`Depends on: ${dependencies.map(depId => {
                const depTask = allTasks.find(t => t.id === depId);
                return depTask ? depTask.title : depId;
              }).join(', ')}`}
              >
                <svg width="16" height="16" fill="none" viewBox="0 0 20 20"><path d="M7 10h6M7 10l2-2m-2 2l2 2" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="5" cy="10" r="2" fill="#dbeafe" stroke="#3b82f6" strokeWidth="1.2"/><circle cx="15" cy="10" r="2" fill="#dbeafe" stroke="#3b82f6" strokeWidth="1.2"/></svg>
                {dependencies.length}
              </span>
            )}
            {/* Attachments icon */}
            {Array.isArray(attachments) && attachments.length > 0 && (
              <span className="inline-flex items-center gap-1 text-xs text-purple-500 ml-1" title={`${attachments.length} attachment${attachments.length !== 1 ? 's' : ''}: ${attachments.map(a => a.name).join(', ')}`}>
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clipRule="evenodd"/></svg>
                {attachments.length}
              </span>
            )}
          </div>
        </div>
      </div>

      <form ref={formRef} onSubmit={handleSave} className="flex flex-col">
        {/* 📝 Basic Information Section */}
        <div className="bg-[rgba(15,15,25,0.6)] border-b border-white/10 p-4">
          {/* Description */}
          <div className="mb-3">
            <label className="block text-sm font-medium text-brand-text mb-1">Description</label>
            <textarea
              className="w-full bg-gray-800/40 text-brand-text border border-white/10 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-cyan focus:border-brand-cyan text-sm placeholder-gray-500"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={triggerAutosave}
              placeholder="Describe what needs to be done..."
            />
            {searchQuery && description && (
              <div className="mt-1 text-xs text-gray-400 bg-[rgba(15,15,25,0.6)] p-2 rounded border border-white/10">
                <span className="font-medium">Preview: </span>
                <span>{highlightText(description)}</span>
              </div>
            )}
          </div>

          {/* Key Fields Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="lg:col-span-2">
              <label className="block text-xs font-medium text-brand-text mb-1">
                Priority: {getPriorityLabel(priority)} ({priority})
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={priority}
                  onChange={(e) => setPriority(Number(e.target.value))}
                  onMouseUp={triggerAutosave}
                  onTouchEnd={triggerAutosave}
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
                  className="flex-shrink-0 w-12 h-8 rounded flex items-center justify-center text-xs font-bold text-white shadow-sm text-shadow-sm"
                  style={{ backgroundColor: getPrioritySliderColor(priority) }}
                >
                  {priority}
                </span>
              </div>
            </div>

            <div className="lg:col-span-1">
              <label className="block text-xs font-medium text-brand-text mb-1">Due Date</label>
              <input
                type="date"
                className="w-full bg-gray-800/40 text-brand-text border border-white/10 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-brand-cyan focus:border-brand-cyan"
                value={dueDate ? dueDate.substring(0, 10) : ""}
                onChange={(e) => setDueDate(e.target.value)}
                onBlur={triggerAutosave}
              />
            </div>

            <div className="lg:col-span-1">
              <label className="block text-xs font-medium text-brand-text mb-1">Assignee</label>
              <button
                ref={assigneeButtonRef}
                type="button"
                className="w-full bg-gray-800/40 text-brand-text border border-white/10 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-brand-cyan focus:border-brand-cyan text-left flex items-center justify-between hover:bg-gray-800/60 transition-colors"
                onClick={() => setShowAssigneeDropdown(!showAssigneeDropdown)}
              >
                <span className="truncate">{assignee || '— Unassigned —'}</span>
                <svg className="w-4 h-4 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {/* Assignee Dropdown with Suggestions - rendered via portal */}
              {showAssigneeDropdown && createPortal(
                <div
                  data-assignee-dropdown={task.id}
                  className="fixed bg-gray-800/95 border border-brand-cyan/50 rounded-lg shadow-xl py-1 z-[9999] min-w-[280px] max-h-[400px] overflow-y-auto backdrop-blur-xl"
                  style={{ 
                    top: assigneeDropdownPos ? `${assigneeDropdownPos.top}px` : '0px',
                    left: assigneeDropdownPos ? `${assigneeDropdownPos.left}px` : '0px'
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Suggestions Section */}
                  {suggestions.length > 0 && (
                    <>
                      <div className="px-3 py-1.5 text-xs font-semibold text-brand-cyan uppercase tracking-wide flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        Suggested
                      </div>
                      {suggestions.map((suggestion) => (
                        <button
                          key={suggestion.memberId}
                          type="button"
                          className="w-full px-3 py-2 text-left hover:bg-brand-cyan/10 flex flex-col gap-1 border-l-2 border-brand-cyan/50"
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            setAssignee(suggestion.memberName);
                            setShowAssigneeDropdown(false);
                            triggerAutosave();
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-brand-text">{suggestion.memberName}</span>
                            <span className="text-xs px-1.5 py-0.5 rounded bg-brand-cyan/20 text-brand-cyan font-semibold">
                              {suggestion.confidence}%
                            </span>
                          </div>
                          <span className="text-xs text-brand-text/60">{suggestion.primaryReason}</span>
                        </button>
                      ))}
                      <div className="border-t border-white/10 my-1"></div>
                    </>
                  )}
                  
                  {/* All Team Members */}
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left hover:bg-brand-cyan/10 text-sm text-brand-text/60"
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      setAssignee("");
                      setShowAssigneeDropdown(false);
                      triggerAutosave();
                    }}
                  >
                    — Unassigned —
                  </button>
                  {teamMembers?.filter(m => m.active).map((member) => (
                    <button
                      key={member.id}
                      type="button"
                      className={`w-full px-3 py-2 text-left hover:bg-brand-cyan/10 flex items-center justify-between text-sm text-brand-text ${
                        assignee === member.name ? 'bg-brand-cyan/20' : ''
                      }`}
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        setAssignee(member.name);
                        setShowAssigneeDropdown(false);
                        triggerAutosave();
                      }}
                    >
                      <span>{member.name}</span>
                      {member.title && <span className="text-xs text-brand-text/60">({member.title})</span>}
                    </button>
                  ))}
                </div>,
                document.body
              )}
            </div>

            <div className="lg:col-span-1">
              <label className="block text-xs font-medium text-brand-text mb-1">Project</label>
              <select
                className="w-full bg-gray-800/40 text-brand-text border border-white/10 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-brand-cyan focus:border-brand-cyan"
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
        <div className="border-t border-white/10">
          {/* Tab Navigation */}
          <div className="flex border-b border-white/10 bg-[rgba(15,15,25,0.6)]">
            <button
              type="button"
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors border-b-2 flex items-center justify-center gap-2 ${
                activeTab === 'advanced'
                  ? 'text-brand-cyan border-brand-cyan bg-gray-800/40'
                  : 'text-brand-text border-transparent hover:text-brand-cyan hover:bg-gray-800/20'
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
                  ? 'text-brand-cyan border-brand-cyan bg-gray-800/40'
                  : 'text-brand-text border-transparent hover:text-brand-cyan hover:bg-gray-800/20'
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
                  ? 'text-brand-cyan border-brand-cyan bg-gray-800/40'
                  : 'text-brand-text border-transparent hover:text-brand-cyan hover:bg-gray-800/20'
              }`}
              onClick={() => setActiveTab(activeTab === 'activity' ? null : 'activity')}
            >
              <span className="text-sm">📜</span>
              Activity History
            </button>
          </div>

          {/* Tab Content */}
          
          {activeTab === 'advanced' && (
            <div className="px-4 pb-4 bg-[rgba(15,15,25,0.4)] space-y-4">
              {/* Organization & Planning */}
              <div className="bg-[rgba(20,20,30,0.8)] rounded-lg p-3 border border-brand-cyan/30">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-4 h-4 text-brand-cyan" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"/>
                  </svg>
                  <h4 className="text-sm font-medium text-brand-text">Organization & Planning</h4>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Subtasks */}
                  <div>
                    <label className="block text-xs font-medium text-brand-text mb-2">Subtasks</label>
                    <div className="space-y-1">
                      {subtasks.map((sub, i) => (
                        <div key={sub.id} className="flex items-center gap-2 p-1.5 bg-[rgba(15,15,25,0.6)] rounded">
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
                              className="w-full bg-gray-800/60 text-brand-text border border-white/10 rounded px-2 py-1 text-xs focus:ring-2 focus:ring-brand-cyan focus:border-brand-cyan placeholder-gray-500"
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
                        className="w-full py-1.5 px-2 text-xs text-brand-text border border-white/10 border-dashed rounded hover:bg-[rgba(15,15,25,0.6)] hover:border-brand-cyan/50 focus:ring-2 focus:ring-brand-cyan transition-colors"
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
                    <label className="block text-xs font-medium text-brand-text mb-2">Dependencies</label>
                    <div className="space-y-1">
                      {dependencies.map((depId) => {
                        const depTask = allTasks.find((t) => t.id === depId);
                        return (
                          <div key={depId} className="flex items-center gap-2 p-1.5 bg-[rgba(15,15,25,0.6)] rounded border border-brand-cyan/30">
                            <svg className="w-3 h-3 text-brand-cyan flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z"/>
                            </svg>
                            <span className="flex-1 text-xs text-brand-text truncate">
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
                        className="w-full bg-gray-800/40 text-brand-text border border-white/10 rounded px-2 py-1.5 text-xs focus:ring-2 focus:ring-brand-cyan focus:border-brand-cyan"
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
              <div className="bg-[rgba(20,20,30,0.8)] rounded-lg p-3 border border-brand-cyan/30">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-4 h-4 text-brand-cyan" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"/>
                  </svg>
                  <h4 className="text-sm font-medium text-brand-text">Recurrence Patterns</h4>
                </div>
                <label className="block text-xs font-medium text-brand-text mb-1">Recurrence Pattern</label>
                <select
                  className="w-full bg-gray-800/40 text-brand-text border border-white/10 rounded px-2 py-1.5 mb-2 text-xs focus:ring-2 focus:ring-brand-cyan focus:border-brand-cyan"
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
                  <div className="flex items-center gap-2 text-xs text-brand-text">
                    <span>Repeat every</span>
                    <input
                      type="number"
                      min={1}
                      className="w-14 bg-gray-800/40 text-brand-text border border-white/10 rounded px-1.5 py-1 text-xs focus:ring-2 focus:ring-brand-cyan"
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
                        className="w-14 border border-white/10 rounded px-1.5 py-1 text-xs focus:ring-2 focus:ring-purple-500"
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
                      className="w-14 border border-white/10 rounded px-1.5 py-1 text-xs focus:ring-2 focus:ring-purple-500"
                      value={recurrence.interval}
                      onChange={e => setRecurrence({ ...recurrence, interval: Math.max(1, Number(e.target.value)) })}
                    />
                    <span>month(s) on day</span>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      className="w-14 border border-white/10 rounded px-1.5 py-1 text-xs focus:ring-2 focus:ring-purple-500"
                      value={recurrence.dayOfMonth}
                      onChange={e => setRecurrence({ ...recurrence, dayOfMonth: Math.max(1, Math.min(31, Number(e.target.value))) })}
                    />
                  </div>
                )}

                {recurrence.type === "custom" && (
                  <div className="space-y-2">
                    <select
                      className="w-full border border-white/10 rounded px-2 py-1.5 text-xs focus:ring-2 focus:ring-purple-500"
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
                      className="w-full border border-white/10 rounded px-2 py-1.5 text-xs focus:ring-2 focus:ring-purple-500"
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
            <div className="px-4 py-4 bg-[rgba(15,15,25,0.4)]">
              <div className="space-y-3">
                {/* Comments/Notes */}
                <div className="bg-[rgba(20,20,30,0.8)] rounded-lg p-3 border border-brand-cyan/30">
                  <label className="block text-xs font-medium text-brand-text mb-1">Comments / Notes</label>
                  <textarea
                    className="w-full bg-gray-800/40 text-brand-text border border-white/10 rounded px-2 py-1.5 text-xs focus:ring-2 focus:ring-brand-cyan focus:border-brand-cyan placeholder-gray-500"
                    rows={3}
                    value={comments}
                    onChange={e => setComments(e.target.value)}
                    onBlur={triggerAutosave}
                    placeholder="Add discussion notes, updates, or additional context..."
                  />
                  {searchQuery && comments && (
                    <div className="mt-2 text-xs text-gray-400 bg-[rgba(15,15,25,0.6)] p-2 rounded border border-white/10">
                      <span className="font-medium">Preview: </span>
                      <span>{highlightText(comments)}</span>
                    </div>
                  )}
                </div>

                {/* Attachments */}
                <div className="bg-[rgba(20,20,30,0.8)] rounded-lg p-3 border border-brand-cyan/30">
                  <label className="block text-xs font-medium text-brand-text mb-2">Files & Links</label>
                  
                  {/* Existing Attachments */}
                  {attachments.length > 0 && (
                    <div className="space-y-1 mb-3">
                      {attachments.map(att => (
                        <div key={att.id} className="flex items-center gap-2 p-1.5 bg-[rgba(15,15,25,0.6)] rounded">
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
                            className="flex-1 text-xs text-brand-cyan hover:text-brand-cyan-light underline truncate"
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
                        className="text-xs text-brand-text file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border file:border-brand-cyan/30 file:text-xs file:font-medium file:bg-gray-800/40 file:text-brand-cyan hover:file:bg-gray-800/60 file:cursor-pointer"
                      />
                      {uploading && <span className="text-xs text-brand-cyan">Uploading...</span>}
                    </div>

                    {/* Add Link */}
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        className="flex-1 bg-gray-800/40 text-brand-text border border-white/10 rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-brand-cyan placeholder-gray-500" 
                        placeholder="Link URL" 
                        value={newLink} 
                        onChange={e => setNewLink(e.target.value)} 
                      />
                      <input 
                        type="text" 
                        className="flex-1 bg-gray-800/40 text-brand-text border border-white/10 rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-brand-cyan placeholder-gray-500" 
                        placeholder="Link name" 
                        value={newLinkName} 
                        onChange={e => setNewLinkName(e.target.value)} 
                      />
                      <button 
                        type="button" 
                        className="px-3 py-1.5 bg-brand-cyan text-black text-xs rounded-lg hover:bg-brand-cyan-light focus:ring-2 focus:ring-brand-cyan transition-colors disabled:opacity-50 disabled:cursor-not-allowed" 
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
            <div className="px-4 py-4 bg-[rgba(15,15,25,0.6)] space-y-3">
              <ActivityHistory 
                uid={uid}
                entityId={task.id}
                entityType="task"
              />
            </div>
          )}
        </div>

        {/* 🎯 Actions Section */}
        <div className="bg-[rgba(15,15,25,0.6)] p-4 border-t border-white/10">
          <div className="flex flex-wrap gap-2 justify-between">
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                className="px-3 py-1.5 bg-brand-cyan text-black text-sm rounded-lg hover:bg-brand-cyan-light focus:ring-2 focus:ring-brand-cyan font-medium transition-all"
              >
                Save Changes
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="px-3 py-1.5 bg-gray-800/40 text-brand-text text-sm rounded-lg hover:bg-gray-800/60 focus:ring-2 focus:ring-gray-500 border border-white/10 transition-all"
              >
                Cancel
              </button>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setShowBlockerManager(true)}
                className="px-2 py-1.5 bg-red-500/10 text-red-400 border border-red-500/30 text-xs rounded-lg hover:bg-red-500/20 focus:ring-2 focus:ring-red-500 transition-all"
                title="View and manage blockers for this task"
              >
                View Blockers
              </button>
              
              {task.status !== "archived" && onArchive && (
                <button
                  type="button"
                  onClick={onArchive}
                  className="px-2 py-1.5 bg-gray-800/40 text-brand-text border border-white/10 text-xs rounded-lg hover:bg-gray-800/60 focus:ring-2 focus:ring-gray-500 transition-all"
                >
                  Archive
                </button>
              )}
              
              {task.status === "archived" && onUnarchive && (
                <button
                  type="button"
                  onClick={onUnarchive}
                  className="px-2 py-1.5 bg-green-500/10 text-green-400 border border-green-500/30 text-xs rounded-lg hover:bg-green-500/20 focus:ring-2 focus:ring-green-500 transition-all"
                >
                  Unarchive
                </button>
              )}
              
              <button
                type="button"
                onClick={onDelete}
                className="px-2 py-1.5 bg-red-500/10 text-red-400 border border-red-500/30 text-xs rounded-lg hover:bg-red-500/20 focus:ring-2 focus:ring-red-500 transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Modals */}
      {showBlockModal && (
        <div className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-20">
          <form className="bg-[rgba(20,20,30,0.95)] border border-red-500/30 rounded-xl shadow-2xl p-6 text-center max-w-md w-full mx-4" onSubmit={handleBlockSubmit}>
            <div className="mb-4 text-lg text-brand-text font-medium">Reason for blocking this task?</div>
            <textarea
              className="w-full bg-gray-800/40 text-brand-text border border-white/10 rounded-lg px-3 py-2 mb-4 focus:ring-2 focus:ring-red-500 focus:border-red-500 placeholder-gray-500"
              rows={3}
              value={blockReason}
              onChange={e => setBlockReason(e.target.value)}
              placeholder="Why is this task blocked? (required)"
              required
            />
            <div className="flex gap-4 justify-center">
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
              >Block</button>
              <button
                type="button"
                className="px-4 py-2 rounded-lg bg-gray-800/40 text-brand-text border border-white/10 hover:bg-gray-800/60 transition-colors"
                onClick={() => { setShowBlockModal(false); setPendingStatus(null); }}
              >Cancel</button>
            </div>
          </form>
        </div>
      )}
      {showResolveModal && (
        <div className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-20">
          <form className="bg-[rgba(20,20,30,0.95)] border border-green-500/30 rounded-xl shadow-2xl p-6 text-center max-w-md w-full mx-4" onSubmit={handleResolveSubmit}>
            <div className="mb-4 text-lg text-brand-text font-medium">Reason for clearing block?</div>
            <textarea
              className="w-full bg-gray-800/40 text-brand-text border border-white/10 rounded-lg px-3 py-2 mb-4 focus:ring-2 focus:ring-green-500 focus:border-green-500 placeholder-gray-500"
              rows={3}
              value={resolveReason}
              onChange={e => setResolveReason(e.target.value)}
              placeholder="How was this resolved? (required)"
              required
            />
            <div className="flex gap-4 justify-center">
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors"
              >Submit</button>
              <button
                type="button"
                className="px-4 py-2 rounded-lg bg-gray-800/40 text-brand-text border border-white/10 hover:bg-gray-800/60 transition-colors"
                onClick={() => { setShowResolveModal(false); setPendingStatus(null); }}
              >Cancel</button>
            </div>
          </form>
        </div>
      )}
      {showDiscardConfirm && (
        <div className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-10">
          <div className="bg-[rgba(20,20,30,0.95)] border border-white/10 rounded-xl shadow-2xl p-6 text-center max-w-md w-full mx-4">
            <div className="mb-4 text-lg text-brand-text font-medium">Discard changes?</div>
            <div className="flex gap-4 justify-center">
              <button
                className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
                onClick={() => { setShowDiscardConfirm(false); onCancel(); }}
              >Discard</button>
              <button
                className="px-4 py-2 rounded-lg bg-gray-800/40 text-brand-text border border-white/10 hover:bg-gray-800/60 transition-colors"
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
          onClose={() => setShowBlockerManager(false)}
        />
      )}
      <ConfirmModal
        open={confirmAttachmentOpen}
        title="Confirm"
        message={confirmAttachmentMessage}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onCancel={() => setConfirmAttachmentOpen(false)}
        onConfirm={async () => {
          setConfirmAttachmentOpen(false);
          if (confirmAttachmentAction) await confirmAttachmentAction();
          setConfirmAttachmentAction(null);
          // no-op: cleanup handled by clearing action
        }}
      />
    </div>

  );
};
