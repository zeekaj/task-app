import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import type { WithId, Project } from "../types";
import { createTask } from "../services/tasks";
import { logError } from "../utils/logger";
import { useTeamMembers } from "../hooks/useTeamMembers";
import { useTasks } from "../hooks/useTasks";
import { useClickOutside } from "../hooks/useClickOutside";
import { generateAssigneeSuggestions, type AssigneeSuggestion } from "../utils/assigneeSuggestions";

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
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<number>(50); // Default to medium (50)
  const [dueDate, setDueDate] = useState<string>("");
  const [proj, setProj] = useState<string | "">(projectId ?? "");
  const [assignee, setAssignee] = useState<string>(""); // New assignee state
  
  // Assignee dropdown state
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const assigneeButtonRef = useRef<HTMLButtonElement>(null);
  const [assigneeDropdownPos, setAssigneeDropdownPos] = useState<{ top: number; left: number } | null>(null);
  
  // Fetch team members and tasks for suggestions
  const teamMembers = useTeamMembers(uid);
  const allTasks = useTasks(uid);
  
  // Generate suggestions
  const suggestions: AssigneeSuggestion[] = React.useMemo(() => {
    if (!allTasks || !teamMembers) return [];
    
    return generateAssigneeSuggestions({
      taskTitle: title,
      taskDescription: description,
      projectId: proj || null,
      allTasks,
      allTeamMembers: teamMembers,
      allProjects,
    });
  }, [title, description, proj, allTasks, teamMembers, allProjects]);
  
  // Position dropdown
  useEffect(() => {
    if (showAssigneeDropdown && assigneeButtonRef.current) {
      const rect = assigneeButtonRef.current.getBoundingClientRect();
      setAssigneeDropdownPos({ top: rect.bottom + 4, left: rect.left });
    } else {
      setAssigneeDropdownPos(null);
    }
  }, [showAssigneeDropdown]);
  
  // Close dropdown on click outside
  useClickOutside({
    enabled: showAssigneeDropdown,
    selector: `[data-create-assignee-dropdown]`,
    onClickOutside: () => {
      setShowAssigneeDropdown(false);
    },
  });

  useEffect(() => {
    titleInputRef.current?.focus();
  }, []);

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
          ref={titleInputRef}
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
          <button
            ref={assigneeButtonRef}
            type="button"
            className="border rounded-md px-3 py-2 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
            onClick={() => setShowAssigneeDropdown(!showAssigneeDropdown)}
          >
            <span className="truncate">{assignee || '— Unassigned —'}</span>
            <svg className="w-4 h-4 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {/* Assignee Dropdown with Suggestions */}
          {showAssigneeDropdown && createPortal(
            <div
              data-create-assignee-dropdown
              className="fixed bg-white border border-gray-300 rounded-lg shadow-xl py-1 z-[9999] min-w-[280px] max-h-[400px] overflow-y-auto"
              style={{ 
                top: assigneeDropdownPos ? `${assigneeDropdownPos.top}px` : '0px',
                left: assigneeDropdownPos ? `${assigneeDropdownPos.left}px` : '0px'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Suggestions Section */}
              {suggestions.length > 0 && (
                <>
                  <div className="px-3 py-1.5 text-xs font-semibold text-cyan-600 uppercase tracking-wide flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    Suggested
                  </div>
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion.memberId}
                      type="button"
                      className="w-full px-3 py-2 text-left hover:bg-cyan-50 flex flex-col gap-1 border-l-2 border-cyan-500"
                      onClick={() => {
                        setAssignee(suggestion.memberName);
                        setShowAssigneeDropdown(false);
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900">{suggestion.memberName}</span>
                        <span className="text-xs px-1.5 py-0.5 rounded bg-cyan-100 text-cyan-700 font-semibold">
                          {suggestion.confidence}%
                        </span>
                      </div>
                      <span className="text-xs text-gray-600">{suggestion.primaryReason}</span>
                    </button>
                  ))}
                  <div className="border-t border-gray-200 my-1"></div>
                </>
              )}
              
              {/* All Team Members */}
              <button
                type="button"
                className="w-full px-3 py-2 text-left hover:bg-gray-50 text-sm text-gray-600"
                onClick={() => {
                  setAssignee("");
                  setShowAssigneeDropdown(false);
                }}
              >
                — Unassigned —
              </button>
              {teamMembers?.filter(m => m.active).map((member) => (
                <button
                  key={member.id}
                  type="button"
                  className={`w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center justify-between text-sm ${
                    assignee === member.name ? 'bg-cyan-50' : ''
                  }`}
                  onClick={() => {
                    setAssignee(member.name);
                    setShowAssigneeDropdown(false);
                  }}
                >
                  <span>{member.name}</span>
                  {member.title && <span className="text-xs text-gray-500">({member.title})</span>}
                </button>
              ))}
            </div>,
            document.body
          )}
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
