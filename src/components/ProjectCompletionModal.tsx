// src/components/ProjectCompletionModal.tsx
import { useState } from 'react';
import { Modal } from './shared/Modal';

interface ProjectCompletionModalProps {
  open: boolean;
  projectTitle: string;
  onClose: () => void;
  onConfirm: () => void;
}

export function ProjectCompletionModal({ open, projectTitle, onClose, onConfirm }: ProjectCompletionModalProps) {
  const [postEventReport, setPostEventReport] = useState(false);
  const [documentsOrganized, setDocumentsOrganized] = useState(false);
  const [orderInvoiced, setOrderInvoiced] = useState(false);

  const allChecked = postEventReport && documentsOrganized && orderInvoiced;

  const handleConfirm = () => {
    if (allChecked) {
      onConfirm();
      // Reset checkboxes
      setPostEventReport(false);
      setDocumentsOrganized(false);
      setOrderInvoiced(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Mark Project as Complete" widthClass="max-w-md">
      <div className="space-y-4">
        <p className="text-gray-300 text-sm">
          Please confirm that all completion requirements have been met for <span className="font-semibold text-white">{projectTitle}</span>:
        </p>

        <div className="space-y-3">
          <label className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={postEventReport}
              onChange={(e) => setPostEventReport(e.target.checked)}
              className="mt-1 w-4 h-4 rounded border-gray-600 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-0 bg-gray-700"
            />
            <div className="flex-1">
              <div className="text-white font-medium">Post-Event Report Completed</div>
              <div className="text-xs text-gray-400 mt-1">All post-event documentation has been finalized</div>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={documentsOrganized}
              onChange={(e) => setDocumentsOrganized(e.target.checked)}
              className="mt-1 w-4 h-4 rounded border-gray-600 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-0 bg-gray-700"
            />
            <div className="flex-1">
              <div className="text-white font-medium">Documents Organized</div>
              <div className="text-xs text-gray-400 mt-1">All project files have been organized and archived</div>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={orderInvoiced}
              onChange={(e) => setOrderInvoiced(e.target.checked)}
              className="mt-1 w-4 h-4 rounded border-gray-600 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-0 bg-gray-700"
            />
            <div className="flex-1">
              <div className="text-white font-medium">Order Invoiced</div>
              <div className="text-xs text-gray-400 mt-1">All orders have been invoiced and sent to client</div>
            </div>
          </label>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-300 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!allChecked}
            className={`px-4 py-2 text-sm rounded-lg font-medium transition-all ${
              allChecked
                ? 'bg-green-500 hover:bg-green-600 text-white'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
          >
            Mark as Complete
          </button>
        </div>
      </div>
    </Modal>
  );
}
