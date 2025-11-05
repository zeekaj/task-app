// src/components/BlockerManagerModal.tsx
import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { WithId, Blocker } from "../types";
import { resolveBlocker, updateBlocker } from "../services/blockers";
import { BlockerModal } from "./BlockerModal";
import { useAllBlockers } from "../hooks/useBlockers";
import { useTeamMembers } from "../hooks/useTeamMembers";
import { useOrganizationId } from "../hooks/useOrganization";

const ActiveBlockerItem: React.FC<{ uid: string; blocker: WithId<Blocker> }> = ({
  uid,
  blocker,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [reason, setReason] = useState(blocker.reason);
  const [waitingOn, setWaitingOn] = useState(blocker.waitingOn);
  const [expectedDate, setExpectedDate] = useState(
    (blocker.expectedDate as any)?.toDate
      ? (blocker.expectedDate as any).toDate().toISOString().split("T")[0]
      : ""
  );
  const [resolveReason, setResolveReason] = useState("");

  useEffect(() => {
    setReason(blocker.reason);
    setWaitingOn(blocker.waitingOn);
    setExpectedDate(
      (blocker.expectedDate as any)?.toDate
        ? (blocker.expectedDate as any).toDate().toISOString().split("T")[0]
        : ""
    );
  }, [blocker]);

  const saveEdits = async () => {
    try {
      await updateBlocker(uid, blocker.id, {
        reason,
        waitingOn,
        expectedDate: expectedDate ? expectedDate : null,
      });
      setIsEditing(false);
    } catch (error) {
      const { logError } = await import('../utils/logger');
      logError("Error saving blocker:", (error as any)?.message ?? error);
      alert("An error occurred while saving. See console for details.");
    }
  };

  const handleResolve = async () => {
    // ALLOW empty resolution (no validation here)
    await resolveBlocker(uid, blocker, resolveReason, uid);
  };

  const handleClear = async () => {
    await resolveBlocker(uid, blocker, 'Cleared by user', uid);
  };

  if (isEditing) {
    return (
      <li className="p-4 bg-gradient-to-br from-gray-900/95 to-gray-900/90 backdrop-blur-xl border border-white/10 rounded-lg shadow-sm space-y-3">
        <div>
          <label className="block text-xs font-medium text-brand-text mb-1.5">Reason</label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full bg-gray-800/40 text-brand-text border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-brand-cyan focus:border-brand-cyan placeholder-gray-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-brand-text mb-1.5">Waiting On</label>
          <input
            type="text"
            value={waitingOn}
            onChange={(e) => setWaitingOn(e.target.value)}
            className="w-full bg-gray-800/40 text-brand-text border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-brand-cyan focus:border-brand-cyan placeholder-gray-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-brand-text mb-1.5">Expected Clear Date</label>
          <input
            type="date"
            value={expectedDate}
            onChange={(e) => setExpectedDate(e.target.value)}
            className="w-full bg-gray-800/40 text-brand-text border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-brand-cyan focus:border-brand-cyan"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
          <button
            onClick={() => setIsEditing(false)}
            className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-800/40 border border-white/10 rounded-lg hover:bg-gray-800/60 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={saveEdits}
            className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-cyan-600 to-blue-600 rounded-lg hover:from-cyan-500 hover:to-blue-500 shadow-lg shadow-cyan-500/20 transition-all"
          >
            Save
          </button>
        </div>
      </li>
    );
  }

  return (
  <li className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-semibold text-red-200 truncate">{blocker.reason}</p>
          {blocker.waitingOn && (
            <div className="text-sm text-gray-300 mt-1">
              <strong className="text-gray-400">Waiting on:</strong> {blocker.waitingOn}
            </div>
          )}
          {(blocker.expectedDate as any)?.toDate && (
            <div className="text-sm text-gray-300 mt-1">
              <strong className="text-gray-400">Expected by:</strong>{" "}
              {(blocker.expectedDate as any).toDate().toLocaleDateString()}
            </div>
          )}
        </div>
        <div className="flex-shrink-0 flex items-center gap-2">
          <button
            onClick={() => setIsEditing(true)}
            className="px-3 py-1.5 text-sm font-medium text-gray-300 bg-gray-800/40 border border-gray-700 rounded-md hover:bg-gray-800/60"
            title="Edit blocker"
          >
            Edit
          </button>
          <button
            onClick={handleClear}
            className="px-3 py-1.5 text-sm font-medium text-white bg-gradient-to-r from-green-600 to-emerald-600 border border-green-700/50 rounded-md hover:from-green-500 hover:to-emerald-500"
            title="Clear this blocker immediately"
          >
            Clear Blocker
          </button>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-red-500/30">
        <label className="text-sm font-medium text-gray-300">How was this resolved?</label>
        <textarea
          value={resolveReason}
          onChange={(e) => setResolveReason(e.target.value)}
          className="mt-1 block w-full bg-gray-800/40 border border-gray-700 text-white rounded-md py-2 px-3 text-sm min-h-[72px] focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 placeholder-gray-500"
          placeholder="Optional"
        />
        <div className="text-right mt-2">
          <button
            onClick={handleResolve}
            className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-green-600 to-emerald-600 border border-transparent rounded-md hover:from-green-500 hover:to-emerald-500 shadow-lg shadow-green-500/20"
            title="Mark as resolved"
          >
            Mark as Resolved
          </button>
        </div>
      </div>
    </li>
  );
};


// Props: add allTasks and support grouped view for project-level modal
export const BlockerManagerModal: React.FC<{
  uid: string;
  entity: { id: string; title: string; type: "task" | "project"; showAll?: boolean };
  allTasks?: any[];
  onClose: () => void;
}> = ({ uid, entity, allTasks = [], onClose }) => {
  const allBlockers = useAllBlockers(uid);
  const safeBlockers = React.useMemo(() => (Array.isArray(allBlockers) ? allBlockers : []), [allBlockers]);
  const [showBlockerModal, setShowBlockerModal] = useState(false);
  const [bulkResolveNote, setBulkResolveNote] = useState("");
  
  const { orgId } = useOrganizationId();
  const teamMembers = useTeamMembers(orgId || "");
  
  // Helper to get user display name
  const getUserName = (userId: string | undefined) => {
    if (!userId || !teamMembers) return null;
    const member = teamMembers.find((m) => m.userId === userId);
    return member?.name || null;
  };

  // If showAll, group blockers by project and by each task in the project
  const isGrouped = !!entity.showAll;

  // Project-level blockers
  const projectBlockers = useMemo(
    () => safeBlockers.filter((b) => b && b.entityId === entity.id),
    [safeBlockers, entity.id]
  );

  // Task-level blockers (for all tasks in this project)
  const taskBlockersByTask: Record<string, WithId<Blocker>[]> = useMemo(() => {
    if (!isGrouped || !allTasks) return {};
    const map: Record<string, WithId<Blocker>[]> = {};
    allTasks.forEach((task: any) => {
      map[task.id] = safeBlockers.filter((b) => b.entityId === task.id);
    });
    return map;
  }, [isGrouped, allTasks, safeBlockers]);

  // For non-grouped (single entity) mode
  const entityBlockers = useMemo(
    () => safeBlockers.filter((b) => b && b.entityId === entity.id),
    [safeBlockers, entity.id]
  );
  const activeBlockers = isGrouped
    ? projectBlockers.filter((b) => b.status === "active")
    : entityBlockers.filter((b) => b.status === "active");
  // removed unused clearedBlockers

  const handleResolveAll = async () => {
    // Allow empty note
    for (const b of activeBlockers) {
      await resolveBlocker(uid, b, bulkResolveNote);
    }
    setBulkResolveNote("");
  };

  const modalContent = (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60]" onClick={onClose}>
      <div className="bg-[rgba(20,20,30,0.95)] backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl shadow-black/50 p-6 w-full max-w-2xl relative" onClick={(e) => e.stopPropagation()}>
        {/* Close X button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white p-2 rounded-lg hover:bg-white/10 focus:outline-none z-10 transition-colors"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <h2 className="text-2xl font-bold text-white mb-1">Manage Blockers</h2>
        <p className="text-sm text-gray-400 mb-6 border-b border-white/10 pb-3">
          For {entity.type}: <span className="font-semibold text-cyan-400">{entity.title}</span>
        </p>

        <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
          {/* Project-level blockers */}
          <div>
            <div className="flex items-end justify-between mb-2">
              <h3 className="text-lg font-semibold text-red-400">
                {entity.type === "project" ? "Project Blockers" : "Task Blockers"}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowBlockerModal(true)}
                  className="px-3 py-1.5 text-sm font-medium text-white rounded-md bg-red-600 hover:bg-red-700"
                  title="Add another blocker"
                >
                  Add Blocker
                </button>
                {activeBlockers.length > 1 && (
                  <>
                    <input
                      value={bulkResolveNote}
                      onChange={(e) => setBulkResolveNote(e.target.value)}
                      placeholder="Optional shared note"
                      className="w-64 text-sm border border-gray-700 bg-gray-800 text-gray-100 rounded-md py-1.5 px-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={handleResolveAll}
                      className="px-3 py-1.5 text-sm font-medium text-white rounded-md bg-green-600 hover:bg-green-700"
                      title="Resolve all active blockers"
                    >
                      Resolve All
                    </button>
                  </>
                )}
              </div>
            </div>

            {projectBlockers.filter((b) => b.status === "active").length > 0 ? (
              <ul className="space-y-3">
                {projectBlockers.filter((b) => b.status === "active").map((b) => (
                  <ActiveBlockerItem key={b.id} uid={uid} blocker={b} />
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">
                No active {entity.type === "project" ? "project" : "task"} blockers.
              </p>
            )}
          </div>

          {/* Task-level blockers, grouped by task */}
          {isGrouped && allTasks && (
            <div>
              <h3 className="text-lg font-semibold text-red-400 mt-6 mb-2">Task Blockers</h3>
              {allTasks.length > 0 ? (
                <ul className="space-y-4">
                  {allTasks.map((task: any) => {
                    const blockers = taskBlockersByTask[task.id]?.filter((b) => b.status === "active") || [];
                    if (blockers.length === 0) return null;
                    return (
                      <li key={task.id} className="bg-gray-800/40 border border-gray-700 rounded-lg p-3">
                        <div className="font-semibold text-cyan-300 mb-1">Task: {typeof task.title === 'string' ? task.title : String(task.title)}</div>
                        <ul className="space-y-2">
                          {blockers.map((b) => (
                            <ActiveBlockerItem key={b.id} uid={uid} blocker={b} />
                          ))}
                        </ul>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">No tasks in this project.</p>
              )}
            </div>
          )}

          {/* Cleared project blockers */}
          <div>
            <h3 className="text-lg font-semibold text-gray-400 mb-2">
              Cleared {entity.type === "project" ? "Project" : "Task"} Blockers
            </h3>
            {projectBlockers.filter((b) => b.status === "cleared").length > 0 ? (
              <ul className="space-y-2">
                {projectBlockers.filter((b) => b.status === "cleared").map((b) => {
                  const clearedByName = getUserName(b.clearedBy);
                  return (
                    <li key={b.id} className="p-3 bg-emerald-900/20 border border-emerald-500/30 rounded-lg text-sm">
                      <p className="text-gray-400 line-through">{b.reason}</p>
                      {b.clearedReason && (
                        <p className="mt-1 text-emerald-300">
                          <span className="font-semibold">Resolved:</span> {b.clearedReason}
                        </p>
                      )}
                      {(b as any).clearedAt?.toDate && (
                        <p className="text-xs text-gray-500 text-right">
                          Cleared on {(b as any).clearedAt.toDate().toLocaleDateString()}
                          {clearedByName && ` by ${clearedByName}`}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">
                No cleared {entity.type === "project" ? "project" : "task"} blockers.
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-white/10 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-800/40 border border-gray-700 rounded-lg hover:bg-gray-800/60 hover:text-white transition-colors"
          >
            Close
          </button>
        </div>

        {showBlockerModal && (
          <BlockerModal
            uid={uid}
            entity={{ id: entity.id, title: entity.title, type: 'project' }}
            onClose={() => setShowBlockerModal(false)}
          />
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
