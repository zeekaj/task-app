// src/components/views/ProjectsView.tsx
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Card } from '../ui/Card';
import { StatusBadge, Badge } from '../ui/Badge';
import { PillTabs } from '../ui/PillTabs';
import { useProjects } from '../../hooks/useProjects';
import { useTasks } from '../../hooks/useTasks';
import { useAllBlockers } from '../../hooks/useBlockers';
import { useClients } from '../../hooks/useClients';
import { useVenues } from '../../hooks/useVenues';
import { useTeamMembers } from '../../hooks/useTeamMembers';
import { computeProjectStatus, canManuallyChangeStatus } from '../../utils/projectStatus';
import { Modal } from '../shared/Modal';
import { Autocomplete } from '../shared/Autocomplete';
import { createProject, updateProject, archiveProject, deleteProject } from '../../services/projects';
import { createClient } from '../../services/clients';
import { createVenue } from '../../services/venues';
import type { ProjectStatus, WithId, Project, Blocker } from '../../types';
import { useToast } from '../shared/Toast';
import { ProjectDetailView } from './ProjectDetailView';
import { BlockerModal } from '../BlockerModal';
import { BlockerManagerModal } from '../BlockerManagerModal';

interface ProjectsViewProps {
  uid: string;
}

type ViewMode = 'cards' | 'list' | 'kanban';
type ProjectWithStatus = WithId<Project> & { effectiveStatus: ProjectStatus };

export function ProjectsView({ uid }: ProjectsViewProps) {
  const projects = useProjects(uid);
  const allTasks = useTasks(uid);
  const allBlockers = useAllBlockers(uid);
  const members = useTeamMembers(uid);
  const [clients] = useClients(uid);
  const [venues] = useVenues(uid);
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  // Load view mode from localStorage, default to 'cards'
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('projectsViewMode');
    return (saved as ViewMode) || 'cards';
  });
  const [filterStatus, setFilterStatus] = useState<ProjectStatus | 'all'>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<WithId<Project> | null>(null);
  const [title, setTitle] = useState('');
  const [prepDate, setPrepDate] = useState(''); // YYYY-MM-DD
  const [returnDate, setReturnDate] = useState('');
  const [projectManager, setProjectManager] = useState('');
  const [r2Number, setR2Number] = useState('');
  const [clientId, setClientId] = useState('');
  const [venueId, setVenueId] = useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<{ id: string; title: string } | null>(null);
  const [blockerModalProject, setBlockerModalProject] = useState<{ id: string; title: string } | null>(null);
  const [blockerManagerProject, setBlockerManagerProject] = useState<{ id: string; title: string } | null>(null);

  // Save view mode to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('projectsViewMode', viewMode);
  }, [viewMode]);

  useEffect(() => {
    if (projects) {
      setLoading(false);
    }
  }, [projects]);

  // Check for openProjectId from notification click
  useEffect(() => {
    const openProjectId = localStorage.getItem('openProjectId');
    if (openProjectId && projects) {
      const projectToOpen = projects.find(p => p.id === openProjectId);
      if (projectToOpen) {
        setSelectedProject(projectToOpen);
        localStorage.removeItem('openProjectId');
      }
    }
  }, [projects]);

  // Delete handlers for child components
  const handleDeleteRequest = (projectId: string, title: string) => {
    setProjectToDelete({ id: projectId, title });
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!projectToDelete) return;
    try {
      await deleteProject(uid, projectToDelete.id);
      toast.success(`Deleted ${projectToDelete.title}`);
      setDeleteConfirmOpen(false);
      setProjectToDelete(null);
    } catch (err) {
      toast.error('Failed to delete project');
    }
  };

  // Compute effective status for each project
  const projectsWithStatus: ProjectWithStatus[] = projects?.map((p: WithId<Project>) => ({
    ...p,
    effectiveStatus: computeProjectStatus(p),
  })) || [];

  // Filter projects - exclude completed by default unless explicitly filtering for completed
  const filteredProjects = filterStatus === 'all' 
    ? projectsWithStatus.filter((p: ProjectWithStatus) => p.effectiveStatus !== 'completed')
    : projectsWithStatus.filter((p: ProjectWithStatus) => p.effectiveStatus === filterStatus);

  // Helper function to get task counts for a project
  const getTaskCounts = (projectId: string) => {
    if (!allTasks) return { total: 0, completed: 0 };
    const projectTasks = allTasks.filter(t => t.projectId === projectId);
    const completed = projectTasks.filter(t => t.status === 'done').length;
    return { total: projectTasks.length, completed };
  };

  const clientNameById: Record<string, string> = Object.fromEntries((clients || []).map((c: any) => [c.id, c.name]));
  const venueNameById: Record<string, string> = Object.fromEntries((venues || []).map((v: any) => [v.id, v.name]));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-400">Loading projects...</div>
      </div>
    );
  }

  if (!projects || projects.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Projects</h2>
          <button onClick={() => setCreateOpen(true)} className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg font-medium hover:from-cyan-600 hover:to-blue-600 transition-all duration-200" title="Create new project">
            + New Project
          </button>
        </div>
        <Card>
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-800 rounded-xl mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No projects yet</h3>
            <p className="text-gray-400 mb-6">Create your first project to get started</p>
            <button onClick={() => setCreateOpen(true)} className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg font-medium hover:from-cyan-600 hover:to-blue-600 transition-all duration-200">
              Create Project
            </button>
          </div>
        </Card>

        <CreateProjectModal
          uid={uid}
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onCreate={async () => {
            if (!title.trim()) return;
            const id = await createProject(uid, title.trim());
            const payload: any = {};
            if (prepDate) payload.prepDate = prepDate;
            if (returnDate) payload.returnDate = returnDate;
            if (projectManager) payload.projectManager = projectManager;
            if (r2Number) {
              payload.r2Number = r2Number;
              payload.orderId = r2Number;
            }
            if (clientId) payload.clientId = clientId;
            if (venueId) payload.venueId = venueId;
            if (Object.keys(payload).length) {
              await updateProject(uid, id, payload);
            }
            setTitle('');
            setPrepDate('');
            setReturnDate('');
            setProjectManager('');
            setR2Number('');
            setClientId('');
            setVenueId('');
            setCreateOpen(false);
          }}
          titleValue={title}
          onTitleChange={setTitle}
          prepDateValue={prepDate}
          onPrepDateChange={setPrepDate}
          returnDateValue={returnDate}
          onReturnDateChange={setReturnDate}
          projectManagerValue={projectManager}
          onProjectManagerChange={setProjectManager}
          r2NumberValue={r2Number}
          onR2NumberChange={setR2Number}
          clientIdValue={clientId}
          onClientIdChange={setClientId}
          venueIdValue={venueId}
          onVenueIdChange={setVenueId}
          teamMembers={members ? members.filter(m => m.active) : []}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Projects</h2>
        <div className="flex items-center gap-4">
          {/* View mode toggle */}
          <div className="flex items-center gap-2 bg-[rgba(20,20,30,0.6)] backdrop-blur-sm border border-white/10 rounded-lg p-1">
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1.5 rounded transition-all duration-200 ${
                viewMode === 'cards'
                  ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400'
                  : 'text-gray-400 hover:text-white'
              }`}
              title="Cards View"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded transition-all duration-200 ${
                viewMode === 'list'
                  ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400'
                  : 'text-gray-400 hover:text-white'
              }`}
              title="List View"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1.5 rounded transition-all duration-200 ${
                viewMode === 'kanban'
                  ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400'
                  : 'text-gray-400 hover:text-white'
              }`}
              title="Kanban View"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
            </button>
          </div>
          <button onClick={() => setCreateOpen(true)} className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg font-medium hover:from-cyan-600 hover:to-blue-600 transition-all duration-200" title="Create new project">
            + New Project
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <PillTabs
        tabs={[
          { id: 'all', label: 'All', count: projectsWithStatus.length },
          { id: 'not_started', label: 'Not Started', count: projectsWithStatus.filter((p: ProjectWithStatus) => p.effectiveStatus === 'not_started').length },
          { id: 'planning', label: 'Planning', count: projectsWithStatus.filter((p: ProjectWithStatus) => p.effectiveStatus === 'planning').length },
          { id: 'executing', label: 'Executing', count: projectsWithStatus.filter((p: ProjectWithStatus) => p.effectiveStatus === 'executing').length },
          { id: 'blocked', label: 'Blocked', count: projectsWithStatus.filter((p: ProjectWithStatus) => p.effectiveStatus === 'blocked').length },
          { id: 'post_event', label: 'Sign-Off', count: projectsWithStatus.filter((p: ProjectWithStatus) => p.effectiveStatus === 'post_event').length },
          { id: 'completed', label: 'Completed', count: projectsWithStatus.filter((p: ProjectWithStatus) => p.effectiveStatus === 'completed').length },
        ]}
        activeTab={filterStatus}
        onChange={(tab: string) => setFilterStatus(tab as ProjectStatus | 'all')}
      />

      {/* Content based on view mode */}
  {viewMode === 'cards' && <CardsView uid={uid} projects={filteredProjects} blockers={allBlockers as any[]} clientNameById={clientNameById} venueNameById={venueNameById} onProjectClick={setSelectedProject} onDelete={handleDeleteRequest} onBlock={(id: string, title: string) => setBlockerModalProject({ id, title })} onManageBlockers={(id: string, title: string) => setBlockerManagerProject({ id, title })} />}
  {viewMode === 'list' && <ListView uid={uid} projects={filteredProjects} blockers={allBlockers as any[]} clientNameById={clientNameById} venueNameById={venueNameById} getTaskCounts={getTaskCounts} onProjectClick={setSelectedProject} onDelete={handleDeleteRequest} onBlock={(id: string, title: string) => setBlockerModalProject({ id, title })} onManageBlockers={(id: string, title: string) => setBlockerManagerProject({ id, title })} />}
  {viewMode === 'kanban' && <KanbanView projects={projectsWithStatus} onProjectClick={setSelectedProject} />}

      <CreateProjectModal
        uid={uid}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={async () => {
          if (!title.trim()) return;
          try {
            const id = await createProject(uid, title.trim());
            const payload: any = {};
            if (prepDate) payload.prepDate = prepDate;
            if (returnDate) payload.returnDate = returnDate;
            if (projectManager) payload.projectManager = projectManager;
            if (r2Number) {
              payload.r2Number = r2Number;
              payload.orderId = r2Number;
            }
            if (clientId) payload.clientId = clientId;
            if (venueId) payload.venueId = venueId;
            if (Object.keys(payload).length) {
              await updateProject(uid, id, payload);
            }
            toast.success('Project created');
            setTitle('');
            setPrepDate('');
            setReturnDate('');
            setProjectManager('');
            setR2Number('');
            setClientId('');
            setVenueId('');
            setCreateOpen(false);
          } catch (err) {
            toast.error('Failed to create project');
          }
        }}
        titleValue={title}
        onTitleChange={setTitle}
        prepDateValue={prepDate}
        onPrepDateChange={setPrepDate}
        returnDateValue={returnDate}
        onReturnDateChange={setReturnDate}
        projectManagerValue={projectManager}
        onProjectManagerChange={setProjectManager}
        r2NumberValue={r2Number}
        onR2NumberChange={setR2Number}
        clientIdValue={clientId}
        onClientIdChange={setClientId}
        venueIdValue={venueId}
        onVenueIdChange={setVenueId}
        teamMembers={members ? members.filter(m => m.active) : []}
      />

      {/* Project Detail Modal */}
      {selectedProject && (
        <ProjectDetailView
          uid={uid}
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
          onDeleted={() => setSelectedProject(null)}
        />
      )}

      {/* Blocker Modal for projects when setting status to Blocked */}
      {blockerModalProject && (
        <BlockerModal
          uid={uid}
          entity={{ id: blockerModalProject.id, title: blockerModalProject.title, type: 'project' }}
          onClose={() => setBlockerModalProject(null)}
        />
      )}

      {/* Blocker Manager for reviewing/clearing blockers */}
      {blockerManagerProject && (
        <BlockerManagerModal
          uid={uid}
          entity={{ id: blockerManagerProject.id, title: blockerManagerProject.title, type: 'project' }}
          onClose={() => setBlockerManagerProject(null)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmOpen && projectToDelete && (
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
                Are you sure you want to delete <span className="font-semibold text-white">{projectToDelete.title}</span>? This action cannot be undone.
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
    </div>
  );
}

// Cards View
function CardsView({ uid, projects, blockers, clientNameById, venueNameById, onProjectClick, onDelete, onBlock, onManageBlockers }: { 
  uid: string;
  projects: any[];
  blockers: WithId<Blocker>[];
  clientNameById: Record<string, string>;
  venueNameById: Record<string, string>;
  onProjectClick: (project: any) => void;
  onDelete: (projectId: string, title: string) => void;
  onBlock: (projectId: string, projectTitle: string) => void;
  onManageBlockers: (projectId: string, projectTitle: string) => void;
}) {
  const toast = useToast();
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [statusMenuOpen, setStatusMenuOpen] = useState<string | null>(null);
  const [tooltipState, setTooltipState] = useState<{ visible: boolean; projectId: string | null; x: number; y: number; blockerInfo: any }>({ 
    visible: false, 
    projectId: null, 
    x: 0, 
    y: 0, 
    blockerInfo: null 
  });

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.status-dropdown-container') && !target.closest('.menu-dropdown-container')) {
        setStatusMenuOpen(null);
        setMenuOpen(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleArchive = async (projectId: string, title: string) => {
    try {
      await archiveProject(uid, projectId);
      toast.success(`Archived ${title}`);
      setMenuOpen(null);
    } catch (err) {
      toast.error('Failed to archive project');
    }
  };

  const handleDelete = async (projectId: string, title: string) => {
    onDelete(projectId, title);
  };

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3`}>
      {projects.map(project => (
        <Card 
          key={project.id} 
          hover 
          className="p-0 overflow-hidden cursor-pointer flex"
          onClick={() => onProjectClick(project)}
        >
          {/* Status indicator vertical bar */}
          <div className={`w-1 ${getStatusColor(project.effectiveStatus)}`} />
          
          <div className="flex-1 p-3 space-y-1.5">
            {/* Line 1: Event Title */}
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-white truncate flex-1">
                {project.title}
              </h3>
            </div>

            {/* Line 2: Status + R2# + Menu */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="relative status-dropdown-container shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (project.effectiveStatus === 'blocked') {
                        onManageBlockers(project.id, project.title);
                        return;
                      }
                      if (!canManuallyChangeStatus(project)) {
                        return;
                      }
                      setStatusMenuOpen(statusMenuOpen === project.id ? null : project.id);
                    }}
                    className={`transition-opacity ${canManuallyChangeStatus(project) && project.effectiveStatus !== 'blocked' ? 'hover:opacity-80 cursor-pointer' : 'cursor-default'}`}
                  >
                    {project.effectiveStatus === 'blocked' ? (
                      (() => {
                        const active = (blockers || []).filter(b => b.entityType === 'project' && b.entityId === project.id && b.status === 'active');
                        const firstReason = active.length ? (typeof active[0].reason === 'object' ? JSON.stringify(active[0].reason) : (active[0].reason || 'Blocked')) : 'Blocked';
                        const extraCount = active.length > 1 ? active.length - 1 : 0;
                        const firstBlocker = active[0];
                        return (
                          <div
                            onMouseEnter={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setTooltipState({
                                visible: true,
                                projectId: project.id,
                                x: rect.left + rect.width / 2,
                                y: rect.top,
                                blockerInfo: { firstReason, firstBlocker, extraCount }
                              });
                            }}
                            onMouseLeave={() => setTooltipState({ visible: false, projectId: null, x: 0, y: 0, blockerInfo: null })}
                          >
                            <Badge color="red" size="sm" variant="solid" className="max-w-[120px] truncate">
                              <span className="font-semibold">BLOCKED</span>
                            </Badge>
                          </div>
                        );
                      })()
                    ) : project.effectiveStatus === 'post_event' ? (
                      // Check if awaiting owner review (purple Invoice badge)
                      project.postEventReport?.status === 'submitted' && !project.postEventReport.ownerReviewed ? (
                        <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-purple-500/10 border border-purple-500/30 animate-pulse">
                          <svg className="w-3.5 h-3.5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span className="text-xs font-semibold text-purple-400">Invoice</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-orange-500/10 border border-orange-500/30 animate-pulse">
                          <svg className="w-3.5 h-3.5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-xs font-semibold text-orange-400">Sign-Off</span>
                        </div>
                      )
                    ) : (
                      <StatusBadge status={project.effectiveStatus} size="sm" />
                    )}
                  </button>
                  {statusMenuOpen === project.id && project.effectiveStatus !== 'blocked' && canManuallyChangeStatus(project) && (
                    <div className="absolute left-0 mt-1 w-auto bg-[rgba(20,20,30,0.95)] backdrop-blur-sm border border-white/10 rounded-lg shadow-lg z-20">
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            await updateProject(uid, project.id, { status: 'not_started' });
                            toast.success('Status updated to Not Started');
                            setStatusMenuOpen(null);
                          } catch (err) {
                            toast.error('Failed to update status');
                          }
                        }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-white/10 rounded-t-lg whitespace-nowrap ${
                          project.effectiveStatus === 'not_started' ? 'bg-white/5' : ''
                        }`}
                      >
                        <StatusBadge status="not_started" size="sm" />
                      </button>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            await updateProject(uid, project.id, { status: 'planning' });
                            toast.success('Status updated to Planning');
                            setStatusMenuOpen(null);
                          } catch (err) {
                            toast.error('Failed to update status');
                          }
                        }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-white/10 whitespace-nowrap ${
                          project.effectiveStatus === 'planning' ? 'bg-white/5' : ''
                        }`}
                      >
                        <StatusBadge status="planning" size="sm" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onBlock(project.id, project.title);
                          setStatusMenuOpen(null);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-white/10 rounded-b-lg whitespace-nowrap ${
                          project.effectiveStatus === 'blocked' ? 'bg-white/5' : ''
                        }`}
                      >
                        <StatusBadge status="blocked" size="sm" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {project.r2Number && (
                  <span className="text-sm font-semibold text-white">#{project.r2Number}</span>
                )}
                <div className="relative menu-dropdown-container">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(menuOpen === project.id ? null : project.id);
                    }}
                    className="p-1 hover:bg-white/10 rounded transition-colors"
                    title="Project actions"
                  >
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                  </button>
                  {menuOpen === project.id && (
                    <div className="absolute right-0 mt-1 w-40 bg-[rgba(20,20,30,0.95)] backdrop-blur-sm border border-white/10 rounded-lg shadow-lg z-10">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleArchive(project.id, project.title); }}
                        className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-white/10 rounded-t-lg flex items-center gap-2"
                        title="Archive this project"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                        </svg>
                        Archive
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(project.id, project.title); }}
                        className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-white/10 rounded-b-lg flex items-center gap-2"
                        title="Delete this project permanently"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Line 3: PM + Team Avatars */}
            <div className="flex items-center gap-2">
              {project.projectManager && (
                <div className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="text-xs text-cyan-400 truncate max-w-[140px]">{project.projectManager}</span>
                </div>
              )}
              {project.assignees && project.assignees.length > 0 && (
                <div className="flex -space-x-1.5">
                  {project.assignees.slice(0, 4).map((memberName: string, idx: number) => (
                    <div
                      key={idx}
                      className="w-5 h-5 text-[9px] rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 border-2 border-gray-900 flex items-center justify-center text-white font-medium"
                      title={memberName}
                    >
                      {memberName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                  ))}
                  {project.assignees.length > 4 && (
                    <div className="w-5 h-5 text-[9px] rounded-full bg-gray-700 border-2 border-gray-900 flex items-center justify-center text-white font-medium">
                      +{project.assignees.length - 4}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Line 4: Prep Date, Return Date */}
            <div className="flex items-center gap-3 text-xs text-gray-400">
              {project.prepDate && (
                <div className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Prep: {formatDateOnly(project.prepDate)}</span>
                </div>
              )}
              {project.returnDate && (
                <div className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                  <span>Return: {formatDateOnly(project.returnDate)}</span>
                </div>
              )}
            </div>

            {/* Line 5: Client and Venue */}
            <div className="flex items-center gap-3 text-xs text-gray-400">
              {project.clientId && clientNameById[project.clientId] && (
                <div className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <span className="truncate max-w-[120px]">{clientNameById[project.clientId]}</span>
                </div>
              )}
              {project.venueId && venueNameById[project.venueId] && (
                <div className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="truncate max-w-[120px]">{venueNameById[project.venueId]}</span>
                </div>
              )}
            </div>
          </div>
        </Card>
      ))}
      
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
    </div>
  );
}

// List View
// List View
function ListView({ uid, projects, blockers, clientNameById, venueNameById, getTaskCounts, onProjectClick, onDelete, onBlock, onManageBlockers }: {
  uid: string;
  projects: any[];
  blockers: WithId<Blocker>[];
  clientNameById: Record<string, string>;
  venueNameById: Record<string, string>;
  getTaskCounts: (projectId: string) => { total: number; completed: number };
  onProjectClick: (project: any) => void;
  onDelete: (projectId: string, title: string) => void;
  onBlock: (projectId: string, projectTitle: string) => void;
  onManageBlockers: (projectId: string, projectTitle: string) => void;
}) {
  const toast = useToast();
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [statusMenuOpen, setStatusMenuOpen] = useState<string | null>(null);
  const [statusMenuPos, setStatusMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [tooltipState, setTooltipState] = useState<{ visible: boolean; projectId: string | null; x: number; y: number; blockerInfo: any }>({ 
    visible: false, 
    projectId: null, 
    x: 0, 
    y: 0, 
    blockerInfo: null 
  });

  const handleArchive = async (projectId: string, title: string) => {
    try {
      await archiveProject(uid, projectId);
      toast.success(`Archived ${title}`);
      setMenuOpen(null);
    } catch (err) {
      toast.error('Failed to archive project');
    }
  };

  const handleDelete = async (projectId: string, title: string) => {
    onDelete(projectId, title);
  };

  // Close status menu on click outside
  useEffect(() => {
    if (!statusMenuOpen) return;
    
    const handleClickOutside = () => {
      setStatusMenuOpen(null);
      setStatusMenuPos(null);
    };
    
    // Delay adding the listener to avoid immediate closure
    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 0);
    
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [statusMenuOpen]);

  return (
    <Card className="overflow-x-auto">
      <table className="w-full min-w-[980px]">
        <thead>
          <tr className="border-b border-white/5">
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Project</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Status</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Tasks</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">R2#</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Ship</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Return</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Client</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Venue</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">PM</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Team</th>
            <th className="w-12"></th>
          </tr>
        </thead>
        <tbody>
          {projects.map(project => (
            <tr 
              key={project.id} 
              className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
              onClick={() => onProjectClick(project)}
            >
              <td className="py-3 px-4">
                <div className="font-medium text-white">{project.title}</div>
              </td>
              <td className="py-3 px-4">
                <div className="relative status-dropdown-container flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (project.effectiveStatus === 'blocked') {
                        onManageBlockers(project.id, project.title);
                        return;
                      }
                      if (project.effectiveStatus === 'post_event') {
                        // When in post-event, status pill is informational only in List view
                        return;
                      }
                      if (!canManuallyChangeStatus(project)) {
                        return;
                      }
                      if (statusMenuOpen === project.id) {
                        setStatusMenuOpen(null);
                        setStatusMenuPos(null);
                      } else {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setStatusMenuOpen(project.id);
                        setStatusMenuPos({ x: rect.left, y: rect.bottom + 4 });
                      }
                    }}
                    className={`transition-opacity ${canManuallyChangeStatus(project) && project.effectiveStatus !== 'blocked' ? 'hover:opacity-80 cursor-pointer' : 'cursor-default'}`}
                  >
                    {project.effectiveStatus === 'blocked' ? (
                      (() => {
                        const active = (blockers || []).filter(b => b.entityType === 'project' && b.entityId === project.id && b.status === 'active');
                        const firstReason = active.length ? (typeof active[0].reason === 'object' ? JSON.stringify(active[0].reason) : (active[0].reason || 'Blocked')) : 'Blocked';
                        const extraCount = active.length > 1 ? active.length - 1 : 0;
                        const firstBlocker = active[0];
                        return (
                          <div
                            onMouseEnter={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setTooltipState({
                                visible: true,
                                projectId: project.id,
                                x: rect.left + rect.width / 2,
                                y: rect.top,
                                blockerInfo: { firstReason, firstBlocker, extraCount }
                              });
                            }}
                            onMouseLeave={() => setTooltipState({ visible: false, projectId: null, x: 0, y: 0, blockerInfo: null })}
                          >
                            <Badge color="red" size="sm" variant="solid" className="max-w-[260px] truncate">
                              <span className="font-semibold">BLOCKED</span>
                            </Badge>
                          </div>
                        );
                      })()
                    ) : project.effectiveStatus === 'post_event' ? (
                      // Check if awaiting owner review (purple Invoice badge)
                      project.postEventReport?.status === 'submitted' && !project.postEventReport.ownerReviewed ? (
                        <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-purple-500/10 border border-purple-500/30 animate-pulse">
                          <svg className="w-3.5 h-3.5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span className="text-xs font-semibold text-purple-400">Invoice</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-orange-500/10 border border-orange-500/30 animate-pulse">
                          <svg className="w-3.5 h-3.5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-xs font-semibold text-orange-400">Sign-Off</span>
                        </div>
                      )
                    ) : (
                      <StatusBadge status={project.effectiveStatus} size="sm" />
                    )}
                  </button>
                  
                </div>
              </td>
              <td className="py-3 px-4">
                {(() => {
                  const counts = getTaskCounts(project.id);
                  if (counts.total > 0) {
                    return (
                      <span className="text-xs px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-medium"
                        title={`${counts.completed} of ${counts.total} tasks completed`}>
                        {counts.completed}/{counts.total}
                      </span>
                    );
                  }
                  return <span className="text-gray-500">—</span>;
                })()}
              </td>
              <td className="py-3 px-4 text-sm text-gray-300">
                {project.r2Number ? project.r2Number : <span className="text-gray-500">—</span>}
              </td>
              <td className="py-3 px-4 text-sm text-gray-300">
                {project.prepDate ? formatDateOnly(project.prepDate) : <span className="text-gray-500">—</span>}
              </td>
              <td className="py-3 px-4 text-sm text-gray-300">
                {project.returnDate ? formatDateOnly(project.returnDate) : <span className="text-gray-500">—</span>}
              </td>
              <td className="py-3 px-4 text-sm text-gray-400">
                {project.clientId ? (clientNameById[project.clientId] || '—') : '—'}
              </td>
              <td className="py-3 px-4 text-sm text-gray-400">
                {project.venueId ? (venueNameById[project.venueId] || '—') : '—'}
              </td>
              <td className="py-3 px-4 text-sm text-cyan-400">
                {project.projectManager ? project.projectManager : <span className="text-gray-500">—</span>}
              </td>
              <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                {project.assignees && project.assignees.length > 0 ? (
                  <div className="flex -space-x-2">
                    {project.assignees.slice(0, 4).map((memberName: string, idx: number) => (
                      <div
                        key={idx}
                        className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 border-2 border-gray-900 flex items-center justify-center text-white text-[10px] font-medium"
                        title={memberName}
                      >
                        {memberName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                      </div>
                    ))}
                    {project.assignees.length > 4 && (
                      <div className="w-7 h-7 rounded-full bg-gray-700 border-2 border-gray-900 flex items-center justify-center text-white text-[10px] font-medium">
                        +{project.assignees.length - 4}
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-gray-500">—</span>
                )}
              </td>
              <td className="py-3 px-4">
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(menuOpen === project.id ? null : project.id);
                    }}
                    className="p-1 hover:bg-white/10 rounded transition-colors"
                    title="Project actions"
                  >
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                  </button>
                  {menuOpen === project.id && (
                    <div className="absolute right-0 mt-1 w-40 bg-[rgba(20,20,30,0.95)] backdrop-blur-sm border border-white/10 rounded-lg shadow-lg z-10">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleArchive(project.id, project.title); }}
                        className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-white/10 rounded-t-lg flex items-center gap-2"
                        title="Archive this project"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                        </svg>
                        Archive
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(project.id, project.title); }}
                        className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-white/10 rounded-b-lg flex items-center gap-2"
                        title="Delete this project permanently"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
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
      
      {/* Portal status dropdown */}
      {statusMenuOpen && statusMenuPos && (() => {
        const project = projects.find(p => p.id === statusMenuOpen);
        if (!project || project.effectiveStatus === 'post_event' || project.effectiveStatus === 'blocked' || !canManuallyChangeStatus(project)) return null;
        
        return createPortal(
          <div
            style={{
              position: 'fixed',
              left: `${statusMenuPos.x}px`,
              top: `${statusMenuPos.y}px`,
              zIndex: 99999
            }}
            className="bg-[rgba(20,20,30,0.95)] backdrop-blur-sm border border-white/10 rounded-lg shadow-lg py-1"
          >
            <button
              onClick={async (e) => {
                e.stopPropagation();
                try {
                  await updateProject(uid, statusMenuOpen, { status: 'not_started' });
                  toast.success('Status updated to Not Started');
                  setStatusMenuOpen(null);
                  setStatusMenuPos(null);
                } catch (err) {
                  toast.error('Failed to update status');
                }
              }}
              className={`block px-2 py-1 text-sm hover:bg-white/10 first:rounded-t-md last:rounded-b-md ${
                project.effectiveStatus === 'not_started' ? 'bg-white/5' : ''
              }`}
            >
              <StatusBadge status="not_started" size="sm" />
            </button>
            <button
              onClick={async (e) => {
                e.stopPropagation();
                try {
                  await updateProject(uid, statusMenuOpen, { status: 'planning' });
                  toast.success('Status updated to Planning');
                  setStatusMenuOpen(null);
                  setStatusMenuPos(null);
                } catch (err) {
                  toast.error('Failed to update status');
                }
              }}
              className={`block px-2 py-1 text-sm hover:bg-white/10 first:rounded-t-md last:rounded-b-md ${
                project.effectiveStatus === 'planning' ? 'bg-white/5' : ''
              }`}
            >
              <StatusBadge status="planning" size="sm" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onBlock(statusMenuOpen, project.title);
                setStatusMenuOpen(null);
                setStatusMenuPos(null);
              }}
              className={`block px-2 py-1 text-sm hover:bg-white/10 first:rounded-t-md last:rounded-b-md ${
                project.effectiveStatus === 'blocked' ? 'bg-white/5' : ''
              }`}
            >
              <StatusBadge status="blocked" size="sm" />
            </button>
          </div>,
          document.body
        );
      })()}
    </Card>
  );
}

// Kanban View
function KanbanView({ projects, onProjectClick }: { 
  projects: any[]; 
  onProjectClick: (project: any) => void;
}) {
  const columns: { id: ProjectStatus; label: string; color: string }[] = [
    { id: 'not_started', label: 'Not Started', color: 'from-gray-500/20 to-gray-600/20' },
    { id: 'planning', label: 'Planning', color: 'from-blue-500/20 to-blue-600/20' },
    { id: 'executing', label: 'Executing', color: 'from-purple-500/20 to-purple-600/20' },
    { id: 'blocked', label: 'Blocked', color: 'from-red-500/20 to-red-600/20' },
    { id: 'post_event', label: 'Sign-Off', color: 'from-orange-500/20 to-orange-600/20' },
    { id: 'completed', label: 'Completed', color: 'from-green-500/20 to-green-600/20' },
  ];

  return (
    <div className="flex gap-3 overflow-x-auto pb-4 min-h-[calc(100vh-300px)]">
      {columns.map(column => {
        const columnProjects = projects.filter(p => p.effectiveStatus === column.id);
        
        return (
          <div key={column.id} className="flex-shrink-0 w-[240px]">
            <div className={`bg-gradient-to-r ${column.color} backdrop-blur-sm border border-white/10 rounded-lg p-2 mb-2`}>
              <h3 className="font-semibold text-white text-sm flex items-center justify-between">
                <span>{column.label}</span>
                <span className="text-xs bg-white/10 px-1.5 py-0.5 rounded">{columnProjects.length}</span>
              </h3>
            </div>
            <div className="space-y-2">
              {columnProjects.map(project => (
                <Card 
                  key={project.id} 
                  hover 
                  className="p-2 space-y-1.5 cursor-pointer relative"
                  onClick={() => onProjectClick(project)}
                >
                  {/* Submitted badge (top-right) - hide for completed projects */}
                  {project.postEventReport?.status === 'submitted' && project.effectiveStatus !== 'completed' && (
                    <span className="absolute top-1.5 right-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Submitted
                    </span>
                  )}
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-medium text-white text-xs line-clamp-1 flex-1">
                      {project.title}
                    </h4>
                    {project.r2Number && (
                      <span className="font-medium text-white text-xs flex-shrink-0">{project.r2Number}</span>
                    )}
                  </div>
                  <div className="text-[10px] text-gray-400">
                    {project.returnDate ? <span>Ret: {formatDateOnly(project.returnDate)}</span> : (project.prepDate ? <span>Prep: {formatDateOnly(project.prepDate)}</span> : <span>—</span>)}
                  </div>
                  {project.projectManager && (
                    <div className="text-[10px] text-cyan-400 truncate">
                      PM: {project.projectManager}
                    </div>
                  )}
                  {project.assignees && project.assignees.length > 0 && (
                    <div className="flex items-center gap-1">
                      <div className="flex -space-x-1.5">
                        {project.assignees.slice(0, 3).map((memberName: string, idx: number) => (
                          <div
                            key={idx}
                            className="w-5 h-5 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 border-2 border-gray-900 flex items-center justify-center text-white text-[9px] font-medium"
                            title={memberName}
                          >
                            {memberName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                          </div>
                        ))}
                        {project.assignees.length > 3 && (
                          <div className="w-5 h-5 rounded-full bg-gray-700 border-2 border-gray-900 flex items-center justify-center text-white text-[9px] font-medium">
                            +{project.assignees.length - 3}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Helper functions
function formatDateOnly(date: any): string {
  if (!date) return '—';
  let d: Date;
  if (date.toDate) {
    d = date.toDate();
  } else if (typeof date === 'string') {
    d = new Date(date);
  } else if (date instanceof Date) {
    d = date;
  } else {
    return '—';
  }
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getStatusColor(status: ProjectStatus): string {
  switch (status) {
    case 'not_started':
      return 'bg-gray-500';
    case 'planning':
      return 'bg-blue-500';
    case 'executing':
      return 'bg-purple-500';
    case 'post_event':
      return 'bg-orange-500';
    case 'completed':
      return 'bg-green-500';
    case 'blocked':
      return 'bg-red-500';
    case 'archived':
      return 'bg-gray-700';
    default:
      return 'bg-gray-500';
  }
}

// Removed datetime-local input formatter since List view no longer uses inline date editing

// Create Project Modal Component (inline to keep file cohesive)
function CreateProjectModal({
  uid,
  open,
  onClose,
  onCreate,
  titleValue,
  onTitleChange,
  prepDateValue,
  onPrepDateChange,
  returnDateValue,
  onReturnDateChange,
  projectManagerValue,
  onProjectManagerChange,
  r2NumberValue,
  onR2NumberChange,
  clientIdValue,
  onClientIdChange,
  venueIdValue,
  onVenueIdChange,
  teamMembers,
}: {
  uid: string;
  open: boolean;
  onClose: () => void;
  onCreate: () => Promise<void>;
  titleValue: string;
  onTitleChange: (v: string) => void;
  prepDateValue: string;
  onPrepDateChange: (v: string) => void;
  returnDateValue: string;
  onReturnDateChange: (v: string) => void;
  projectManagerValue: string;
  onProjectManagerChange: (v: string) => void;
  r2NumberValue: string;
  onR2NumberChange: (v: string) => void;
  clientIdValue: string;
  onClientIdChange: (v: string) => void;
  venueIdValue: string;
  onVenueIdChange: (v: string) => void;
  teamMembers: WithId<import('../../types').TeamMember>[];
}) {
  const [clients] = useClients(uid);
  const [venues] = useVenues(uid);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const titleEmpty = !titleValue.trim();
  const invalidOrder = !!(prepDateValue && returnDateValue && new Date(prepDateValue) > new Date(returnDateValue));
  const disabled = titleEmpty || invalidOrder;

  // Client/Venue modal states
  const [showClientModal, setShowClientModal] = useState(false);
  const [showVenueModal, setShowVenueModal] = useState(false);
  const [clientFormData, setClientFormData] = useState({ name: '', contactName: '', email: '', phone: '' });
  const [venueFormData, setVenueFormData] = useState({ name: '', address: '', city: '', state: '', zip: '', capacity: '' });

  useEffect(() => {
    if (open) {
      titleInputRef.current?.focus();
    }
  }, [open]);

  const handleCreateClient = async () => {
    try {
      const newClientId = await createClient(uid, { ...clientFormData, active: true });
      onClientIdChange(newClientId);
      setShowClientModal(false);
      setClientFormData({ name: '', contactName: '', email: '', phone: '' });
    } catch (error) {
      console.error('Failed to create client:', error);
    }
  };

  const handleCreateVenue = async () => {
    try {
      const newVenueId = await createVenue(uid, { ...venueFormData, active: true, country: 'USA' });
      onVenueIdChange(newVenueId);
      setShowVenueModal(false);
      setVenueFormData({ name: '', address: '', city: '', state: '', zip: '', capacity: '' });
    } catch (error) {
      console.error('Failed to create venue:', error);
    }
  };

  return (
    <>
    <Modal open={open} onClose={onClose} title="Create Project" widthClass="max-w-xl"
      footer={
        <div className="flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-300 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10">Cancel</button>
          <button disabled={disabled} onClick={onCreate} className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${disabled ? 'bg-white/10 cursor-not-allowed' : 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600'}`}>Create</button>
        </div>
      }>
      <div className="space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">R2# (Order ID)</label>
          <input
            value={r2NumberValue}
            onChange={e => onR2NumberChange(e.target.value)}
            placeholder="R2# / Order ID"
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Autocomplete
              value={clientIdValue || null}
              options={(clients || []).map(c => ({
                id: c.id as string,
                label: c.name,
                sublabel: c.contactName || undefined,
              }))}
              onChange={(value) => onClientIdChange(value || '')}
              onCreateNew={() => setShowClientModal(true)}
              placeholder="Search clients..."
              label="Client"
              createNewLabel="+ Add New Client"
            />
          </div>
          <div>
            <Autocomplete
              value={venueIdValue || null}
              options={(venues || []).map(v => ({
                id: v.id as string,
                label: v.name,
                sublabel: v.city && v.state ? `${v.city}, ${v.state}` : undefined,
              }))}
              onChange={(value) => onVenueIdChange(value || '')}
              onCreateNew={() => setShowVenueModal(true)}
              placeholder="Search venues..."
              label="Venue"
              createNewLabel="+ Add New Venue"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Title</label>
          <input 
            ref={titleInputRef}
            value={titleValue} 
            onChange={(e) => onTitleChange(e.target.value)} 
            placeholder="Project title"
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
     <div>
            <label className="block text-sm text-gray-400 mb-1">Prep Date</label>
       <input type="datetime-local" value={prepDateValue} onChange={(e) => onPrepDateChange(e.target.value)}
         className={`w-full px-3 py-2 rounded-lg bg-white/5 border text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 ${invalidOrder ? 'border-red-500/50' : 'border-white/10'}`} />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Return Date</label>
       <input type="datetime-local" value={returnDateValue} min={prepDateValue || undefined} onChange={(e) => onReturnDateChange(e.target.value)}
         className={`w-full px-3 py-2 rounded-lg bg-white/5 border text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 ${invalidOrder ? 'border-red-500/50' : 'border-white/10'}`} />
          </div>
        </div>
        {invalidOrder && (
          <p className="text-sm text-orange-400">Return Date must be the same as or after the Prep Date.</p>
        )}
        <div>
          <label className="block text-sm text-gray-400 mb-1">Project Manager</label>
          <select 
            value={projectManagerValue} 
            onChange={(e) => onProjectManagerChange(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
          >
            <option value="">Select a team member</option>
            {teamMembers.filter(m => m.active).map(member => (
              <option key={member.id} value={member.name} className="bg-gray-800">
                {member.name}
              </option>
            ))}
          </select>
        </div>
        <p className="text-xs text-gray-500">Status will be auto-managed between Prep and Return dates (Executing), and after Return (Sign-Off). Before Prep you can toggle Not Started/Planning.</p>
      </div>
    </Modal>

    {/* Client Creation Modal */}
    <Modal open={showClientModal} onClose={() => setShowClientModal(false)} title="Add New Client" widthClass="max-w-md">
      <div className="space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Client Name *</label>
          <input
            value={clientFormData.name}
            onChange={(e) => setClientFormData({ ...clientFormData, name: e.target.value })}
            placeholder="Company name"
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Contact Name</label>
          <input
            value={clientFormData.contactName}
            onChange={(e) => setClientFormData({ ...clientFormData, contactName: e.target.value })}
            placeholder="Primary contact"
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Email</label>
          <input
            type="email"
            value={clientFormData.email}
            onChange={(e) => setClientFormData({ ...clientFormData, email: e.target.value })}
            placeholder="contact@company.com"
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Phone</label>
          <input
            type="tel"
            value={clientFormData.phone}
            onChange={(e) => setClientFormData({ ...clientFormData, phone: e.target.value })}
            placeholder="(555) 123-4567"
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
          />
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <button
            onClick={() => setShowClientModal(false)}
            className="px-4 py-2 text-sm font-medium text-gray-300 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            onClick={handleCreateClient}
            disabled={!clientFormData.name.trim()}
            className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add Client
          </button>
        </div>
      </div>
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
