// src/components/BlockerModal.tsx
import React, { useState } from "react";
import { createPortal } from "react-dom";
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim() || isSubmitting) return;
    
    try {
      setIsSubmitting(true);
      await createBlocker(
        uid,
        { id: entity.id, type: entity.type },
        { reason: reason.trim(), waitingOn: waitingOn.trim(), expectedDate }
      );
      onClose();
    } catch (error) {
      console.error('Error creating blocker:', error);
      setIsSubmitting(false);
      // Still close on error to avoid stuck modal, but log the error
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60]" onClick={onClose}>
      <div 
        className="bg-gradient-to-br from-gray-900/95 to-gray-900/90 backdrop-blur-xl rounded-xl shadow-2xl border border-white/10 p-6 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-white mb-1">Add Blocker</h2>
            <p className="text-sm text-gray-400">
              For {entity.type}: <span className="font-medium text-brand-cyan">{entity.title}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="space-y-4">
          <div>
            <label htmlFor="reason" className="block text-xs font-medium text-brand-text mb-1.5">
              Reason <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-gray-800/40 text-brand-text border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-brand-cyan focus:border-brand-cyan placeholder-gray-500"
              placeholder="e.g., Waiting for client approval"
              autoFocus
              required
            />
          </div>
          
          <div>
            <label htmlFor="waitingOn" className="block text-xs font-medium text-brand-text mb-1.5">
              Waiting On
            </label>
            <input
              type="text"
              id="waitingOn"
              value={waitingOn}
              onChange={(e) => setWaitingOn(e.target.value)}
              className="w-full bg-gray-800/40 text-brand-text border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-brand-cyan focus:border-brand-cyan placeholder-gray-500"
              placeholder="e.g., John from marketing"
            />
          </div>
          
          <div>
            <label htmlFor="expectedDate" className="block text-xs font-medium text-brand-text mb-1.5">
              Expected Clear Date
            </label>
            <input
              type="date"
              id="expectedDate"
              value={expectedDate}
              onChange={(e) => setExpectedDate(e.target.value)}
              className="w-full bg-gray-800/40 text-brand-text border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-brand-cyan focus:border-brand-cyan"
            />
          </div>

          <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-800/40 border border-white/10 rounded-lg hover:bg-gray-800/60 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !reason.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-red-600 to-red-700 rounded-lg hover:from-red-500 hover:to-red-600 shadow-lg shadow-red-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Adding...' : 'Add Blocker'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
