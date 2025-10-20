// src/components/BlockerManagerModal.tsx
import React, { useEffect, useMemo, useState } from "react";
import type { WithId, Blocker } from "../types";
import { resolveBlocker, updateBlocker } from "../services/blockers";
import { BlockerModal } from "./BlockerModal";
import { useAllBlockers } from "../hooks/useBlockers";

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
    await resolveBlocker(uid, blocker, resolveReason);
  };

  const handleClear = async () => {
    await resolveBlocker(uid, blocker, 'Cleared by user');
  };

  if (isEditing) {
    return (
      <li className="p-4 bg-blue-100 border border-blue-200 rounded-lg shadow-sm space-y-3">
        <div>
          <label className="text-sm font-medium text-gray-700">Reason</label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="mt-1 block w-full border-gray-300 rounded-md py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Waiting On</label>
          <input
            type="text"
            value={waitingOn}
            onChange={(e) => setWaitingOn(e.target.value)}
            className="mt-1 block w-full border-gray-300 rounded-md py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Expected Date</label>
          <input
            type="date"
            value={expectedDate}
            onChange={(e) => setExpectedDate(e.target.value)}
            className="mt-1 block border-gray-300 rounded-md py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            onClick={() => setIsEditing(false)}
            className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={saveEdits}
            className="px-3 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
          >
            Save
          </button>
        </div>
      </li>
    );
  }

  return (
  <li className="p-4 bg-red-50 border border-red-200 rounded-lg shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-semibold text-red-800 truncate">{blocker.reason}</p>
          {blocker.waitingOn && (
            <div>
              <strong>Waiting on:</strong> {blocker.waitingOn}
            </div>
          )}
          {(blocker.expectedDate as any)?.toDate && (
            <div>
              <strong>Expected by:</strong>{" "}
              {(blocker.expectedDate as any).toDate().toLocaleDateString()}
            </div>
          )}
        </div>
        <div className="flex-shrink-0 flex items-center gap-2">
          <button
            onClick={() => setIsEditing(true)}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            title="Edit blocker"
          >
            Edit
          </button>
          <button
            onClick={handleClear}
            className="px-3 py-1.5 text-sm font-medium text-white bg-green-600 border border-green-700 rounded-md hover:bg-green-700"
            title="Clear this blocker immediately"
          >
            Clear Blocker
          </button>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-red-200">
        <label className="text-sm font-medium text-gray-700">How was this resolved?</label>
        <textarea
          value={resolveReason}
          onChange={(e) => setResolveReason(e.target.value)}
          className="mt-1 block w-full border border-gray-300 rounded-md py-2 px-3 text-sm min-h-[72px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Optional"
        />
        <div className="text-right mt-2">
          <button
            onClick={handleResolve}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700"
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-gray-50 rounded-lg shadow-xl p-6 w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-1">Manage Blockers</h2>
        <p className="text-sm text-gray-600 mb-6 border-b pb-3">
          For {entity.type}: <span className="font-semibold">{entity.title}</span>
        </p>

        <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
          {/* Project-level blockers */}
          <div>
            <div className="flex items-end justify-between mb-2">
              <h3 className="text-lg font-semibold text-red-800">Project Blockers</h3>
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
                      className="w-64 text-sm border border-gray-300 rounded-md py-1.5 px-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <p className="text-sm text-gray-500">No active project blockers.</p>
            )}
          </div>

          {/* Task-level blockers, grouped by task */}
          {isGrouped && allTasks && (
            <div>
              <h3 className="text-lg font-semibold text-red-800 mt-6 mb-2">Task Blockers</h3>
              {allTasks.length > 0 ? (
                <ul className="space-y-4">
                  {allTasks.map((task: any) => {
                    const blockers = taskBlockersByTask[task.id]?.filter((b) => b.status === "active") || [];
                    if (blockers.length === 0) return null;
                    return (
                      <li key={task.id} className="bg-white border border-gray-200 rounded-lg p-3">
                        <div className="font-semibold text-gray-800 mb-1">Task: {typeof task.title === 'string' ? task.title : String(task.title)}</div>
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
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Cleared Project Blockers</h3>
            {projectBlockers.filter((b) => b.status === "cleared").length > 0 ? (
              <ul className="space-y-2">
                {projectBlockers.filter((b) => b.status === "cleared").map((b) => (
                  <li key={b.id} className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm">
                    <p className="text-gray-500 line-through">{b.reason}</p>
                    {b.clearedReason && (
                      <p className="mt-1 text-green-800">
                        <span className="font-semibold">Resolved:</span> {b.clearedReason}
                      </p>
                    )}
                    {(b as any).clearedAt?.toDate && (
                      <p className="text-xs text-gray-400 text-right">
                        Cleared on {(b as any).clearedAt.toDate().toLocaleDateString()}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">No cleared project blockers.</p>
            )}
          </div>
        </div>

        <div className="mt-6 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
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
};
