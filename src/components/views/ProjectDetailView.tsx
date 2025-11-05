// src/components/views/ProjectDetailView.tsx
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Card } from '../ui/Card';
import { StatusBadge, Badge } from '../ui/Badge';
import { PillTabs } from '../ui/PillTabs';
import { Modal } from '../shared/Modal';
import { updateProject, deleteProject, archiveProject } from '../../services/projects';
import { logActivity } from '../../services/activityHistory';
import { deleteNotificationsForEntity } from '../../services/notifications';
import { createTask } from '../../services/tasks';
import { useTasks } from '../../hooks/useTasks';
import { useAllBlockers } from '../../hooks/useBlockers';
import { useProjects } from '../../hooks/useProjects';
import { useTeamMembers } from '../../hooks/useTeamMembers';
import { useClients } from '../../hooks/useClients';
import { useVenues } from '../../hooks/useVenues';
import { useOrganizationId } from '../../hooks/useOrganization';
import { useClickOutside } from '../../hooks/useClickOutside';
import { computeProjectStatus } from '../../utils/projectStatus';
import type { Project, ProjectStatus, WithId } from '../../types';
import { canMarkComplete, canManuallyChangeStatus } from '../../utils/projectStatus';
import { ProjectCompletionModal } from '../ProjectCompletionModal';
import { TaskItem } from '../TaskItem';
import { TaskEditForm } from '../TaskEditForm';
import { ConfirmModal } from '../shared/ConfirmModal';
import { BlockerModal } from '../BlockerModal';
import { BlockerManagerModal } from '../BlockerManagerModal';
import { ActivityHistory } from '../ActivityHistory';
import PostEventReportModal, { generatePostEventReportPDF } from '../PostEventReportModal';
import { ClientModal } from '../ClientModal';
import { VenueModal } from '../VenueModal';
import { Autocomplete } from '../shared/Autocomplete';
import { createClient } from '../../services/clients';
import { createVenue } from '../../services/venues';

interface ProjectDetailViewProps {
  uid: string;
  project: WithId<Project>;
  onClose: () => void;
  onDeleted?: () => void;
}

export function ProjectDetailView({ uid, project: initialProject, onClose, onDeleted }: ProjectDetailViewProps) {
  const { orgId } = useOrganizationId();
  const [project, setProject] = useState(initialProject);
  const [activeTab, setActiveTab] = useState('overview');
  const [editingField, setEditingField] = useState<string | null>(null);
  const [pendingChanges, setPendingChanges] = useState<Partial<Project>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [showTeamMemberDropdown, setShowTeamMemberDropdown] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [creatingTask, setCreatingTask] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmAction, setConfirmAction] = useState<(() => Promise<void>) | null>(null);
  const [blockerModalTask, setBlockerModalTask] = useState<{ id: string; title: string; type: 'task' } | null>(null);
  const [blockerManagerTask, setBlockerManagerTask] = useState<{ id: string; title: string; type: 'task' } | null>(null);
  const [arrangeBy, setArrangeBy] = useState('age');
  const [reverseOrder, setReverseOrder] = useState(false);
  const [scheduleMenuOpen, setScheduleMenuOpen] = useState(false);
  const [showProjectBlockerModal, setShowProjectBlockerModal] = useState(false);
  const [showProjectBlockerManager, setShowProjectBlockerManager] = useState(false);
  const [tooltipState, setTooltipState] = useState<{ visible: boolean; x: number; y: number; blockerInfo: any }>({ 
    visible: false, 
    x: 0, 
    y: 0, 
    blockerInfo: null 
  });
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
    'returnDate',
  ];
  const inputRefs = useRef<(HTMLInputElement | HTMLSelectElement | null)[]>([]);
  const [localToast, setLocalToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const tasks = useTasks(uid);
  const allBlockers = useAllBlockers(uid);
  const allProjects = useProjects(uid);
  const teamMembers = useTeamMembers(uid);
  const currentUserMember = teamMembers?.find((m: any) => m.userId === uid);
  const isOwner = currentUserMember?.role === 'owner';
  const [clients] = useClients(uid);
  const [venues] = useVenues(uid);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [showPostEventReport, setShowPostEventReport] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);
  const [showVenueModal, setShowVenueModal] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [editingVenue, setEditingVenue] = useState<any>(null);
  const [prefillClientName, setPrefillClientName] = useState<string>('');
  const [prefillVenueName, setPrefillVenueName] = useState<string>('');

  // Close status dropdown on click outside
  useClickOutside({
    enabled: statusMenuOpen,
    onClickOutside: () => setStatusMenuOpen(false),
    selector: '.status-dropdown-container',
  });

  // Close team member dropdown on click outside
  useClickOutside({
    enabled: showTeamMemberDropdown,
    onClickOutside: () => setShowTeamMemberDropdown(false),
    selector: '.team-member-dropdown-container',
  });

  // Close schedule dropdown on click outside
  useClickOutside({
    enabled: scheduleMenuOpen,
    onClickOutside: () => setScheduleMenuOpen(false),
    selector: '.schedule-dropdown-container',
  });

  // Local toast system for this modal
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setLocalToast({ message, type });
    setTimeout(() => setLocalToast(null), 3000);
  };

  // Quick add task handler (Tasks tab)
  const handleQuickAddTask = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const title = newTaskTitle.trim();
    if (!title) return;
    try {
      setCreatingTask(true);
      await createTask(uid, title, project.id);
      setNewTaskTitle('');
      showToast('Task added', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Failed to add task', 'error');
    } finally {
      setCreatingTask(false);
    }
  };

  // Compute effective status
  const effectiveStatus = computeProjectStatus(project);
  const activeProjectBlockers = Array.isArray(allBlockers)
    ? allBlockers.filter((b: any) => b?.entityType === 'project' && b?.entityId === project.id && b?.status === 'active')
    : [];

  // Check if project is completed (read-only mode)
  const isCompleted = project.status === 'completed';

  // Filter tasks for this project
  const projectTasks = tasks?.filter(t => t.projectId === project.id) || [];
  
  // Sort tasks by arrangeBy
  const sortTasks = (tasksToSort: typeof projectTasks) => {
    const list = [...tasksToSort];
    switch (arrangeBy) {
      case 'status':
        list.sort((a, b) => a.status.localeCompare(b.status));
        break;
      case 'title':
        list.sort((a, b) => String(a.title).localeCompare(String(b.title)));
        break;
      case 'dueDate':
        list.sort((a, b) => {
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return a.dueDate.localeCompare(b.dueDate);
        });
        break;
      case 'priority':
        list.sort((a, b) => b.priority - a.priority);
        break;
      case 'assigned':
        list.sort((a, b) => {
          const aAssignee = typeof a.assignee === 'object' && a.assignee !== null
            ? (a.assignee as any).name || (a.assignee as any).id || JSON.stringify(a.assignee)
            : a.assignee || '';
          const bAssignee = typeof b.assignee === 'object' && b.assignee !== null
            ? (b.assignee as any).name || (b.assignee as any).id || JSON.stringify(b.assignee)
            : b.assignee || '';
          return String(aAssignee).localeCompare(String(bAssignee));
        });
        break;
      case 'age':
      default:
        list.sort((a, b) => {
          const aTime = (a.createdAt && typeof (a.createdAt as any).toDate === 'function')
            ? (a.createdAt as any).toDate().getTime()
            : 0;
          const bTime = (b.createdAt && typeof (b.createdAt as any).toDate === 'function')
            ? (b.createdAt as any).toDate().getTime()
            : 0;
          return aTime - bTime;
        });
        break;
    }
    if (reverseOrder) list.reverse();
    return list;
  };

  // Render project-level blocker modal when requested
  const renderProjectBlockerModal = () => (
    showProjectBlockerModal ? (
      <BlockerModal
        uid={uid}
        entity={{ id: project.id, title: project.title, type: 'project' }}
        onClose={() => setShowProjectBlockerModal(false)}
      />
    ) : null
  );

  const activeTasks = sortTasks(projectTasks.filter(t => t.status !== 'done' && t.status !== 'archived'));
  const completedTasks = sortTasks(projectTasks.filter(t => t.status === 'done'));

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
    if (field === 'r2Number') {
      // Mirror orderId to match R2# on edits
      setProject(prev => ({ ...prev, r2Number: value, orderId: value } as any));
      setPendingChanges(prev => ({ ...prev, r2Number: value, orderId: value } as any));
    } else {
      setProject(prev => ({ ...prev, [field]: value }));
      setPendingChanges(prev => ({ ...prev, [field]: value }));
    }
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
        console.error('Failed to save:', err);
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
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteProject(uid, project.id);
      showToast('Project deleted', 'success');
      setDeleteConfirmOpen(false);
      onDeleted?.();
      onClose();
    } catch (err) {
      showToast('Failed to delete', 'error');
    }
  };

  const handleSaveClient = async (clientData: any) => {
    try {
      if (editingClient) {
        // Update existing client
        const { updateClient } = await import('../../services/clients');
        await updateClient(uid, editingClient.id, clientData);
        showToast('Client updated', 'success');
        setEditingClient(null);
      } else {
        // Create new client
        const newClientId = await createClient(uid, clientData);
        showToast('Client created', 'success');
        // Auto-select the new client
        setTimeout(() => {
          handleUpdate('clientId', newClientId);
        }, 100);
      }
      setShowClientModal(false);
    } catch (err: any) {
      throw new Error(err.message || 'Failed to save client');
    }
  };

  const handleSaveVenue = async (venueData: any) => {
    try {
      if (editingVenue) {
        // Update existing venue
        const { updateVenue } = await import('../../services/venues');
        await updateVenue(uid, editingVenue.id, venueData);
        showToast('Venue updated', 'success');
        setEditingVenue(null);
      } else {
        // Create new venue
        const newVenueId = await createVenue(uid, venueData);
        showToast('Venue created', 'success');
        // Auto-select the new venue
        setTimeout(() => {
          handleUpdate('venueId', newVenueId);
        }, 100);
      }
      setShowVenueModal(false);
    } catch (err: any) {
      throw new Error(err.message || 'Failed to save venue');
    }
  };

  const handleEditClient = () => {
    const client = (clients || []).find((c) => c.id === project.clientId);
    if (client) {
      setEditingClient(client);
      setShowClientModal(true);
    }
  };

  const handleEditVenue = () => {
    const venue = (venues || []).find((v) => v.id === project.venueId);
    if (venue) {
      setEditingVenue(venue);
      setShowVenueModal(true);
    }
  };

  const handleCloseClientModal = () => {
    setShowClientModal(false);
    setEditingClient(null);
    setPrefillClientName('');
  };

  const handleCloseVenueModal = () => {
    setShowVenueModal(false);
    setEditingVenue(null);
    setPrefillVenueName('');
  };

  const handleOpenClientModal = (prefillName?: string) => {
    setPrefillClientName(prefillName || '');
    setShowClientModal(true);
  };

  const handleOpenVenueModal = (prefillName?: string) => {
    setPrefillVenueName(prefillName || '');
    setShowVenueModal(true);
  };

  const handleMarkComplete = async () => {
   try {
     // Save pending changes first
     if (hasUnsavedChanges && Object.keys(pendingChanges).length > 0) {
       await updateProject(uid, project.id, pendingChanges as any);
     }
     await updateProject(uid, project.id, { status: 'completed' });
     
     // Delete all notifications related to this project
     if (orgId) {
       try {
         await deleteNotificationsForEntity(orgId, 'project', project.id);
       } catch (err) {
         console.error('Failed to delete notifications:', err);
         // Don't block completion if notification deletion fails
       }
     }
     
     setProject({ ...project, status: 'completed' });
     showToast('Project marked as complete!', 'success');
     setShowCompletionModal(false);
   } catch (err) {
     showToast('Failed to mark complete', 'error');
   }
  };

  // Scheduling generation handlers
  const handleCreateProjectHold = async () => {
    try {
      // Save pending changes first so dates are current
      if (hasUnsavedChanges && Object.keys(pendingChanges).length > 0) {
        await updateProject(uid, project.id, pendingChanges as any);
        setPendingChanges({});
        setHasUnsavedChanges(false);
      }
      const { createProjectHoldEvent } = await import('../../services/scheduling');
      const id = await createProjectHoldEvent(uid, uid, {
        id: project.id,
        title: project.title,
        prepDate: (project as any).prepDate,
        installDate: (project as any).installDate,
        eventBeginDate: (project as any).eventBeginDate,
        eventEndDate: (project as any).eventEndDate,
        strikeDate: (project as any).strikeDate,
        returnDate: (project as any).returnDate,
      });
      if (id) {
        showToast('Project hold created', 'success');
      } else {
        showToast('Not enough dates to create a hold. Set at least one milestone date.', 'info');
      }
      setScheduleMenuOpen(false);
    } catch (err: any) {
      showToast(err?.message || 'Failed to create project hold', 'error');
    }
  };

  const handleGenerateTentativeShifts = async () => {
    try {
      // Save pending changes first so dates are current
      if (hasUnsavedChanges && Object.keys(pendingChanges).length > 0) {
        await updateProject(uid, project.id, pendingChanges as any);
        setPendingChanges({});
        setHasUnsavedChanges(false);
      }
      const { generateTentativeShiftsForProject } = await import('../../services/scheduling');
      const ids = await generateTentativeShiftsForProject(uid, uid, {
        id: project.id,
        title: project.title,
        installDate: (project as any).installDate,
        eventBeginDate: (project as any).eventBeginDate,
        eventEndDate: (project as any).eventEndDate,
        strikeDate: (project as any).strikeDate,
      });
      if (ids && ids.length > 0) {
        showToast(`Created ${ids.length} tentative shift${ids.length > 1 ? 's' : ''}`, 'success');
      } else {
        showToast('No dates available for tentative shifts. Set install/event/strike dates.', 'info');
      }
      setScheduleMenuOpen(false);
    } catch (err: any) {
      showToast(err?.message || 'Failed to generate tentative shifts', 'error');
    }
  };
  
  const formatDate = (date: any): string => {
    if (!date) return '-';
    let d: Date;
    if (date.toDate) d = date.toDate();
    else if (typeof date === 'string') d = new Date(date);
    else if (date instanceof Date) d = date;
    else return '-';
    return d.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric', 
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'UTC' 
    });
  };

  const toDateInput = (date: any): string => {
    let d: Date | null = null;
    if (!date) return '';
    if (typeof date === 'object' && 'toDate' in date) d = (date as any).toDate();
    else if (date instanceof Date) d = date;
    else if (typeof date === 'string') d = new Date(date);
    if (!d || Number.isNaN(d.getTime())) return '';
    // Return datetime-local format: YYYY-MM-DDTHH:MM
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    const hours = String(d.getUTCHours()).padStart(2, '0');
    const minutes = String(d.getUTCMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  return (
    <Modal
      open
      onClose={handleClose}
      title=""
      widthClass="max-w-6xl"
      footer={null}
    >
      {renderProjectBlockerModal()}
      {showProjectBlockerManager && (
        <BlockerManagerModal
          uid={uid}
          entity={{ id: project.id, title: project.title, type: 'project' }}
          onClose={() => setShowProjectBlockerManager(false)}
        />
      )}
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            {editingField === 'title' && !isCompleted ? (
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
                onClick={() => !isCompleted && setEditingField('title')}
                className={`text-3xl font-bold text-white ${!isCompleted ? 'cursor-pointer hover:text-cyan-400 transition-colors' : 'cursor-default'}`}
              >
                {project.title}
              </h2>
            )}
            <div className="flex items-center gap-3 mt-2">
              {canManuallyChangeStatus(project) ? (
                <div className="relative status-dropdown-container">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (effectiveStatus === 'blocked') {
                        setShowProjectBlockerManager(true);
                        return;
                      }
                      setStatusMenuOpen(!statusMenuOpen);
                    }}
                    className="hover:opacity-80 transition-opacity"
                  >
                    {effectiveStatus === 'blocked' ? (
                      (() => {
                        const firstReason = activeProjectBlockers.length ? (typeof activeProjectBlockers[0]?.reason === 'object' ? JSON.stringify(activeProjectBlockers[0]?.reason) : (activeProjectBlockers[0]?.reason || 'Blocked')) : 'Blocked';
                        const extraCount = activeProjectBlockers.length > 1 ? activeProjectBlockers.length - 1 : 0;
                        const firstBlocker = activeProjectBlockers[0];
                        return (
                          <div
                            onMouseEnter={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setTooltipState({
                                visible: true,
                                x: rect.left + rect.width / 2,
                                y: rect.top,
                                blockerInfo: { firstReason, firstBlocker, extraCount }
                              });
                            }}
                            onMouseLeave={() => setTooltipState({ visible: false, x: 0, y: 0, blockerInfo: null })}
                          >
                            <Badge color="red" size="md" variant="solid" className="max-w-[320px] truncate">
                              <span className="font-semibold">BLOCKED</span>
                            </Badge>
                          </div>
                        );
                      })()
                    ) : effectiveStatus === 'post_event' ? (
                      // Check if awaiting owner review (purple Invoice badge)
                      project.postEventReport?.status === 'submitted' && !project.postEventReport.ownerReviewed ? (
                        <div className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-purple-500/10 border border-purple-500/30 animate-pulse">
                          <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span className="text-sm font-semibold text-purple-400">Invoice</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-orange-500/10 border border-orange-500/30 animate-pulse">
                          <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-sm font-semibold text-orange-400">Sign-Off</span>
                        </div>
                      )
                    ) : (
                      <StatusBadge status={effectiveStatus} size="md" />
                    )}
                  </button>
                  {statusMenuOpen && effectiveStatus !== 'blocked' && (
                    <div className="absolute left-0 top-full mt-1 w-auto bg-[rgba(20,20,30,0.95)] backdrop-blur-sm border border-white/10 rounded-lg shadow-lg z-20">
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          await handleStatusChange('not_started');
                          setStatusMenuOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-white/10 rounded-t-lg whitespace-nowrap ${
                          effectiveStatus === 'not_started' ? 'bg-white/5' : ''
                        }`}
                      >
                        <StatusBadge status="not_started" size="md" />
                      </button>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          await handleStatusChange('planning');
                          setStatusMenuOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-white/10 whitespace-nowrap ${
                          effectiveStatus === 'planning' ? 'bg-white/5' : ''
                        }`}
                      >
                        <StatusBadge status="planning" size="md" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowProjectBlockerModal(true);
                          setStatusMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-white/10 rounded-b-lg whitespace-nowrap"
                      >
                        <StatusBadge status="blocked" size="md" />
                      </button>
                    </div>
                  )}
                  
                </div>
              ) : (
                // When status cannot be manually changed, show appropriate badge
                effectiveStatus === 'post_event' ? (
                  // Check if awaiting owner review (purple Invoice badge)
                  project.postEventReport?.status === 'submitted' && !project.postEventReport.ownerReviewed ? (
                    <div className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-purple-500/10 border border-purple-500/30 animate-pulse">
                      <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="text-sm font-semibold text-purple-400">Invoice</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-orange-500/10 border border-orange-500/30 animate-pulse">
                      <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm font-semibold text-orange-400">Sign-Off</span>
                    </div>
                  )
                ) : (
                  <StatusBadge status={effectiveStatus} size="md" />
                )
              )}
               {project.projectManager && (
                 <div className="flex items-center gap-2 ml-2 px-3 py-1 bg-white/5 rounded-lg border border-white/10">
                   <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                   </svg>
                   <span className="text-sm text-cyan-400">{project.projectManager}</span>
                 </div>
               )}
               {/* Team member avatars */}
               {project.assignees && project.assignees.length > 0 && (
                 <div className="flex items-center gap-1 ml-2">
                   <span className="text-xs text-gray-500 mr-1">Team:</span>
                   {project.assignees.slice(0, 4).map((name: string, idx: number) => {
                     const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                     return (
                       <div
                         key={idx}
                         className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-xs font-semibold border-2 border-gray-900"
                         title={name}
                       >
                         {initials}
                       </div>
                     );
                   })}
                   {project.assignees.length > 4 && (
                     <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white text-xs font-semibold border-2 border-gray-900">
                       +{project.assignees.length - 4}
                     </div>
                   )}
                 </div>
               )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Schedule actions */}
            {!isCompleted && (
              <div className="relative schedule-dropdown-container">
                <button
                  onClick={(e) => { e.stopPropagation(); setScheduleMenuOpen(!scheduleMenuOpen); }}
                  className="px-3 py-2 text-sm text-cyan-400 bg-white/5 border border-cyan-500/30 rounded-lg hover:bg-cyan-500/10 flex items-center gap-2"
                  title="Generate schedule items"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3M3 11h18M5 19h14a2 2 0 002-2v-6H3v6a2 2 0 002 2z" />
                  </svg>
                  Schedule
                  <svg className={`w-3 h-3 transition-transform ${scheduleMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {scheduleMenuOpen && (
                  <div className="absolute right-0 top-full mt-1 min-w-[220px] bg-[rgba(20,20,30,0.95)] backdrop-blur-sm border border-white/10 rounded-lg shadow-lg z-30 overflow-hidden">
                    <button
                      onClick={handleCreateProjectHold}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-white/10 text-white flex items-center gap-2"
                    >
                      <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3M3 11h18M5 19h14a2 2 0 002-2v-6H3v6a2 2 0 002 2z" />
                      </svg>
                      Create Project Hold
                    </button>
                    <button
                      onClick={handleGenerateTentativeShifts}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-white/10 text-white flex items-center gap-2"
                    >
                      <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Create Soft Shifts
                    </button>
                  </div>
                )}
              </div>
            )}
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
            { id: 'activity', label: 'Activity' },
          ]}
          activeTab={activeTab}
          onChange={setActiveTab}
        />

        {/* Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left column - Metadata */}
            <div className="lg:col-span-2 space-y-6">
              {/* Mark Complete Button - Only in post_event status */}
              {canMarkComplete(project) && (
                <Card className="border-2 border-red-500/30 bg-gradient-to-br from-red-500/10 to-transparent">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                      <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white mb-1">Post-Event Sign-Off Required</h3>
                      <p className="text-sm text-gray-300">Complete the post-event report and checklist to finalize this project.</p>
                    </div>
                  </div>
                  
                  {/* Owner Review Status */}
                  {project.postEventReport?.status === 'submitted' && project.postEventReport.ownerReviewed && (
                    <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                      <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium mb-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Owner Approved - Ready to Invoice
                      </div>
                      <p className="text-xs text-gray-300">
                        Approved by {project.postEventReport.ownerReviewedByName} on {new Date((project.postEventReport.ownerReviewedAt as any)?.toDate?.() || project.postEventReport.ownerReviewedAt!).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                  
                  {/* PM Submission Status */}
                  {project.postEventReport && project.postEventReport.status === 'submitted' && !project.postEventReport.ownerReviewed ? (
                    <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                      <div className="flex items-center gap-2 text-amber-300 text-sm font-medium mb-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Awaiting Owner Review
                      </div>
                      <p className="text-xs text-amber-200">
                        Submitted by {project.postEventReport.signedByName} on {new Date((project.postEventReport.signedAt as any).toDate?.() || project.postEventReport.signedAt).toLocaleDateString()}
                      </p>
                    </div>
                  ) : project.postEventReport && project.postEventReport.status === 'submitted' ? (
                    <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                      <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium mb-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Post-Event Report Completed
                      </div>
                      <p className="text-xs text-gray-300">
                        Signed by {project.postEventReport.signedByName} on {new Date((project.postEventReport.signedAt as any).toDate?.() || project.postEventReport.signedAt).toLocaleDateString()}
                      </p>
                    </div>
                  ) : project.postEventReport ? (
                    <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                      <div className="flex items-center gap-2 text-amber-300 text-sm font-medium mb-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 18a9 9 0 110-18 9 9 0 010 18z" />
                        </svg>
                        Draft Saved — Submit to finalize
                      </div>
                      <p className="text-xs text-amber-200">Open the report to complete the checklist and sign before marking the project complete.</p>
                    </div>
                  ) : (
                    <div className="mb-4 p-3 rounded-lg bg-white/5 border border-white/10">
                      <p className="text-xs font-medium text-gray-400 mb-2">Report Includes:</p>
                      <ul className="space-y-1 text-xs text-gray-300">
                        <li className="flex items-center gap-2">
                          <svg className="w-3 h-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                          Event summary and documentation
                        </li>
                        <li className="flex items-center gap-2">
                          <svg className="w-3 h-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                          Completion checklist (docs, photos, deliverables, invoicing)
                        </li>
                        <li className="flex items-center gap-2">
                          <svg className="w-3 h-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                          Project manager signature
                        </li>
                      </ul>
                    </div>
                  )}
                 <div className="space-y-2">
                   {/* PM can always view/edit report */}
                   <button
                     onClick={() => setShowPostEventReport(true)}
                     className="w-full px-4 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-all shadow-lg hover:shadow-red-500/20 flex items-center justify-center gap-2"
                   >
                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                     </svg>
                     {project.postEventReport ? 'View Post-Event Report' : 'Complete Post-Event Report'}
                   </button>
                   
                   {/* Owner review button - only if submitted and not yet reviewed */}
                   {isOwner && project.postEventReport?.status === 'submitted' && !project.postEventReport.ownerReviewed && (
                     <button
                       onClick={async () => {
                         try {
                           const updatedReport = {
                             ...project.postEventReport!,
                             ownerReviewed: true,
                             ownerReviewedBy: uid,
                             ownerReviewedByName: currentUserMember?.name || 'Owner',
                             ownerReviewedAt: new Date(),
                           };
                           
                           // Save pending changes first
                           if (hasUnsavedChanges && Object.keys(pendingChanges).length > 0) {
                             await updateProject(uid, project.id, pendingChanges as any);
                           }
                           
                           // Update report and mark project as complete
                           await updateProject(uid, project.id, { 
                             postEventReport: updatedReport,
                             status: 'completed'
                           });
                           
                           // Log the approval
                           await logActivity(
                             uid,
                             'project',
                             project.id,
                             project.title,
                             'status_changed',
                             {
                               description: 'Post-Event Report approved and project marked complete',
                               changes: { 
                                 ownerReviewed: { from: false, to: true },
                                 status: { from: project.status, to: 'completed' }
                               }
                             }
                           );
                           
                           // Delete related notifications (project is complete)
                           if (orgId) {
                             try {
                               await deleteNotificationsForEntity(orgId, 'project', project.id);
                             } catch (err) {
                               console.error('Failed to delete notifications:', err);
                             }
                           }
                           
                           setProject(prev => ({ ...prev, postEventReport: updatedReport, status: 'completed' } as any));
                           showToast('Report approved and project marked complete!', 'success');
                         } catch (err) {
                           showToast('Failed to approve report', 'error');
                         }
                       }}
                       className="w-full px-4 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg transition-all shadow-lg hover:shadow-emerald-500/20 flex items-center justify-center gap-2"
                     >
                       <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                       </svg>
                       Approve & Complete Project
                     </button>
                   )}
                   
                   {project.postEventReport?.status === 'submitted' && (
                     <>
                       <button
                         onClick={() => {
                           generatePostEventReportPDF(project, project.postEventReport!);
                         }}
                         className="w-full px-4 py-3 bg-white/5 border border-red-500/40 text-red-300 hover:bg-red-500/10 rounded-lg transition-all flex items-center justify-center gap-2"
                       >
                         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                         </svg>
                         Download PDF Report
                       </button>
                     </>
                   )}
                 </div>
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
                      {editingField === 'r2Number' && !isCompleted ? (
                        <input
                          ref={el => inputRefs.current[0] = el}
                          autoFocus
                          defaultValue={project.r2Number || ''}
                          onBlur={(e) => handleUpdate('r2Number', e.target.value.trim() || null)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || (e.key === 'Tab' && !e.shiftKey)) {
                              e.preventDefault();
                              const idx = 0;
                              const nextField = fieldOrder[idx + 1];
                              handleUpdate('r2Number', (e.target as HTMLInputElement).value.trim() || null, nextField);
                            } else if (e.key === 'Tab' && e.shiftKey) {
                              e.preventDefault();
                              const idx = 0;
                              const prevField = fieldOrder[idx - 1];
                              handleUpdate('r2Number', (e.target as HTMLInputElement).value.trim() || null, prevField);
                            }
                            if (e.key === 'Escape') setEditingField(null);
                          }}
                          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-cyan-500 text-white focus:outline-none"
                        />
                      ) : (
                        <div
                          onClick={() => !isCompleted && setEditingField('r2Number')}
                          className={`px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white ${!isCompleted ? 'cursor-pointer hover:border-cyan-500/50' : 'cursor-default opacity-70'}`}
                        >
                          {project.r2Number || 'Not set'}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Project Manager</label>
                      {editingField === 'projectManager' && !isCompleted ? (
                        <select
                          ref={el => inputRefs.current[1] = el}
                          autoFocus
                          value={project.projectManager || ''}
                          onChange={(e) => handleUpdate('projectManager', e.target.value || null)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || (e.key === 'Tab' && !e.shiftKey)) {
                              e.preventDefault();
                              const idx = 1;
                              const nextField = fieldOrder[idx + 1];
                              handleUpdate('projectManager', (e.target as HTMLSelectElement).value || null, nextField);
                            } else if (e.key === 'Tab' && e.shiftKey) {
                              e.preventDefault();
                              const idx = 1;
                              const prevField = fieldOrder[idx - 1];
                              handleUpdate('projectManager', (e.target as HTMLSelectElement).value || null, prevField);
                            }
                            if (e.key === 'Escape') setEditingField(null);
                          }}
                          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-cyan-500 text-white focus:outline-none [&>option]:bg-gray-900 [&>option]:text-white"
                        >
                          <option value="">— Not assigned —</option>
                          {teamMembers?.filter(m => m.active).map((member) => (
                            <option key={member.id} value={member.name}>
                              {member.name} {member.title ? `(${member.title})` : ''}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div
                          onClick={() => !isCompleted && setEditingField('projectManager')}
                          className={`px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white ${!isCompleted ? 'cursor-pointer hover:border-cyan-500/50' : 'cursor-default opacity-70'}`}
                        >
                          {project.projectManager || 'Not assigned'}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Prep Date</label>
                      {editingField === 'prepDate' && !isCompleted ? (
                        <input
                          type="datetime-local"
                          ref={el => inputRefs.current[2] = el}
                          autoFocus
                          defaultValue={toDateInput(project.prepDate)}
                          onBlur={(e) => handleUpdate('prepDate', e.target.value || null)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || (e.key === 'Tab' && !e.shiftKey)) {
                              e.preventDefault();
                              const idx = 2;
                              const nextField = fieldOrder[idx + 1];
                              handleUpdate('prepDate', (e.target as HTMLInputElement).value || null, nextField);
                            } else if (e.key === 'Tab' && e.shiftKey) {
                              e.preventDefault();
                              const idx = 2;
                              const prevField = fieldOrder[idx - 1];
                              handleUpdate('prepDate', (e.target as HTMLInputElement).value || null, prevField);
                            }
                            if (e.key === 'Escape') setEditingField(null);
                          }}
                          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-cyan-500 text-white focus:outline-none"
                        />
                      ) : (
                        <div
                          onClick={() => !isCompleted && setEditingField('prepDate')}
                          className={`px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white ${!isCompleted ? 'cursor-pointer hover:border-cyan-500/50' : 'cursor-default opacity-70'}`}
                        >
                          {formatDate(project.prepDate)}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Ship Date</label>
                      {editingField === 'shipDate' && !isCompleted ? (
                        <input
                          type="datetime-local"
                          ref={el => inputRefs.current[3] = el}
                          autoFocus
                          defaultValue={toDateInput(project.shipDate)}
                          onBlur={(e) => handleUpdate('shipDate', e.target.value || null)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || (e.key === 'Tab' && !e.shiftKey)) {
                              e.preventDefault();
                              const idx = 3;
                              const nextField = fieldOrder[idx + 1];
                              handleUpdate('shipDate', (e.target as HTMLInputElement).value || null, nextField);
                            } else if (e.key === 'Tab' && e.shiftKey) {
                              e.preventDefault();
                              const idx = 3;
                              const prevField = fieldOrder[idx - 1];
                              handleUpdate('shipDate', (e.target as HTMLInputElement).value || null, prevField);
                            }
                            if (e.key === 'Escape') setEditingField(null);
                          }}
                          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-cyan-500 text-white focus:outline-none"
                        />
                      ) : (
                        <div
                          onClick={() => !isCompleted && setEditingField('shipDate')}
                          className={`px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white ${!isCompleted ? 'cursor-pointer hover:border-cyan-500/50' : 'cursor-default opacity-70'}`}
                        >
                          {formatDate(project.shipDate)}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Load-In Date</label>
                      {editingField === 'loadInDate' && !isCompleted ? (
                        <input
                          type="datetime-local"
                          ref={el => inputRefs.current[4] = el}
                          autoFocus
                          defaultValue={toDateInput(project.loadInDate)}
                          onBlur={(e) => handleUpdate('loadInDate', e.target.value || null)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || (e.key === 'Tab' && !e.shiftKey)) {
                              e.preventDefault();
                              const idx = 4;
                              const nextField = fieldOrder[idx + 1];
                              handleUpdate('loadInDate', (e.target as HTMLInputElement).value || null, nextField);
                            } else if (e.key === 'Tab' && e.shiftKey) {
                              e.preventDefault();
                              const idx = 4;
                              const prevField = fieldOrder[idx - 1];
                              handleUpdate('loadInDate', (e.target as HTMLInputElement).value || null, prevField);
                            }
                            if (e.key === 'Escape') setEditingField(null);
                          }}
                          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-cyan-500 text-white focus:outline-none"
                        />
                      ) : (
                        <div
                          onClick={() => !isCompleted && setEditingField('loadInDate')}
                          className={`px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white ${!isCompleted ? 'cursor-pointer hover:border-cyan-500/50' : 'cursor-default opacity-70'}`}
                        >
                          {formatDate(project.loadInDate)}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Event Begin</label>
                      {editingField === 'eventBeginDate' && !isCompleted ? (
                        <input
                          type="datetime-local"
                          ref={el => inputRefs.current[5] = el}
                          autoFocus
                          defaultValue={toDateInput(project.eventBeginDate)}
                          onBlur={(e) => handleUpdate('eventBeginDate', e.target.value || null)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || (e.key === 'Tab' && !e.shiftKey)) {
                              e.preventDefault();
                              const idx = 5;
                              const nextField = fieldOrder[idx + 1];
                              handleUpdate('eventBeginDate', (e.target as HTMLInputElement).value || null, nextField);
                            } else if (e.key === 'Tab' && e.shiftKey) {
                              e.preventDefault();
                              const idx = 5;
                              const prevField = fieldOrder[idx - 1];
                              handleUpdate('eventBeginDate', (e.target as HTMLInputElement).value || null, prevField);
                            }
                            if (e.key === 'Escape') setEditingField(null);
                          }}
                          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-cyan-500 text-white focus:outline-none"
                        />
                      ) : (
                        <div
                          onClick={() => !isCompleted && setEditingField('eventBeginDate')}
                          className={`px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white ${!isCompleted ? 'cursor-pointer hover:border-cyan-500/50' : 'cursor-default opacity-70'}`}
                        >
                          {formatDate(project.eventBeginDate)}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Event End</label>
                      {editingField === 'eventEndDate' && !isCompleted ? (
                        <input
                          type="datetime-local"
                          ref={el => inputRefs.current[6] = el}
                          autoFocus
                          defaultValue={toDateInput(project.eventEndDate)}
                          onBlur={(e) => handleUpdate('eventEndDate', e.target.value || null)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || (e.key === 'Tab' && !e.shiftKey)) {
                              e.preventDefault();
                              const idx = 6;
                              const nextField = fieldOrder[idx + 1];
                              handleUpdate('eventEndDate', (e.target as HTMLInputElement).value || null, nextField);
                            } else if (e.key === 'Tab' && e.shiftKey) {
                              e.preventDefault();
                              const idx = 6;
                              const prevField = fieldOrder[idx - 1];
                              handleUpdate('eventEndDate', (e.target as HTMLInputElement).value || null, prevField);
                            }
                            if (e.key === 'Escape') setEditingField(null);
                          }}
                          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-cyan-500 text-white focus:outline-none"
                        />
                      ) : (
                        <div
                          onClick={() => !isCompleted && setEditingField('eventEndDate')}
                          className={`px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white ${!isCompleted ? 'cursor-pointer hover:border-cyan-500/50' : 'cursor-default opacity-70'}`}
                        >
                          {formatDate(project.eventEndDate)}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Strike</label>
                      {editingField === 'strikeDate' && !isCompleted ? (
                        <input
                          type="datetime-local"
                          ref={el => inputRefs.current[7] = el}
                          autoFocus
                          defaultValue={toDateInput(project.strikeDate)}
                          onBlur={(e) => handleUpdate('strikeDate', e.target.value || null)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || (e.key === 'Tab' && !e.shiftKey)) {
                              e.preventDefault();
                              const idx = 7;
                              const nextField = fieldOrder[idx + 1];
                              handleUpdate('strikeDate', (e.target as HTMLInputElement).value || null, nextField);
                            } else if (e.key === 'Tab' && e.shiftKey) {
                              e.preventDefault();
                              const idx = 7;
                              const prevField = fieldOrder[idx - 1];
                              handleUpdate('strikeDate', (e.target as HTMLInputElement).value || null, prevField);
                            }
                            if (e.key === 'Escape') setEditingField(null);
                          }}
                          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-cyan-500 text-white focus:outline-none"
                        />
                      ) : (
                        <div
                          onClick={() => !isCompleted && setEditingField('strikeDate')}
                          className={`px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white ${!isCompleted ? 'cursor-pointer hover:border-cyan-500/50' : 'cursor-default opacity-70'}`}
                        >
                          {formatDate(project.strikeDate)}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Pickup</label>
                      {editingField === 'pickupDate' && !isCompleted ? (
                        <input
                          type="datetime-local"
                          ref={el => inputRefs.current[8] = el}
                          autoFocus
                          defaultValue={toDateInput(project.pickupDate)}
                          onBlur={(e) => handleUpdate('pickupDate', e.target.value || null)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || (e.key === 'Tab' && !e.shiftKey)) {
                              e.preventDefault();
                              const idx = 8;
                              const nextField = fieldOrder[idx + 1];
                              handleUpdate('pickupDate', (e.target as HTMLInputElement).value || null, nextField);
                            } else if (e.key === 'Tab' && e.shiftKey) {
                              e.preventDefault();
                              const idx = 8;
                              const prevField = fieldOrder[idx - 1];
                              handleUpdate('pickupDate', (e.target as HTMLInputElement).value || null, prevField);
                            }
                            if (e.key === 'Escape') setEditingField(null);
                          }}
                          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-cyan-500 text-white focus:outline-none"
                        />
                      ) : (
                        <div
                          onClick={() => !isCompleted && setEditingField('pickupDate')}
                          className={`px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white ${!isCompleted ? 'cursor-pointer hover:border-cyan-500/50' : 'cursor-default opacity-70'}`}
                        >
                          {formatDate(project.pickupDate)}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Return</label>
                      {editingField === 'returnDate' && !isCompleted ? (
                        <input
                          type="datetime-local"
                          ref={el => inputRefs.current[9] = el}
                          autoFocus
                          defaultValue={toDateInput(project.returnDate)}
                          onBlur={(e) => handleUpdate('returnDate', e.target.value || null)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || (e.key === 'Tab' && !e.shiftKey)) {
                              e.preventDefault();
                              const idx = 9;
                              const nextField = fieldOrder[idx + 1];
                              handleUpdate('returnDate', (e.target as HTMLInputElement).value || null, nextField);
                              if (!nextField) (e.target as HTMLInputElement).blur();
                            } else if (e.key === 'Tab' && e.shiftKey) {
                              e.preventDefault();
                              const idx = 9;
                              const prevField = fieldOrder[idx - 1];
                              handleUpdate('returnDate', (e.target as HTMLInputElement).value || null, prevField);
                            }
                            if (e.key === 'Escape') setEditingField(null);
                          }}
                          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-cyan-500 text-white focus:outline-none"
                        />
                      ) : (
                        <div
                          onClick={() => !isCompleted && setEditingField('returnDate')}
                          className={`px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white ${!isCompleted ? 'cursor-pointer hover:border-cyan-500/50' : 'cursor-default opacity-70'}`}
                        >
                          {formatDate(project.returnDate)}
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Client / Venue */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Client</label>
                      {isCompleted ? (
                        <div className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white cursor-default opacity-70">
                          {clients?.find(c => c.id === project.clientId)?.name || 'Not set'}
                        </div>
                      ) : (
                        <>
                          <Autocomplete
                            value={project.clientId || null}
                            options={(clients || []).map(c => ({
                              id: c.id as string,
                              label: c.name,
                              sublabel: c.contactName || undefined,
                            }))}
                            onChange={(value) => handleUpdate('clientId', value)}
                            onCreateNew={handleOpenClientModal}
                            placeholder="Search clients..."
                            label="Client"
                            createNewLabel="+ Add New Client"
                          />
                          {project.clientId && (
                            <button
                              type="button"
                              onClick={handleEditClient}
                              className="mt-2 text-xs text-gray-400 hover:text-cyan-400 flex items-center gap-1"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Edit Client
                            </button>
                          )}
                        </>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Venue</label>
                      {isCompleted ? (
                        <div className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white cursor-default opacity-70">
                          {venues?.find(v => v.id === project.venueId)?.name || 'Not set'}
                        </div>
                      ) : (
                        <>
                          <Autocomplete
                            value={project.venueId || null}
                            options={(venues || []).map(v => ({
                              id: v.id as string,
                              label: v.name,
                              sublabel: v.city && v.state ? `${v.city}, ${v.state}` : undefined,
                            }))}
                            onChange={(value) => handleUpdate('venueId', value)}
                            onCreateNew={handleOpenVenueModal}
                            placeholder="Search venues..."
                            label="Venue"
                            createNewLabel="+ Add New Venue"
                          />
                          {project.venueId && (
                            <button
                              type="button"
                              onClick={handleEditVenue}
                              className="mt-2 text-xs text-gray-400 hover:text-cyan-400 flex items-center gap-1"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Edit Venue
                            </button>
                          )}
                        </>
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
            {/* Arrange controls */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-400">Arrange by:</label>
                <select
                  value={arrangeBy}
                  onChange={(e) => setArrangeBy(e.target.value)}
                  className="px-3 py-1.5 text-sm bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-cyan-500/40 [&>option]:bg-gray-900"
                >
                  <option value="age">Created</option>
                  <option value="status">Status</option>
                  <option value="title">Title</option>
                  <option value="dueDate">Due Date</option>
                  <option value="priority">Priority</option>
                  <option value="assigned">Assignee</option>
                </select>
                <button
                  onClick={() => setReverseOrder(!reverseOrder)}
                  className="p-1.5 text-gray-400 hover:text-cyan-400 hover:bg-white/5 rounded transition-colors"
                  title={reverseOrder ? 'Reverse order (descending)' : 'Normal order (ascending)'}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {reverseOrder ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                    )}
                  </svg>
                </button>
              </div>
            </div>

            {/* Quick Add Task - hide for completed projects */}
            {!isCompleted && (
              <Card className="overflow-visible">
                <form onSubmit={handleQuickAddTask} className="flex items-center gap-3">
                  <input
                    type="text"
                    placeholder="Add a new task to this project..."
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') setNewTaskTitle('');
                    }}
                    disabled={creatingTask}
                    className="flex-1 bg-transparent border border-white/10 rounded px-3 py-2 text-gray-200 placeholder-gray-500 hover:bg-white/5 focus:outline-none focus:ring-1 focus:ring-cyan-500/40"
                  />
                  <button
                    type="submit"
                    disabled={creatingTask || !newTaskTitle.trim()}
                    className="px-3 py-2 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium disabled:opacity-50"
                  >
                    {creatingTask ? 'Adding…' : 'Add Task'}
                  </button>
                </form>
              </Card>
            )}
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
                    <ul className="space-y-2">
                      {activeTasks.map((t) => (
                        <li key={t.id} className="relative">
                          {editingTaskId === t.id ? (
                            <div className="mt-2">
                              <TaskEditForm
                                uid={uid}
                                task={t}
                                allProjects={allProjects}
                                onSave={() => setEditingTaskId(null)}
                                onCancel={() => setEditingTaskId(null)}
                                onDelete={async () => {
                                  const action = async () => {
                                    const { removeTask } = await import('../../services/tasks');
                                    await removeTask(uid, t.id);
                                    setEditingTaskId(null);
                                  };
                                  setConfirmMessage('Delete this task?');
                                  setConfirmAction(() => action);
                                  setConfirmOpen(true);
                                }}
                                onArchive={async () => {
                                  const { archiveTask } = await import('../../services/tasks');
                                  await archiveTask(uid, t.id);
                                }}
                                onUnarchive={async () => {
                                  const { unarchiveTask } = await import('../../services/tasks');
                                  await unarchiveTask(uid, t.id);
                                }}
                                onStatusChange={async (newStatus) => {
                                  const { updateTask } = await import('../../services/tasks');
                                  await updateTask(uid, t.id, { status: newStatus });
                                }}
                              />
                            </div>
                          ) : (
                            <TaskItem
                              uid={uid}
                              task={t}
                              allTasks={projectTasks}
                              onStartEdit={() => setEditingTaskId(t.id)}
                              onManageBlockers={() => setBlockerManagerTask({ id: t.id, title: t.title, type: 'task' })}
                              onStartBlock={() => setBlockerModalTask({ id: t.id, title: t.title, type: 'task' })}
                              onArchive={async () => {
                                const { archiveTask } = await import('../../services/tasks');
                                await archiveTask(uid, t.id);
                              }}
                              onDelete={async () => {
                                const action = async () => {
                                  const { removeTask } = await import('../../services/tasks');
                                  await removeTask(uid, t.id);
                                };
                                setConfirmMessage('Delete this task?');
                                setConfirmAction(() => action);
                                setConfirmOpen(true);
                              }}
                              onUnarchive={async () => {
                                const { unarchiveTask } = await import('../../services/tasks');
                                await unarchiveTask(uid, t.id);
                              }}
                              onStatusChange={async (newStatus) => {
                                const { updateTask } = await import('../../services/tasks');
                                await updateTask(uid, t.id, { status: newStatus });
                              }}
                              onUndo={async () => {
                                const { undoLastChange } = await import('../../services/undo');
                                return await undoLastChange(uid, 'task', t.id);
                              }}
                            />
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {completedTasks.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-3">Completed Tasks ({completedTasks.length})</h3>
                    <ul className="space-y-2">
                      {completedTasks.map((t) => (
                        <li key={t.id} className="relative opacity-90">
                          {editingTaskId === t.id ? (
                            <div className="mt-2">
                              <TaskEditForm
                                uid={uid}
                                task={t}
                                allProjects={allProjects}
                                onSave={() => setEditingTaskId(null)}
                                onCancel={() => setEditingTaskId(null)}
                                onDelete={async () => {
                                  const action = async () => {
                                    const { removeTask } = await import('../../services/tasks');
                                    await removeTask(uid, t.id);
                                    setEditingTaskId(null);
                                  };
                                  setConfirmMessage('Delete this task?');
                                  setConfirmAction(() => action);
                                  setConfirmOpen(true);
                                }}
                                onArchive={async () => {
                                  const { archiveTask } = await import('../../services/tasks');
                                  await archiveTask(uid, t.id);
                                }}
                                onUnarchive={async () => {
                                  const { unarchiveTask } = await import('../../services/tasks');
                                  await unarchiveTask(uid, t.id);
                                }}
                                onStatusChange={async (newStatus) => {
                                  const { updateTask } = await import('../../services/tasks');
                                  await updateTask(uid, t.id, { status: newStatus });
                                }}
                              />
                            </div>
                          ) : (
                            <TaskItem
                              uid={uid}
                              task={t}
                              allTasks={projectTasks}
                              onStartEdit={() => setEditingTaskId(t.id)}
                              onManageBlockers={() => setBlockerManagerTask({ id: t.id, title: t.title, type: 'task' })}
                              onStartBlock={() => setBlockerModalTask({ id: t.id, title: t.title, type: 'task' })}
                              onArchive={async () => {
                                const { archiveTask } = await import('../../services/tasks');
                                await archiveTask(uid, t.id);
                              }}
                              onDelete={async () => {
                                const action = async () => {
                                  const { removeTask } = await import('../../services/tasks');
                                  await removeTask(uid, t.id);
                                };
                                setConfirmMessage('Delete this task?');
                                setConfirmAction(() => action);
                                setConfirmOpen(true);
                              }}
                              onUnarchive={async () => {
                                const { unarchiveTask } = await import('../../services/tasks');
                                await unarchiveTask(uid, t.id);
                              }}
                              onStatusChange={async (newStatus) => {
                                const { updateTask } = await import('../../services/tasks');
                                await updateTask(uid, t.id, { status: newStatus });
                              }}
                              onUndo={async () => {
                                const { undoLastChange } = await import('../../services/undo');
                                return await undoLastChange(uid, 'task', t.id);
                              }}
                            />
                          )}
                        </li>
                      ))}
                    </ul>
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
          <Card className="team-member-dropdown-container">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-400">Project Team</h3>
                {!isCompleted && (
                  <button
                    onClick={() => setShowTeamMemberDropdown(!showTeamMemberDropdown)}
                    className="px-3 py-1.5 text-sm text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 rounded-lg flex items-center gap-1 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Team Member
                  </button>
                )}
              </div>

              {showTeamMemberDropdown && (
                <div className="p-3 bg-white/5 rounded-lg border border-cyan-500/30">
                  <select
                    value=""
                    onChange={(e) => {
                      if (e.target.value) {
                        const currentAssignees = project.assignees || [];
                        if (!currentAssignees.includes(e.target.value)) {
                          handleUpdate('assignees', [...currentAssignees, e.target.value]);
                        }
                        setShowTeamMemberDropdown(false);
                      }
                    }}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-cyan-500 text-white focus:outline-none text-sm [&>option]:bg-gray-900"
                  >
                    <option value="">Select team member...</option>
                    {teamMembers?.filter(m => m.active && !(project.assignees || []).includes(m.name)).map((member) => (
                      <option key={member.id} value={member.name}>
                        {member.name} {member.title ? `(${member.title})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Project Manager */}
              {project.projectManager && (
                <div>
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Project Manager</h4>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="text-white font-medium">{project.projectManager}</div>
                      <div className="text-xs text-cyan-400">Project Manager</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Team Members */}
              <div>
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                  Team Members {project.assignees && project.assignees.length > 0 && `(${project.assignees.length})`}
                </h4>
                <div className="space-y-2">
                  {(!project.assignees || project.assignees.length === 0) ? (
                    <div className="text-center py-12 text-gray-400 bg-white/5 rounded-lg border border-dashed border-white/10">
                      <svg className="w-12 h-12 mx-auto mb-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <p className="text-sm">No team members assigned</p>
                      <p className="text-xs mt-1">Click &quot;Add Team Member&quot; to assign people to this project</p>
                    </div>
                  ) : (
                    project.assignees.map((memberName, idx) => {
                      const member = teamMembers?.find(m => m.name === memberName);
                      return (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group border border-white/10"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-sm font-medium">
                              {memberName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-white">{memberName}</div>
                              {member?.title && (
                                <div className="text-xs text-gray-400">{member.title}</div>
                              )}
                              {member?.role && (
                                <div className="text-xs text-cyan-400 capitalize">{member.role}</div>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              const newAssignees = (project.assignees || []).filter(a => a !== memberName);
                              handleUpdate('assignees', newAssignees.length > 0 ? newAssignees : undefined);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-all"
                            title="Remove from project"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </Card>
        )}

        {activeTab === 'activity' && (
          <Card>
            <h3 className="text-sm font-medium text-gray-400 mb-4">Project Activity</h3>
            <ActivityHistory
              uid={uid}
              entityType="project"
              entityId={project.id}
              venues={venues}
              clients={clients}
            />
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

      {/* Post-Event Report Modal */}
      <PostEventReportModal
        open={showPostEventReport}
        uid={uid}
        organizationId={orgId || uid}
        project={project}
        onClose={() => setShowPostEventReport(false)}
        onSaved={(report) => {
          setProject(prev => ({ ...prev, postEventReport: report } as any));
          showToast('Post-Event Report saved', 'success');
        }}
      />

      {/* Task Delete Confirm Modal */}
      <ConfirmModal
        open={confirmOpen}
        title="Confirm Delete"
        message={confirmMessage}
        confirmLabel="Delete"
        onConfirm={async () => {
          setConfirmOpen(false);
          try {
            if (confirmAction) await confirmAction();
          } finally {
            setConfirmAction(null);
            setConfirmMessage('');
          }
        }}
        onCancel={() => setConfirmOpen(false)}
      />

      {/* Blocker modals for task operations inside project modal */}
      {blockerModalTask && (
        <BlockerModal uid={uid} entity={blockerModalTask} onClose={() => setBlockerModalTask(null)} />
      )}
      {blockerManagerTask && (
        <BlockerManagerModal uid={uid} entity={blockerManagerTask} onClose={() => setBlockerManagerTask(null)} />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50"
          onClick={() => setDeleteConfirmOpen(false)}
        >
          <div
            className="bg-gray-800 rounded-lg border border-gray-700 shadow-2xl max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Delete Project?</h2>
              <p className="text-gray-300 mb-6">
                Are you sure you want to delete <span className="font-semibold text-white">{project.title}</span>? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirmOpen(false)}
                  className="flex-1 px-6 py-3 bg-gray-600 hover:bg-gray-500 rounded-lg font-medium text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-medium text-white transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Portal tooltip for blocked status */}
      {tooltipState.visible && tooltipState.blockerInfo && createPortal(
        <div
          style={{
            position: 'fixed',
            left: `${tooltipState.x}px`,
            top: `${tooltipState.y - 10}px`,
            transform: 'translate(-50%, -100%)',
            zIndex: 99999,
            pointerEvents: 'none'
          }}
          className="px-3 py-2 bg-gray-900/95 border border-red-500/30 rounded-lg shadow-xl w-64"
        >
          <div className="text-xs text-red-400 font-semibold mb-1">
            Blocked: {tooltipState.blockerInfo.firstReason}
          </div>
          {tooltipState.blockerInfo.firstBlocker?.waitingOn && (
            <div className="text-xs text-gray-300 mb-1">
              <span className="text-gray-400">Waiting on:</span> {tooltipState.blockerInfo.firstBlocker.waitingOn}
            </div>
          )}
          {tooltipState.blockerInfo.firstBlocker?.expectedDate && (
            <div className="text-xs text-gray-300 mb-1">
              <span className="text-gray-400">Expected:</span>{' '}
              {typeof tooltipState.blockerInfo.firstBlocker.expectedDate === 'object' && 'toDate' in tooltipState.blockerInfo.firstBlocker.expectedDate
                ? tooltipState.blockerInfo.firstBlocker.expectedDate.toDate().toLocaleDateString()
                : new Date(tooltipState.blockerInfo.firstBlocker.expectedDate).toLocaleDateString()}
            </div>
          )}
          {tooltipState.blockerInfo.extraCount > 0 && (
            <div className="text-xs text-gray-400 mt-1">
              +{tooltipState.blockerInfo.extraCount} more blocker{tooltipState.blockerInfo.extraCount > 1 ? 's' : ''}
            </div>
          )}
        </div>,
        document.body
      )}

      {/* Client Modal */}
      {showClientModal && (
        <ClientModal
          uid={uid}
          client={editingClient}
          prefillName={prefillClientName}
          onSave={handleSaveClient}
          onClose={handleCloseClientModal}
        />
      )}

      {/* Venue Modal */}
      {showVenueModal && (
        <VenueModal
          uid={uid}
          venue={editingVenue}
          prefillName={prefillVenueName}
          onSave={handleSaveVenue}
          onClose={handleCloseVenueModal}
        />
      )}
    </Modal>
  );
}
