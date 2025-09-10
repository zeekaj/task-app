// src/components/BlockerModal.tsx
import React, { useState } from "react";
import { createBlocker } from "../services/blockers";
import type { BlockerEntityType } from "../types";

export const BlockerModal: React.FC<{
  uid: string;
  entity: { id: string; title: string; type: BlockerEntityType };
  onClose: () => void;
}> = ({ uid, entity, onClose }) => {
  const [reason, setReason] = useState("");
  const [waitingOn, setWaitingOn] = useState("");
  const [expectedDate, setExpectedDate] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;
    await createBlocker(
      uid,
      { id: entity.id, type: entity.type },
      { reason: reason.trim(), waitingOn: waitingOn.trim(), expectedDate }
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold mb-1">Add Blocker</h2>
        <p className="text-sm text-gray-600 mb-4">
          For {entity.type}: <span className="font-semibold">{entity.title}</span>
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="reason" className="block text-sm font-medium text-gray-700">
              Reason
            </label>
            <input
              type="text"
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              autoFocus
              required
            />
          </div>
          <div>
            <label htmlFor="waitingOn" className="block text-sm font-medium text-gray-700">
              Waiting On (Optional)
            </label>
            <input
              type="text"
              id="waitingOn"
              value={waitingOn}
              onChange={(e) => setWaitingOn(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label htmlFor="expectedDate" className="block text-sm font-medium text-gray-700">
              Expected Clear Date (Optional)
            </label>
            <input
              type="date"
              id="expectedDate"
              value={expectedDate}
              onChange={(e) => setExpectedDate(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
            >
              Add Blocker
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
