// src/components/ProjectShiftModal.tsx
import { useState, useEffect } from 'react';
import { Modal } from './shared/Modal';
import { useTeamMembers } from '../hooks/useTeamMembers';
import { useMaybeProjects } from '../hooks/useMaybeProjects';
import type { Shift, ShiftStatus, JobTitle } from '../types';
import { createShift, updateShift } from '../services/shifts';

interface ProjectShiftModalProps {
  uid: string;
  shift?: Shift & { id: string }; // If editing existing shift
  defaultProjectId?: string;
  defaultDate?: string; // YYYY-MM-DD
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const JOB_TITLES: JobTitle[] = ["A1", "A2", "V1", "V2", "LD", "ME", "TD", "Stagehand", "Show Producer", "vMix Op"];

export function ProjectShiftModal({ uid, shift, defaultProjectId, defaultDate, isOpen, onClose, onSuccess }: ProjectShiftModalProps) {
  const teamMembers = useTeamMembers(uid) || [];
  const projects = useMaybeProjects(uid);
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [published, setPublished] = useState(false);
  
  // Form state
  const [projectId, setProjectId] = useState<string>('');
  const [date, setDate] = useState('');
  const [callTime, setCallTime] = useState('');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('17:00');
  const [breakMinutes, setBreakMinutes] = useState('60');
  const [location, setLocation] = useState('');
  const [position, setPosition] = useState<JobTitle | ''>('');
  const [assignedMemberIds, setAssignedMemberIds] = useState<string[]>([]);
  const [instructions, setInstructions] = useState('');
  const [notes, setNotes] = useState('');

  // Initialize form with shift data or defaults
  useEffect(() => {
    if (shift) {
      setProjectId(shift.projectId || '');
      setDate(shift.date || '');
      setCallTime(shift.callTime || '');
      setStartTime(shift.startTime || '08:00');
      setEndTime(shift.endTime || '17:00');
      setBreakMinutes(shift.breaks?.[0] ? '60' : '0');
      setLocation(shift.location || '');
      setPosition(shift.jobTitle || '');
      setAssignedMemberIds(shift.assignedMemberId ? [shift.assignedMemberId] : []);
      setInstructions(shift.instructions || '');
      setNotes(shift.notes || '');
      setPublished(shift.status === 'offered' || shift.status === 'confirmed');
    } else {
      // Defaults for new shift
      setProjectId(defaultProjectId || '');
      setDate(defaultDate || new Date().toISOString().split('T')[0]);
      setCallTime('');
      setStartTime('08:00');
      setEndTime('17:00');
      setBreakMinutes('60');
      setLocation('');
      setPosition('');
      setAssignedMemberIds([]);
      setInstructions('');
      setNotes('');
      setPublished(false);
    }
    setError(null);
  }, [shift, defaultProjectId, defaultDate, isOpen]);

  const formatDateDisplay = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return new Intl.DateTimeFormat('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    }).format(d);
  };

  const toggleMemberAssignment = (memberId: string) => {
    setAssignedMemberIds(prev => 
      prev.includes(memberId) 
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const selectedProject = projects.find(p => p.id === projectId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!projectId) {
      setError('Project is required');
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
      const status: ShiftStatus = published ? 'offered' : 'draft';
      
      // Calculate estimated hours
      const [startHour, startMin] = startTime.split(':').map(Number);
      const [endHour, endMin] = endTime.split(':').map(Number);
      const totalMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);
      const estimatedHours = (totalMinutes - parseInt(breakMinutes || '0')) / 60;
      
      const projectName = selectedProject?.title || 'Project';
      const shiftTitle = position ? `${projectName} - ${position}` : projectName;
      
      const shiftData: Omit<Shift, 'id' | 'organizationId' | 'createdBy' | 'createdAt' | 'updatedAt'> = {
        title: shiftTitle,
        projectId,
        date,
        callTime: callTime || undefined,
        startTime,
        endTime,
        location: location || undefined,
        jobTitle: position || undefined,
        assignedMemberId: assignedMemberIds[0] || undefined,
        estimatedHours: estimatedHours > 0 ? estimatedHours : undefined,
        breaks: parseInt(breakMinutes || '0') > 0 ? [{
          start: startTime,
          end: endTime,
          paid: false
        }] : undefined,
        status,
        instructions: instructions || undefined,
        notes: notes || undefined,
        taskId: null,
      };

      if (shift?.id) {
        await updateShift(uid, shift.id, shiftData);
      } else {
        await createShift(uid, uid, shiftData);
      }
      
      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error('Error saving shift:', err);
      setError(err.message || 'Failed to save shift');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={isOpen} onClose={onClose}>
      <div className="w-[540px] max-h-[90vh] overflow-hidden flex flex-col bg-[rgba(20,20,30,0.98)] backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl shadow-black/50">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-100">
            {shift ? 'Edit shift' : 'Create shift'}
          </h2>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              className="p-2 hover:bg-white/5 rounded transition-colors"
              onClick={onClose}
            >
              <svg className="w-5 h-5 text-gray-400 hover:text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Status Banner */}
        {published && (
          <div className="px-5 py-3 bg-gradient-to-r from-emerald-500/20 to-green-500/20 border-b border-emerald-500/30 text-emerald-400 text-sm font-medium">
            ✓ Shift is published
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="px-5 py-4 space-y-4">
            {/* Project Selection */}
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white/5 border border-white/10">
                <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-400 uppercase mb-1">Project</label>
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                >
                  <option value="">Select project</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>{project.title}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Date */}
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white/5 border border-white/10">
                <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-400 uppercase mb-1">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />
                {date && (
                  <div className="text-sm text-gray-400 mt-1">
                    {formatDateDisplay(date)}
                  </div>
                )}
              </div>
            </div>

            {/* Call Time */}
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white/5 border border-white/10">
                <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-400 uppercase mb-1">Call Time</label>
                <input
                  type="time"
                  value={callTime}
                  onChange={(e) => setCallTime(e.target.value)}
                  placeholder="Optional"
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />
                <div className="text-xs text-gray-500 mt-1">
                  Earlier call time if different from start time
                </div>
              </div>
            </div>

            {/* Time */}
            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white/5 border border-white/10">
                <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1 space-y-2">
                <label className="block text-xs font-medium text-gray-400 uppercase">Time</label>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">Start</label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">End</label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">Break</label>
                    <input
                      type="number"
                      value={breakMinutes}
                      onChange={(e) => setBreakMinutes(e.target.value)}
                      min="0"
                      step="15"
                      placeholder="min"
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white/5 border border-white/10">
                <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-400 uppercase mb-1">Location</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Add location"
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Position */}
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white/5 border border-white/10">
                <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-400 uppercase mb-1">Position</label>
                <select
                  value={position}
                  onChange={(e) => setPosition(e.target.value as JobTitle)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                >
                  <option value="">Select position</option>
                  {JOB_TITLES.map(title => (
                    <option key={title} value={title}>{title}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Employee Assignment */}
            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white/5 border border-white/10">
                <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-400 uppercase mb-2">Employee</label>
                <div className="space-y-1 max-h-32 overflow-y-auto border border-white/10 rounded-lg bg-white/5">
                  {teamMembers.map(member => (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => toggleMemberAssignment(member.id!)}
                      className={`w-full flex items-center gap-3 px-3 py-2 hover:bg-white/10 transition-colors ${
                        assignedMemberIds.includes(member.id!) ? 'bg-cyan-500/20' : ''
                      }`}
                    >
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        assignedMemberIds.includes(member.id!) 
                          ? 'bg-cyan-500 border-cyan-500' 
                          : 'border-gray-600'
                      }`}>
                        {assignedMemberIds.includes(member.id!) && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span className="text-sm text-gray-200">{member.name}</span>
                    </button>
                  ))}
                  {teamMembers.length === 0 && (
                    <div className="px-3 py-6 text-center text-sm text-gray-500">
                      No team members available
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white/5 border border-white/10">
                <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-400 uppercase mb-1">Instructions</label>
                <textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Instructions for assigned team member"
                  rows={3}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none"
                />
              </div>
            </div>

            {/* Notes */}
            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white/5 border border-white/10">
                <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-400 uppercase mb-1">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Internal notes"
                  rows={3}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none"
                />
              </div>
            </div>

            {/* Publish Toggle */}
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white/5 border border-white/10">
                <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <div className="flex-1 flex items-center justify-between">
                <label className="text-sm font-medium text-gray-200">Publish</label>
                <button
                  type="button"
                  onClick={() => setPublished(!published)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    published ? 'bg-gradient-to-r from-cyan-500 to-blue-500' : 'bg-white/10'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      published ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="mx-5 mb-4 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-white/10 bg-white/5">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-sm font-medium text-gray-300 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg hover:from-cyan-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-cyan-500/20"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
