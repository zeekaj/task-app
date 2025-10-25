// src/components/views/ProjectDetailView.tsx
import { useState, useEffect, useRef } from 'react';
import { Card } from '../ui/Card';
import { StatusBadge, Badge } from '../ui/Badge';
import { PillTabs } from '../ui/PillTabs';
import { Modal } from '../shared/Modal';
import { updateProject, deleteProject, archiveProject } from '../../services/projects';
import { useTasks } from '../../hooks/useTasks';
import { computeProjectStatus, getAllowedStatusTransitions } from '../../utils/projectStatus';
import type { Project, ProjectStatus, WithId } from '../../types';
import { canMarkComplete, canManuallyChangeStatus } from '../../utils/projectStatus';
import { ProjectCompletionModal } from '../ProjectCompletionModal';

interface ProjectDetailViewProps {
  uid: string;
  project: WithId<Project>;
  onClose: () => void;
  onDeleted?: () => void;
}

export function ProjectDetailView({ uid, project: initialProject, onClose, onDeleted }: ProjectDetailViewProps) {
  const [project, setProject] = useState(initialProject);
  const [activeTab, setActiveTab] = useState('overview');
  const [editingField, setEditingField] = useState<string | null>(null);
  const [pendingChanges, setPendingChanges] = useState<Partial<Project>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  // For tab order: refs for each editable field
  const fieldOrder = [
    'r2Number',
    'projectManager',
    'prepDate',
    'shipDate',
    'loadInDate',
    'eventBeginDate',
    'eventEndDate',
    'strikeDate',
    'pickupDate',
  ];
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [localToast, setLocalToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const tasks = useTasks(uid);
  const [showCompletionModal, setShowCompletionModal] = useState(false);

  // Local toast system for this modal
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setLocalToast({ message, type });
    setTimeout(() => setLocalToast(null), 3000);
  };

  // Compute effective status
  const effectiveStatus = computeProjectStatus(project);

  // Filter tasks for this project
  const projectTasks = tasks?.filter(t => t.projectId === project.id) || [];
  const activeTasks = projectTasks.filter(t => t.status !== 'done' && t.status !== 'archived');
  const completedTasks = projectTasks.filter(t => t.status === 'done');

  // Update local state when initialProject changes
  useEffect(() => {
    setProject(initialProject);
  }, [initialProject]);

  // Timeline milestone order
  const milestoneOrder = [
    'prepDate',
    'shipDate',
    'loadInDate',
    'eventBeginDate',
    'eventEndDate',
    'strikeDate',
    'pickupDate',
    'returnDate',
  ];

  // Helper to get comparable date value
  const getDateValue = (date: any) => {
    if (!date) return null;
    if (typeof date === 'object' && 'toDate' in date) return date.toDate().getTime();
    if (date instanceof Date) return date.getTime();
    if (typeof date === 'string') {
      const d = new Date(date);
      if (!Number.isNaN(d.getTime())) return d.getTime();
    }
    return null;
  };

  // Validate timeline order
  const isTimelineOrderValid = (field: string, value: any) => {
    const idx = milestoneOrder.indexOf(field);
    if (idx === -1) return true;
    const newValue = getDateValue(value);
    // Check previous milestone
    for (let i = idx - 1; i >= 0; i--) {
      const prevField = milestoneOrder[i];
  const prevValue = getDateValue((project as any)[prevField]);
      if (prevValue && newValue && prevValue > newValue) return false;
    }
    // Check next milestone
    for (let i = idx + 1; i < milestoneOrder.length; i++) {
      const nextField = milestoneOrder[i];
  const nextValue = getDateValue((project as any)[nextField]);
      if (nextValue && newValue && newValue > nextValue) return false;
    }
    return true;
  };

  // Update local state only, don't save to DB yet
  const handleUpdate = (field: string, value: any, nextField?: string | null) => {
    if (milestoneOrder.includes(field)) {
      if (!isTimelineOrderValid(field, value)) {
        showToast('Timeline order invalid: each milestone must occur after the previous one.', 'error');
        return;
      }
    }
    // Update local state
    setProject(prev => ({ ...prev, [field]: value }));
    setPendingChanges(prev => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
    
    if (nextField) {
      // Delay to next tick to allow input to render
      setTimeout(() => setEditingField(nextField), 0);
    } else {
      setEditingField(null);
    }
  };

  // Save all pending changes when closing
  const handleClose = async () => {
    if (hasUnsavedChanges && Object.keys(pendingChanges).length > 0) {
      try {
        await updateProject(uid, project.id, pendingChanges as any);
        showToast('Changes saved', 'success');
        // Small delay to show toast before closing
        setTimeout(() => onClose(), 500);
      } catch (err) {
        showToast('Failed to save changes', 'error');
      }
    } else {
      onClose();
    }
  };

  const handleStatusChange = async (newStatus: ProjectStatus) => {
    try {
      // Save pending changes first
      if (hasUnsavedChanges && Object.keys(pendingChanges).length > 0) {
        await updateProject(uid, project.id, pendingChanges as any);
        setPendingChanges({});
        setHasUnsavedChanges(false);
      }
      await updateProject(uid, project.id, { status: newStatus });
      setProject({ ...project, status: newStatus });
      showToast('Status updated', 'success');
    } catch (err) {
      showToast('Failed to update status', 'error');
    }
  };


  const handleArchive = async () => {
    try {
      // Save pending changes first
      if (hasUnsavedChanges && Object.keys(pendingChanges).length > 0) {
        await updateProject(uid, project.id, pendingChanges as any);
      }
      await archiveProject(uid, project.id);
      showToast('Project archived', 'success');
      onClose();
    } catch (err) {
      showToast('Failed to archive', 'error');
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete "${project.title}"? This cannot be undone.`)) return;
    try {
      await deleteProject(uid, project.id);
      showToast('Project deleted', 'success');
      onDeleted?.();
      onClose();
    } catch (err) {
      showToast('Failed to delete', 'error');
    }
  };

  const handleMarkComplete = async () => {
   try {
     // Save pending changes first
     if (hasUnsavedChanges && Object.keys(pendingChanges).length > 0) {
       await updateProject(uid, project.id, pendingChanges as any);
     }
     await updateProject(uid, project.id, { status: 'completed' });
     setProject({ ...project, status: 'completed' });
     showToast('Project marked as complete!', 'success');
     setShowCompletionModal(false);
   } catch (err) {
     showToast('Failed to mark complete', 'error');
   }
  };
  
  const formatDate = (date: any): string => {
    if (!date) return '-';
    let d: Date;
    if (date.toDate) d = date.toDate();
    else if (typeof date === 'string') d = new Date(date);
    else if (date instanceof Date) d = date;
    else return '-';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  };

  const toDateInput = (date: any): string => {
    let d: Date | null = null;
    if (!date) return '';
    if (typeof date === 'object' && 'toDate' in date) d = (date as any).toDate();
    else if (date instanceof Date) d = date;
    else if (typeof date === 'string') d = new Date(date);
    if (!d || Number.isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 10);
  };

  const statusLabel = (s: ProjectStatus) => {
    switch (s) {
      case 'not_started': return 'Not Started';
      case 'planning': return 'Planning';
      case 'executing': return 'Executing';
      case 'post_event': return 'Post-Event';
      case 'completed': return 'Completed';
      case 'blocked': return 'Blocked';
      case 'archived': return 'Archived';
      default: return s;
    }
  };

  return (
    <Modal
      open
      onClose={handleClose}
      title=""
      widthClass="max-w-6xl"
      footer={null}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            {editingField === 'title' ? (
              <input
                autoFocus
                defaultValue={project.title}
                onBlur={(e) => handleUpdate('title', e.target.value.trim())}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleUpdate('title', (e.target as HTMLInputElement).value.trim());
                  }
                  if (e.key === 'Escape') setEditingField(null);
                }}
                className="text-3xl font-bold text-white bg-transparent border-b-2 border-cyan-500 focus:outline-none w-full"
              />
            ) : (
              <h2
                onClick={() => setEditingField('title')}
                className="text-3xl font-bold text-white cursor-pointer hover:text-cyan-400 transition-colors"
              >
                {project.title}
              </h2>
            )}
            <div className="flex items-center gap-3 mt-2">
              <StatusBadge status={effectiveStatus} size="md" />
               {project.projectManager && (
                 <div className="flex items-center gap-2 ml-2 px-3 py-1 bg-white/5 rounded-lg border border-white/10">
                   <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                   </svg>
                   <span className="text-sm text-cyan-400">{project.projectManager}</span>
                 </div>
               )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleArchive}
              className="px-3 py-2 text-sm text-gray-300 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
              Archive
            </button>
            <button
              onClick={handleDelete}
              className="px-3 py-2 text-sm text-red-400 bg-white/5 border border-red-500/30 rounded-lg hover:bg-red-500/10 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </button>
            <button
              onClick={handleClose}
              className="px-3 py-2 text-sm text-gray-400 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 hover:text-white flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Close
            </button>
          </div>
        </div>

        {/* Tabs */}
        <PillTabs
          tabs={[
            { id: 'overview', label: 'Overview' },
            { id: 'tasks', label: 'Tasks', count: activeTasks.length },
            { id: 'timeline', label: 'Timeline' },
            { id: 'team', label: 'Team' },
          ]}
          activeTab={activeTab}
          onChange={setActiveTab}
        />

        {/* Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left column - Metadata */}
            <div className="lg:col-span-2 space-y-6">
              {/* Status Control - Only before prep date */}
              {canManuallyChangeStatus(project) && (
                <Card>
                 <h3 className="text-sm font-medium text-gray-400 mb-3">Status Selection</h3>
                 <p className="text-xs text-gray-400 mb-3">Before prep date, you can select initial status:</p>
                  <select
                      value={project.status}
                      onChange={(e) => handleStatusChange(e.target.value as any)}
                      className="w-full bg-transparent border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  >
                      {getAllowedStatusTransitions(project).map((s) => (
                        <option key={s} value={s} className="bg-black">{statusLabel(s)}</option>
                      ))}
                    </select>
                  </Card>
                )}

              {/* Mark Complete Button - Only in post_event status */}
              {canMarkComplete(project) && (
                <Card>
                  <h3 className="text-sm font-medium text-gray-400 mb-3">Project Completion</h3>
                  <p className="text-xs text-gray-400 mb-3">Ready to mark this project as complete?</p>
                  <button
                    onClick={() => setShowCompletionModal(true)}
                    className="w-full px-4 py-3 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Mark as Complete
                 </button>
             </Card>
                )}

              {/* Project Details */}
              <Card>
                <h3 className="text-sm font-medium text-gray-400 mb-4">Project Details</h3>
                <div className="space-y-3">
                  {/* Tab order: R2 Number, Project Manager, Prep, Ship, Load-In, Event Begin, Event End, Strike, Pickup */}
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">R2 Number</label>
                      {editingField === 'r2Number' ? (
                        <input
                          ref={el => inputRefs.current[0] = el}
                          autoFocus
                          defaultValue={project.r2Number || ''}
                          onBlur={(e) => handleUpdate('r2Number', e.target.value.trim() || null)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === 'Tab') {
                              e.preventDefault();
                              const idx = 0;
                              const nextField = fieldOrder[idx + 1];
                              handleUpdate('r2Number', (e.target as HTMLInputElement).value.trim() || null, nextField);
                            }
                            if (e.key === 'Escape') setEditingField(null);
                          }}
                          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-cyan-500 text-white focus:outline-none"
                        />
                      ) : (
                        <div
                          onClick={() => setEditingField('r2Number')}
                          className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white cursor-pointer hover:border-cyan-500/50"
                        >
                          {project.r2Number || 'Not set'}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Project Manager</label>
                      {editingField === 'projectManager' ? (
                        <input
                          ref={el => inputRefs.current[1] = el}
                          autoFocus
                          defaultValue={project.projectManager || ''}
                          onBlur={(e) => handleUpdate('projectManager', e.target.value.trim() || null)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === 'Tab') {
                              e.preventDefault();
                              const idx = 1;
                              const nextField = fieldOrder[idx + 1];
                              handleUpdate('projectManager', (e.target as HTMLInputElement).value.trim() || null, nextField);
                            }
                            if (e.key === 'Escape') setEditingField(null);
                          }}
                          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-cyan-500 text-white focus:outline-none"
                        />
                      ) : (
                        <div
                          onClick={() => setEditingField('projectManager')}
                          className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-cyan-400 cursor-pointer hover:border-cyan-500/50"
                        >
                          {project.projectManager || 'Not assigned'}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Prep Date</label>
                      {editingField === 'prepDate' ? (
                        <input
                          type="date"
                          ref={el => inputRefs.current[2] = el}
                          autoFocus
                          defaultValue={toDateInput(project.prepDate)}
                          onBlur={(e) => handleUpdate('prepDate', e.target.value || null)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === 'Tab') {
                              e.preventDefault();
                              const idx = 2;
                              const nextField = fieldOrder[idx + 1];
                              handleUpdate('prepDate', (e.target as HTMLInputElement).value || null, nextField);
                            }
                            if (e.key === 'Escape') setEditingField(null);
                          }}
                          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-cyan-500 text-white focus:outline-none"
                        />
                      ) : (
                        <div
                          onClick={() => setEditingField('prepDate')}
                          className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white cursor-pointer hover:border-cyan-500/50"
                        >
                          {formatDate(project.prepDate)}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Ship Date</label>
                      {editingField === 'shipDate' ? (
                        <input
                          type="date"
                          ref={el => inputRefs.current[3] = el}
                          autoFocus
                          defaultValue={toDateInput(project.shipDate)}
                          onBlur={(e) => handleUpdate('shipDate', e.target.value || null)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === 'Tab') {
                              e.preventDefault();
                              const idx = 3;
                              const nextField = fieldOrder[idx + 1];
                              handleUpdate('shipDate', (e.target as HTMLInputElement).value || null, nextField);
                            }
                            if (e.key === 'Escape') setEditingField(null);
                          }}
                          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-cyan-500 text-white focus:outline-none"
                        />
                      ) : (
                        <div
                          onClick={() => setEditingField('shipDate')}
                          className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white cursor-pointer hover:border-cyan-500/50"
                        >
                          {formatDate(project.shipDate)}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Load-In Date</label>
                      {editingField === 'loadInDate' ? (
                        <input
                          type="date"
                          ref={el => inputRefs.current[4] = el}
                          autoFocus
                          defaultValue={toDateInput(project.loadInDate)}
                          onBlur={(e) => handleUpdate('loadInDate', e.target.value || null)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === 'Tab') {
                              e.preventDefault();
                              const idx = 4;
                              const nextField = fieldOrder[idx + 1];
                              handleUpdate('loadInDate', (e.target as HTMLInputElement).value || null, nextField);
                            }
                            if (e.key === 'Escape') setEditingField(null);
                          }}
                          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-cyan-500 text-white focus:outline-none"
                        />
                      ) : (
                        <div
                          onClick={() => setEditingField('loadInDate')}
                          className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white cursor-pointer hover:border-cyan-500/50"
                        >
                          {formatDate(project.loadInDate)}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Event Begin</label>
                      {editingField === 'eventBeginDate' ? (
                        <input
                          type="date"
                          ref={el => inputRefs.current[5] = el}
                          autoFocus
                          defaultValue={toDateInput(project.eventBeginDate)}
                          onBlur={(e) => handleUpdate('eventBeginDate', e.target.value || null)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === 'Tab') {
                              e.preventDefault();
                              const idx = 5;
                              const nextField = fieldOrder[idx + 1];
                              handleUpdate('eventBeginDate', (e.target as HTMLInputElement).value || null, nextField);
                            }
                            if (e.key === 'Escape') setEditingField(null);
                          }}
                          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-cyan-500 text-white focus:outline-none"
                        />
                      ) : (
                        <div
                          onClick={() => setEditingField('eventBeginDate')}
                          className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white cursor-pointer hover:border-cyan-500/50"
                        >
                          {formatDate(project.eventBeginDate)}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Event End</label>
                      {editingField === 'eventEndDate' ? (
                        <input
                          type="date"
                          ref={el => inputRefs.current[6] = el}
                          autoFocus
                          defaultValue={toDateInput(project.eventEndDate)}
                          onBlur={(e) => handleUpdate('eventEndDate', e.target.value || null)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === 'Tab') {
                              e.preventDefault();
                              const idx = 6;
                              const nextField = fieldOrder[idx + 1];
                              handleUpdate('eventEndDate', (e.target as HTMLInputElement).value || null, nextField);
                            }
                            if (e.key === 'Escape') setEditingField(null);
                          }}
                          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-cyan-500 text-white focus:outline-none"
                        />
                      ) : (
                        <div
                          onClick={() => setEditingField('eventEndDate')}
                          className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white cursor-pointer hover:border-cyan-500/50"
                        >
                          {formatDate(project.eventEndDate)}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Strike</label>
                      {editingField === 'strikeDate' ? (
                        <input
                          type="date"
                          ref={el => inputRefs.current[7] = el}
                          autoFocus
                          defaultValue={toDateInput(project.strikeDate)}
                          onBlur={(e) => handleUpdate('strikeDate', e.target.value || null)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === 'Tab') {
                              e.preventDefault();
                              const idx = 7;
                              const nextField = fieldOrder[idx + 1];
                              handleUpdate('strikeDate', (e.target as HTMLInputElement).value || null, nextField);
                            }
                            if (e.key === 'Escape') setEditingField(null);
                          }}
                          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-cyan-500 text-white focus:outline-none"
                        />
                      ) : (
                        <div
                          onClick={() => setEditingField('strikeDate')}
                          className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white cursor-pointer hover:border-cyan-500/50"
                        >
                          {formatDate(project.strikeDate)}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Pickup</label>
                      {editingField === 'pickupDate' ? (
                        <input
                          type="date"
                          ref={el => inputRefs.current[8] = el}
                          autoFocus
                          defaultValue={toDateInput(project.pickupDate)}
                          onBlur={(e) => handleUpdate('pickupDate', e.target.value || null)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === 'Tab') {
                              e.preventDefault();
                              const idx = 8;
                              const nextField = fieldOrder[idx + 1];
                              handleUpdate('pickupDate', (e.target as HTMLInputElement).value || null, nextField);
                              if (!nextField) (e.target as HTMLInputElement).blur();
                            }
                            if (e.key === 'Escape') setEditingField(null);
                          }}
                          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-cyan-500 text-white focus:outline-none"
                        />
                      ) : (
                        <div
                          onClick={() => setEditingField('pickupDate')}
                          className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white cursor-pointer hover:border-cyan-500/50"
                        >
                          {formatDate(project.pickupDate)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>

              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-4">
                <Card padding="md">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-cyan-400">{projectTasks.length}</div>
                    <div className="text-sm text-gray-400 mt-1">Total Tasks</div>
                  </div>
                </Card>
                <Card padding="md">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-400">{activeTasks.length}</div>
                    <div className="text-sm text-gray-400 mt-1">Active</div>
                  </div>
                </Card>
                <Card padding="md">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-400">{completedTasks.length}</div>
                    <div className="text-sm text-gray-400 mt-1">Completed</div>
                  </div>
                </Card>
              </div>
            </div>

            {/* Right column - Progress & Info */}
            <div className="space-y-6">
              {/* Progress */}
              <Card>
                <h3 className="text-sm font-medium text-gray-400 mb-3">Progress</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Completion</span>
                    <span className="text-white font-medium">
                      {projectTasks.length > 0
                        ? Math.round((completedTasks.length / projectTasks.length) * 100)
                        : 0}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500"
                      style={{
                        width: `${projectTasks.length > 0 ? (completedTasks.length / projectTasks.length) * 100 : 0}%`
                      }}
                    />
                  </div>
                </div>
              </Card>

              {/* Status Mode Info */}
              <Card>
                <h3 className="text-sm font-medium text-gray-400 mb-3">Status Flow</h3>
                <div className="text-sm text-gray-300 space-y-2">
                 <p>Status is automatically managed based on timeline:</p>
                 <ul className="list-disc list-inside text-xs text-gray-400 space-y-1 ml-2">
                  <li>Before Prep: Manual (Not Started/Planning)</li>
                  <li>After Prep: Automatic (Executing)</li>
                  <li>After Return: Post-Event</li>
                  <li>Mark Complete: Available in Post-Event</li>
                </ul>
              </div>
            </Card>
              {/* Timestamps */}
              {(project.createdAt || project.updatedAt) && (
                <Card>
                  <h3 className="text-sm font-medium text-gray-400 mb-3">Timestamps</h3>
                  <div className="text-xs text-gray-400 space-y-1">
                    {project.createdAt && (
                      <div>Created: {formatDate(project.createdAt)}</div>
                    )}
                    {project.updatedAt && (
                      <div>Updated: {formatDate(project.updatedAt)}</div>
                    )}
                  </div>
                </Card>
              )}
            </div>
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="space-y-4">
            {projectTasks.length === 0 ? (
              <Card>
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-800 rounded-xl mx-auto mb-4 flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-white mb-2">No tasks yet</h3>
                  <p className="text-gray-400">Tasks assigned to this project will appear here</p>
                </div>
              </Card>
            ) : (
              <>
                {activeTasks.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-3">Active Tasks ({activeTasks.length})</h3>
                    <Card className="overflow-hidden">
                      <div className="divide-y divide-white/5">
                        {activeTasks.map(task => (
                          <div key={task.id} className="p-3 hover:bg-white/5 transition-colors">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1">
                                <div className="font-medium text-white">{task.title}</div>
                                {task.description && (
                                  <div className="text-sm text-gray-400 mt-1 line-clamp-2">{task.description}</div>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                {task.priority !== undefined && task.priority !== null && (
                                  <Badge color={task.priority >= 70 ? 'red' : 'blue'} size="sm">
                                    P{task.priority}
                                  </Badge>
                                )}
                                {task.status && (
                                  <Badge color="purple" size="sm">{String(task.status)}</Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  </div>
                )}

                {completedTasks.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-3">Completed Tasks ({completedTasks.length})</h3>
                    <Card className="overflow-hidden">
                      <div className="divide-y divide-white/5">
                        {completedTasks.map(task => (
                          <div key={task.id} className="p-3 hover:bg-white/5 transition-colors opacity-60">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1">
                                <div className="font-medium text-white line-through">{task.title}</div>
                              </div>
                              <Badge color="green" size="sm">completed</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'timeline' && (
          <Card>
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-400">Project Timeline</h3>
              <div className="relative">
                {/* Timeline visualization with 7 milestones */}
                <div className="space-y-4">
                  {[
                    { key: 'prep', label: 'Prep', color: 'bg-blue-500', date: project.prepDate, desc: 'Setup and preparation begins' },
                    { key: 'ship', label: 'Ship', color: 'bg-cyan-500', date: project.shipDate, desc: 'Equipment ships out' },
                    { key: 'loadIn', label: 'Load-In', color: 'bg-purple-500', date: project.loadInDate, desc: 'Load-in at venue' },
                    { key: 'eventBegin', label: 'Event Begin', color: 'bg-green-500', date: project.eventBeginDate, desc: 'Event starts' },
                    { key: 'eventEnd', label: 'Event End', color: 'bg-yellow-500', date: project.eventEndDate, desc: 'Event ends' },
                    { key: 'strike', label: 'Strike', color: 'bg-orange-500', date: project.strikeDate, desc: 'Teardown/strike' },
                    { key: 'pickup', label: 'Pickup', color: 'bg-pink-500', date: project.pickupDate, desc: 'Equipment pickup' },
                  ].map(milestone => (
                    milestone.date ? (
                      <div key={milestone.key} className="flex items-center gap-4">
                        <div className="w-32 text-right text-sm text-gray-400">
                          {formatDate(milestone.date)}
                          {(() => {
                            // Show time if available
                            let d = null;
                            if (milestone.date && typeof milestone.date === 'object' && 'toDate' in milestone.date) d = milestone.date.toDate();
                            else if (milestone.date instanceof Date) d = milestone.date;
                            else if (typeof milestone.date === 'string') d = new Date(milestone.date);
                            if (d && !Number.isNaN(d.getTime())) {
                              const t = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                              if (t !== '12:00 AM') return <span className="ml-2 text-xs text-gray-500">{t}</span>;
                            }
                            return null;
                          })()}
                        </div>
                        <div className={`flex-shrink-0 w-3 h-3 rounded-full ${milestone.color}`} />
                        <div className="flex-1">
                          <div className="font-medium text-white">{milestone.label}</div>
                          <div className="text-sm text-gray-400">{milestone.desc}</div>
                        </div>
                      </div>
                    ) : null
                  ))}
                  {/* Empty state */}
                  {![project.prepDate, project.shipDate, project.loadInDate, project.eventBeginDate, project.eventEndDate, project.strikeDate, project.pickupDate].some(Boolean) && (
                    <div className="text-center py-8 text-gray-400">
                      No timeline dates set
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        )}

        {activeTab === 'team' && (
          <Card>
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-400">Team</h3>
              <div className="space-y-3">
                {project.projectManager && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="text-white font-medium">{project.projectManager}</div>
                      <div className="text-xs text-gray-400">Project Manager</div>
                    </div>
                  </div>
                )}
                 {!project.projectManager && (
                  <div className="text-center py-8 text-gray-400">
                    No team members assigned
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Local Toast Notification */}
      {localToast && (
        <div className="fixed top-4 right-4 z-[100] animate-in fade-in slide-in-from-top-2 duration-200">
          <div
            className={`flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg border backdrop-blur-sm text-sm ${
              localToast.type === 'success'
                ? 'bg-emerald-500/15 border-emerald-400/30 text-emerald-200'
                : localToast.type === 'error'
                ? 'bg-red-500/15 border-red-400/30 text-red-200'
                : 'bg-cyan-500/15 border-cyan-400/30 text-cyan-200'
            }`}
          >
            {localToast.type === 'success' && (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
            {localToast.type === 'error' && (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            {localToast.type === 'info' && (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 18a9 9 0 110-18 9 9 0 010 18z" />
              </svg>
            )}
            <span>{localToast.message}</span>
          </div>
        </div>
      )}
      {/* Completion Modal */}
      <ProjectCompletionModal
        open={showCompletionModal}
        projectTitle={project.title}
        onClose={() => setShowCompletionModal(false)}
        onConfirm={handleMarkComplete}
      />
    </Modal>
  );
}
