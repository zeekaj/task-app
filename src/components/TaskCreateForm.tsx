import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import type { WithId, Project } from "../types";
import { createTask } from "../services/tasks";
import { logError } from "../utils/logger";
import { useTeamMembers } from "../hooks/useTeamMembers";
import { useRoleBasedTasks } from "../hooks/useRoleBasedTasks";
import { useClickOutside } from "../hooks/useClickOutside";
import { useUserContext } from "../hooks/useUserContext";
import { generateAssigneeSuggestions, type AssigneeSuggestion } from "../utils/assigneeSuggestions";
import { DatePicker } from "./ui/DatePicker";

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
  const { teamMemberId } = useUserContext();
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
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
  const allTasks = useRoleBasedTasks(uid);
  
  // Generate suggestions
  const suggestions: AssigneeSuggestion[] = React.useMemo(() => {
    if (!allTasks || !teamMembers) return [];
    
    return generateAssigneeSuggestions({
      taskTitle: title,
      taskDescription: '',
      projectId: proj || null,
      allTasks,
      allTeamMembers: teamMembers,
      allProjects,
    });
  }, [title, proj, allTasks, teamMembers, allProjects]);
  
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
    // Map to app brand scheme: slate → blue → cyan → indigo → violet → red
    if (value === 0) return "#9ca3af"; // slate-400
    if (value <= 20) return "#60a5fa"; // blue-400
    if (value <= 40) return "#00D0FF"; // brand.cyan
    if (value <= 60) return "#6366f1"; // indigo-500
    if (value <= 80) return "#A38BFF"; // brand.violet
    return "#ef4444"; // red-500
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
          description: undefined,
          priority,
          dueDate: dueDate || null,
          assignee: assignee || undefined,
        },
        teamMemberId || undefined // Pass the creator's team member ID
      );
      setTitle("");
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
    <form onSubmit={handleSubmit} className="border border-white/10 rounded-xl p-4 bg-[rgba(15,15,25,0.6)] backdrop-blur-sm shadow-sm space-y-3">
      <div className="flex items-center gap-2">
        <input
          ref={titleInputRef}
          className="flex-1 bg-gray-800/40 text-brand-text border border-white/10 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-cyan focus:border-brand-cyan placeholder-gray-500"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="New task title"
        />
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 rounded-lg bg-brand-cyan text-black font-medium hover:bg-brand-cyan/90 disabled:opacity-60 transition-colors"
          title="Add task"
        >
          {saving ? "Adding…" : "Add"}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col text-sm">
          <span className="mb-1 text-brand-text">Priority: {getPriorityLabel(priority)} ({priority})</span>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="0"
              max="100"
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value))}
              className="flex-1 h-2 rounded-lg appearance-none cursor-pointer"
              style={{
                // Brand-aligned gradient: slate → blue → cyan → indigo → violet → red
                background: `linear-gradient(to right, 
                  #64748b 0%, 
                  #60a5fa 20%, 
                  #00D0FF 40%, 
                  #6366f1 60%, 
                  #A38BFF 80%, 
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
          <span className="mb-1 text-brand-text">Assignee</span>
          <button
            ref={assigneeButtonRef}
            type="button"
            className="bg-gray-800/40 text-brand-text border border-white/10 rounded-lg px-3 py-2 text-left flex items-center justify-between hover:bg-gray-800/60 transition-colors focus:ring-2 focus:ring-brand-cyan"
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
              className="fixed bg-gray-800/95 border border-brand-cyan/50 rounded-lg shadow-xl py-1 z-[9999] min-w-[280px] max-h-[400px] overflow-y-auto backdrop-blur-xl"
              style={{ 
                top: assigneeDropdownPos ? `${assigneeDropdownPos.top}px` : '0px',
                left: assigneeDropdownPos ? `${assigneeDropdownPos.left}px` : '0px'
              }}
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
                      onClick={() => {
                        setAssignee(suggestion.memberName);
                        setShowAssigneeDropdown(false);
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
                  className={`w-full px-3 py-2 text-left hover:bg-brand-cyan/10 flex items-center justify-between text-sm text-brand-text ${
                    assignee === member.name ? 'bg-brand-cyan/20' : ''
                  }`}
                  onClick={() => {
                    setAssignee(member.name);
                    setShowAssigneeDropdown(false);
                  }}
                >
                  <span>{member.name}</span>
                  {member.title && <span className="text-xs text-brand-text/60">({member.title})</span>}
                </button>
              ))}
            </div>,
            document.body
          )}
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col text-sm">
          <DatePicker
            value={dueDate ? dueDate.substring(0, 10) : ""}
            onChange={setDueDate}
            label="Due Date"
            className="w-full"
          />
        </div>

        <label className="flex flex-col text-sm">
          <span className="mb-1 text-brand-text">Project</span>
          <select
            className="bg-gray-800/40 text-brand-text border border-white/10 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-cyan focus:border-brand-cyan"
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

      {error && <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</div>}
    </form>
  );
};
