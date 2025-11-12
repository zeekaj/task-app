// src/components/GenericShiftModal.tsx
import { useState, useEffect, useRef } from 'react';
import { Modal } from './shared/Modal';
import { Autocomplete } from './shared/Autocomplete';
import { useTeamMembers } from '../hooks/useTeamMembers';
import { useMaybeProjects } from '../hooks/useMaybeProjects';
import { useVenues } from '../hooks/useVenues';
import { DatePicker } from './ui/DatePicker';
import { TimePicker } from './ui/TimePicker';
import { SearchableSelect } from './ui/SearchableSelect';
import type { Shift, ShiftStatus, JobTitle } from '../types';
import { createShift, updateShift } from '../services/shifts';
import { createVenue } from '../services/venues';

interface GenericShiftModalProps {
  uid: string;
  shift?: Shift & { id: string }; // If editing existing shift
  defaultDate?: string; // YYYY-MM-DD
  defaultMemberId?: string; // Pre-filled team member ID
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const JOB_TITLES: JobTitle[] = ["A1", "A2", "V1", "V2", "LD", "ME", "TD", "Stagehand", "Show Producer", "vMix Op"];

export function GenericShiftModal({ uid, shift, defaultDate, defaultMemberId, isOpen, onClose, onSuccess }: GenericShiftModalProps) {
  const teamMembers = useTeamMembers(uid) || [];
  const projects = useMaybeProjects(uid) || [];
  const [venues] = useVenues(uid);
  const venueAddressInputRef = useRef<HTMLInputElement>(null);
  
  const [saving, setSaving] = useState(false);
  const [showVenueModal, setShowVenueModal] = useState(false);
  const [venueFormData, setVenueFormData] = useState({ name: '', address: '', city: '', state: '', zip: '', capacity: '' });
  const [error, setError] = useState<string | null>(null);
  const [published, setPublished] = useState(false);
  
  // Form state
  const [projectId, setProjectId] = useState('office');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('17:00');
  const [breakMinutes, setBreakMinutes] = useState('60');
  const [venueId, setVenueId] = useState('');
  const [position, setPosition] = useState<string>('');
  const [assignedMemberId, setAssignedMemberId] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [customJobTitles, setCustomJobTitles] = useState<string[]>([]);

  // Initialize form with shift data or defaults
  useEffect(() => {
    if (shift) {
      setProjectId(shift.projectId || 'office');
      setDate(shift.date || '');
      setStartTime(shift.startTime || '08:00');
      setEndTime(shift.endTime || '17:00');
      setBreakMinutes(shift.breaks?.[0] ? '60' : '0');
      setVenueId(shift.venueId || '');
      setPosition(shift.jobTitle || '');
      // Convert member ID to name for the SearchableSelect
      if (shift.assignedMemberId) {
        const member = teamMembers.find(m => m.id === shift.assignedMemberId);
        setAssignedMemberId(member?.name || '');
      } else {
        setAssignedMemberId('');
      }
      setNotes(shift.notes || '');
      setPublished(shift.status === 'offered' || shift.status === 'confirmed');
    } else {
      // Defaults for new shift
      setProjectId('office');
      setDate(defaultDate || new Date().toISOString().split('T')[0]);
      setStartTime('08:00');
      setEndTime('17:00');
      setBreakMinutes('60');
      setVenueId('');
      setPosition('');
      // Use defaultMemberId if provided, and convert ID to name for the SearchableSelect
      if (defaultMemberId) {
        const member = teamMembers.find(m => m.id === defaultMemberId);
        setAssignedMemberId(member?.name || '');
      } else {
        setAssignedMemberId('');
      }
      setNotes('');
      setPublished(false);
    }
    setError(null);
  }, [shift, defaultDate, defaultMemberId, teamMembers, isOpen]);

  const formatDateLabel = (dateStr: string) => {
    if (!dateStr) return 'Date';
    const d = new Date(dateStr + 'T00:00:00');
    const day = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    return `Date (${day})`;
  };

  const handleCreatePosition = (newPosition: string) => {
    setCustomJobTitles(prev => [...prev, newPosition]);
  };

  const handleOpenVenueModal = (prefillName?: string) => {
    if (prefillName) {
      setVenueFormData({ name: prefillName, address: '', city: '', state: '', zip: '', capacity: '' });
    }
    setShowVenueModal(true);
  };

  // Auto-focus address field when venue modal opens with prefilled name
  useEffect(() => {
    if (showVenueModal && venueFormData.name && venueAddressInputRef.current) {
      // Small delay to ensure modal is fully rendered
      setTimeout(() => {
        venueAddressInputRef.current?.focus();
      }, 100);
    }
  }, [showVenueModal, venueFormData.name]);

  const handleCreateVenue = async () => {
    try {
      const newVenueId = await createVenue(uid, { ...venueFormData, active: true, country: 'USA' });
      setVenueId(newVenueId);
      setShowVenueModal(false);
      setVenueFormData({ name: '', address: '', city: '', state: '', zip: '', capacity: '' });
    } catch (error) {
      console.error('Failed to create venue:', error);
    }
  };

  const allJobTitles = [...JOB_TITLES, ...customJobTitles];
  const teamMemberNames = teamMembers.map(m => m.name);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
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
      
      // Find member ID by name
      const memberIdToAssign = assignedMemberId ? teamMembers.find(m => m.name === assignedMemberId)?.id : undefined;
      
      const shiftData: Omit<Shift, 'id' | 'organizationId' | 'createdBy' | 'createdAt' | 'updatedAt'> = {
        title: position ? `${position} Shift` : 'Shift',
        date,
        startTime,
        endTime,
        venueId: venueId || undefined,
        location: venueId ? undefined : undefined, // Legacy field, use venueId instead
        jobTitle: position as JobTitle || undefined,
        assignedMemberId: memberIdToAssign,
        estimatedHours: estimatedHours > 0 ? estimatedHours : undefined,
        breaks: parseInt(breakMinutes || '0') > 0 ? [{
          start: startTime,
          end: endTime,
          paid: false
        }] : undefined,
        status,
        notes: notes || undefined,
        projectId: projectId === 'office' ? null : projectId,
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
    <>
    <Modal
      open={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center justify-between w-full pr-12">
          <span>{shift ? 'Edit Shift' : 'Create Shift'}</span>
          <div className="flex items-center gap-3">
            <span className="text-sm font-normal text-gray-400">Publish</span>
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
      }
      widthClass="max-w-xl"
      footer={
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-300 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="generic-shift-form"
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg hover:from-cyan-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-cyan-500/20"
          >
            {saving ? 'Saving...' : (shift ? 'Save' : 'Create')}
          </button>
        </div>
      }
    >
      {/* Optional status banner */}
      {published && (
        <div className="mb-4 px-4 py-3 bg-gradient-to-r from-emerald-500/20 to-green-500/20 border border-emerald-500/30 rounded-lg text-emerald-400 text-sm font-medium">
          ✓ Shift is published
        </div>
      )}

      {/* Form */}
      <form id="generic-shift-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-4">
            {/* Date */}
            <div className="flex items-start gap-4">
              <label className="text-xs font-medium text-gray-400 uppercase mt-[30px] w-20 text-right flex-shrink-0">Date</label>
              <div className="flex items-center justify-center w-10 h-10 mt-[22px] rounded-full bg-cyan-500/10 border border-cyan-500/20 flex-shrink-0">
                <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <DatePicker
                value={date}
                onChange={setDate}
                label={formatDateLabel(date)}
                className="flex-1"
              />
            </div>

            {/* Project */}
            <div className="flex items-start gap-4">
              <label className="text-xs font-medium text-gray-400 uppercase pt-2 w-20 text-right flex-shrink-0">Project</label>
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex-shrink-0">
                <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </div>
              <div className="flex-1">
                <SearchableSelect
                  value={projectId === 'office' ? 'None' : projects.find(p => p.id === projectId)?.title || ''}
                  onChange={(value) => {
                    if (value === 'None') {
                      setProjectId('office');
                    } else {
                      const project = projects.find(p => p.title === value);
                      if (project) setProjectId(project.id);
                    }
                  }}
                  options={[
                    'None',
                    ...projects
                      .filter(p => p.status !== 'archived' && p.status !== 'completed')
                      .map(p => p.title)
                  ]}
                  placeholder="Select project..."
                  allowCreate={false}
                />
              </div>
            </div>

            {/* Time */}
            <div className="flex items-start gap-4">
              <label className="text-xs font-medium text-gray-400 uppercase mt-[30px] w-20 text-right flex-shrink-0">Time</label>
              <div className="flex items-center justify-center w-10 h-10 mt-[22px] rounded-full bg-cyan-500/10 border border-cyan-500/20 flex-shrink-0">
                <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-3">
                  <TimePicker
                    value={startTime}
                    onChange={setStartTime}
                    label="Start"
                    className="flex-1"
                  />
                  <TimePicker
                    value={endTime}
                    onChange={setEndTime}
                    label="End"
                    className="flex-1"
                  />
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-400 uppercase mb-1">Break</label>
                    <select
                      value={breakMinutes}
                      onChange={(e) => setBreakMinutes(e.target.value)}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent [&>option]:bg-gray-800 [&>option]:text-white"
                    >
                      <option value="0">0 min</option>
                      <option value="15">15 min</option>
                      <option value="30">30 min</option>
                      <option value="45">45 min</option>
                      <option value="60">60 min</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Venue */}
            <div className="flex items-center gap-4">
              <label className="text-xs font-medium text-gray-400 uppercase w-20 text-right flex-shrink-0">Location</label>
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex-shrink-0">
                <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <Autocomplete
                  value={venueId || null}
                  options={(venues || []).map(v => ({
                    id: v.id as string,
                    label: v.name,
                    sublabel: v.city && v.state ? `${v.city}, ${v.state}` : undefined,
                  }))}
                  onChange={(value) => setVenueId(value || '')}
                  onCreateNew={handleOpenVenueModal}
                  placeholder="Search venues..."
                  createNewLabel="+ Add New Venue"
                />
              </div>
            </div>

            {/* Position */}
            <div className="flex items-center gap-4">
              <label className="text-xs font-medium text-gray-400 uppercase w-20 text-right flex-shrink-0">Position</label>
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex-shrink-0">
                <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <SearchableSelect
                value={position}
                onChange={setPosition}
                options={allJobTitles}
                onCreateNew={handleCreatePosition}
                placeholder="Select or create position"
                className="flex-1"
                allowCreate={true}
              />
            </div>

            {/* Employee Assignment */}
            <div className="flex items-start gap-4">
              <label className="text-xs font-medium text-gray-400 uppercase pt-2 w-20 text-right flex-shrink-0">Employee</label>
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex-shrink-0">
                <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <SearchableSelect
                value={assignedMemberId}
                onChange={setAssignedMemberId}
                options={teamMemberNames}
                placeholder="Select employee"
                className="flex-1"
                allowCreate={false}
              />
            </div>

            {/* Notes */}
            <div className="flex items-start gap-4">
              <label className="text-xs font-medium text-gray-400 uppercase pt-2 w-20 text-right flex-shrink-0">Notes</label>
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex-shrink-0">
                <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="flex-1">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add a note"
                  rows={3}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none"
                />
              </div>
            </div>
        </div>

        {error && (
          <div className="px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}
      </form>
    </Modal>

    {/* Venue Creation Modal */}
    <Modal open={showVenueModal} onClose={() => setShowVenueModal(false)} title="Add New Venue" widthClass="max-w-md">
      <div className="space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Venue Name *</label>
          <input
            value={venueFormData.name}
            onChange={(e) => setVenueFormData({ ...venueFormData, name: e.target.value })}
            placeholder="Venue name"
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Address</label>
          <input
            ref={venueAddressInputRef}
            value={venueFormData.address}
            onChange={(e) => setVenueFormData({ ...venueFormData, address: e.target.value })}
            placeholder="Street address"
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-gray-400 mb-1">City</label>
            <input
              value={venueFormData.city}
              onChange={(e) => setVenueFormData({ ...venueFormData, city: e.target.value })}
              placeholder="City"
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">State</label>
            <input
              value={venueFormData.state}
              onChange={(e) => setVenueFormData({ ...venueFormData, state: e.target.value })}
              placeholder="ST"
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-gray-400 mb-1">ZIP</label>
            <input
              value={venueFormData.zip}
              onChange={(e) => setVenueFormData({ ...venueFormData, zip: e.target.value })}
              placeholder="12345"
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Capacity</label>
            <input
              value={venueFormData.capacity}
              onChange={(e) => setVenueFormData({ ...venueFormData, capacity: e.target.value })}
              placeholder="500"
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <button
            onClick={() => setShowVenueModal(false)}
            className="px-4 py-2 text-sm font-medium text-gray-300 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            onClick={handleCreateVenue}
            disabled={!venueFormData.name.trim()}
            className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add Venue
          </button>
        </div>
      </div>
    </Modal>
  </>
  );
}
