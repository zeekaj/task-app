// src/components/ShiftEditModal.tsx
import { useState, useEffect } from 'react';
import { Modal } from './shared/Modal';
import { useTeamMembers } from '../hooks/useTeamMembers';
import { useMaybeProjects } from '../hooks/useMaybeProjects';
import type { Shift, ShiftStatus, JobTitle } from '../types';
import { createShift, updateShift } from '../services/shifts';

interface ShiftEditModalProps {
  uid: string;
  shift?: Shift & { id: string }; // If editing existing shift
  defaultProjectId?: string;
  defaultDate?: string; // YYYY-MM-DD
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const JOB_TITLES: JobTitle[] = ["A1", "A2", "V1", "V2", "LD", "ME", "TD", "Stagehand", "Show Producer", "vMix Op"];
const SHIFT_STATUSES: ShiftStatus[] = ["draft", "offered", "confirmed", "declined", "completed", "canceled"];

export function ShiftEditModal({ uid, shift, defaultProjectId, defaultDate, isOpen, onClose, onSuccess }: ShiftEditModalProps) {
  const teamMembers = useTeamMembers(uid);
  const projects = useMaybeProjects(uid);
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [title, setTitle] = useState('');
  const [projectId, setProjectId] = useState<string>('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [location, setLocation] = useState('');
  const [assignedMemberId, setAssignedMemberId] = useState('');
  const [jobTitle, setJobTitle] = useState<JobTitle | ''>('');
  const [estimatedHours, setEstimatedHours] = useState('');
  const [status, setStatus] = useState<ShiftStatus>('draft');
  const [notes, setNotes] = useState('');
  const [instructions, setInstructions] = useState('');
  const [callTime, setCallTime] = useState('');

  // Initialize form with shift data or defaults
  useEffect(() => {
    if (shift) {
      setTitle(shift.title || '');
      setProjectId(shift.projectId || '');
      setDate(shift.date || '');
      setStartTime(shift.startTime || '09:00');
      setEndTime(shift.endTime || '17:00');
      setLocation(shift.location || '');
      setAssignedMemberId(shift.assignedMemberId || '');
      setJobTitle(shift.jobTitle || '');
      setEstimatedHours(shift.estimatedHours?.toString() || '');
      setStatus(shift.status || 'draft');
      setNotes(shift.notes || '');
      setInstructions(shift.instructions || '');
      setCallTime(shift.callTime || '');
    } else {
      // Defaults for new shift
      setTitle('');
      setProjectId(defaultProjectId || '');
      setDate(defaultDate || new Date().toISOString().split('T')[0]);
      setStartTime('09:00');
      setEndTime('17:00');
      setLocation('');
      setAssignedMemberId('');
      setJobTitle('');
      setEstimatedHours('8');
      setStatus('draft');
      setNotes('');
      setInstructions('');
      setCallTime('');
    }
    setError(null);
  }, [shift, defaultProjectId, defaultDate, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    if (!date) {
      setError('Date is required');
      return;
    }
    if (!startTime || !endTime) {
      setError('Start and end times are required');
      return;
    }
    
    setSaving(true);
    setError(null);
    
    try {
      const shiftData: Omit<Shift, 'id' | 'organizationId' | 'createdBy' | 'createdAt' | 'updatedAt'> = {
        title: title.trim(),
        projectId: projectId || null,
        taskId: null,
        date,
        startTime,
        endTime,
        location: location || undefined,
        assignedMemberId: assignedMemberId || undefined,
        jobTitle: jobTitle || undefined,
        estimatedHours: estimatedHours ? parseFloat(estimatedHours) : undefined,
        status,
        notes: notes || undefined,
        instructions: instructions || undefined,
        callTime: callTime || undefined,
      };
      
      if (shift?.id) {
        await updateShift(uid, shift.id, shiftData);
      } else {
        await createShift(uid, uid, shiftData);
      }
      
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save shift');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={isOpen} onClose={onClose} title={shift ? 'Edit Shift' : 'Create Shift'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-200 text-sm">
            {error}
          </div>
        )}
        
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Title <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
            placeholder="e.g., Load-in Crew, Event Tech"
          />
        </div>
        
        {/* Project */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Project (Optional)
          </label>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
          >
            <option value="">No project</option>
            {projects?.filter(p => p.status !== 'archived').map(p => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
        </div>
        
        {/* Date, Start Time, End Time */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Date <span className="text-red-400">*</span>
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Start Time <span className="text-red-400">*</span>
            </label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              End Time <span className="text-red-400">*</span>
            </label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>
        
        {/* Call Time (optional earlier arrival) */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Call Time (Optional - if different from start)
          </label>
          <input
            type="time"
            value={callTime}
            onChange={(e) => setCallTime(e.target.value)}
            className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
            placeholder="Leave blank if same as start time"
          />
        </div>
        
        {/* Location */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Location
          </label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
            placeholder="Venue or site address"
          />
        </div>
        
        {/* Assigned Member */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Assigned Team Member
          </label>
          <select
            value={assignedMemberId}
            onChange={(e) => setAssignedMemberId(e.target.value)}
            className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
          >
            <option value="">Unassigned</option>
            {teamMembers?.filter(m => m.active).map(m => (
              <option key={m.id} value={m.id}>
                {m.name} {m.title ? `- ${m.title}` : ''}
              </option>
            ))}
          </select>
        </div>
        
        {/* Job Title */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Required Job Title
          </label>
          <select
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value as JobTitle)}
            className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
          >
            <option value="">Any</option>
            {JOB_TITLES.map(jt => (
              <option key={jt} value={jt}>{jt}</option>
            ))}
          </select>
        </div>
        
        {/* Estimated Hours */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Estimated Hours
          </label>
          <input
            type="number"
            step="0.5"
            value={estimatedHours}
            onChange={(e) => setEstimatedHours(e.target.value)}
            className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
            placeholder="8"
          />
        </div>
        
        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as ShiftStatus)}
            className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
          >
            {SHIFT_STATUSES.map(s => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>
        
        {/* Instructions */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Instructions (for assigned member)
          </label>
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
            placeholder="Special instructions, parking info, contact details..."
          />
        </div>
        
        {/* Notes (internal) */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Internal Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
            placeholder="Internal notes visible only to admins..."
          />
        </div>
        
        {/* Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-700">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white rounded-lg font-medium transition-all disabled:opacity-50"
          >
            {saving ? 'Saving...' : shift ? 'Update Shift' : 'Create Shift'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
