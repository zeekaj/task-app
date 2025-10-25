// src/components/views/ProjectsView.tsx
import { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { StatusBadge } from '../ui/Badge';
import { PillTabs } from '../ui/PillTabs';
import { useProjects } from '../../hooks/useProjects';
import { computeProjectStatus, canManuallyChangeStatus, getAllowedStatusTransitions } from '../../utils/projectStatus';
import { Modal } from '../shared/Modal';
import { createProject, updateProject, archiveProject, deleteProject } from '../../services/projects';
import type { ProjectStatus, WithId, Project } from '../../types';
import { useToast } from '../shared/Toast';
import { ProjectDetailView } from './ProjectDetailView';

interface ProjectsViewProps {
  uid: string;
}

type ViewMode = 'cards' | 'list' | 'kanban';
type ProjectWithStatus = WithId<Project> & { effectiveStatus: ProjectStatus };

export function ProjectsView({ uid }: ProjectsViewProps) {
  const projects = useProjects(uid);
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

  // Save view mode to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('projectsViewMode', viewMode);
  }, [viewMode]);

  useEffect(() => {
    if (projects) {
      setLoading(false);
    }
  }, [projects]);

  // Compute effective status for each project
  const projectsWithStatus: ProjectWithStatus[] = projects?.map((p: WithId<Project>) => ({
    ...p,
    effectiveStatus: computeProjectStatus(p),
  })) || [];

  // Filter projects
  const filteredProjects = filterStatus === 'all' 
    ? projectsWithStatus 
    : projectsWithStatus.filter((p: ProjectWithStatus) => p.effectiveStatus === filterStatus);

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
          <button onClick={() => setCreateOpen(true)} className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg font-medium hover:from-cyan-600 hover:to-blue-600 transition-all duration-200">
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
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onCreate={async () => {
            if (!title.trim()) return;
            const id = await createProject(uid, title.trim());
            const payload: any = {};
            if (prepDate) payload.prepDate = prepDate;
            if (returnDate) payload.returnDate = returnDate;
            if (projectManager) payload.projectManager = projectManager;
            if (Object.keys(payload).length) {
              await updateProject(uid, id, payload);
            }
            setTitle('');
            setPrepDate('');
            setReturnDate('');
            setProjectManager('');
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
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
            </button>
          </div>
          <button onClick={() => setCreateOpen(true)} className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg font-medium hover:from-cyan-600 hover:to-blue-600 transition-all duration-200">
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
          { id: 'post_event', label: 'Post-Event', count: projectsWithStatus.filter((p: ProjectWithStatus) => p.effectiveStatus === 'post_event').length },
          { id: 'completed', label: 'Completed', count: projectsWithStatus.filter((p: ProjectWithStatus) => p.effectiveStatus === 'completed').length },
        ]}
        activeTab={filterStatus}
        onChange={(tab: string) => setFilterStatus(tab as ProjectStatus | 'all')}
      />

      {/* Content based on view mode */}
      {viewMode === 'cards' && <CardsView uid={uid} projects={filteredProjects} onProjectClick={setSelectedProject} />}
      {viewMode === 'list' && <ListView uid={uid} projects={filteredProjects} onProjectClick={setSelectedProject} />}
      {viewMode === 'kanban' && <KanbanView projects={projectsWithStatus} onProjectClick={setSelectedProject} />}

      <CreateProjectModal
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
            if (Object.keys(payload).length) {
              await updateProject(uid, id, payload);
            }
            toast.success('Project created');
            setTitle('');
            setPrepDate('');
            setReturnDate('');
            setProjectManager('');
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
    </div>
  );
}

// Cards View
function CardsView({ uid, projects, onProjectClick }: { uid: string; projects: any[]; onProjectClick: (project: any) => void }) {
  const toast = useToast();
  const [savedMode, setSavedMode] = useState<Record<string, boolean>>({});
  const [savedStatus, setSavedStatus] = useState<Record<string, boolean>>({});
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const markModeSaved = (id: string) => {
    setSavedMode((p) => ({ ...p, [id]: true }));
    setTimeout(() => setSavedMode((p) => ({ ...p, [id]: false })), 1200);
  };

  const markStatusSaved = (id: string) => {
    setSavedStatus((p) => ({ ...p, [id]: true }));
    setTimeout(() => setSavedStatus((p) => ({ ...p, [id]: false })), 1200);
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
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    try {
      await deleteProject(uid, projectId);
      toast.success(`Deleted ${title}`);
      setMenuOpen(null);
    } catch (err) {
      toast.error('Failed to delete project');
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {projects.map(project => (
        <Card 
          key={project.id} 
          hover 
          className="p-0 overflow-hidden cursor-pointer"
          onClick={() => onProjectClick(project)}
        >
          {/* Status indicator stripe */}
          <div className={`h-1 ${getStatusColor(project.effectiveStatus)}`} />
          
          <div className="p-4 space-y-3">
            {/* Title and status with menu */}
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-lg font-semibold text-white flex-1 line-clamp-2">
                {project.title}
              </h3>
              <div className="flex items-center gap-2">
                <StatusBadge status={project.effectiveStatus} size="sm" />
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(menuOpen === project.id ? null : project.id);
                    }}
                    className="p-1 hover:bg-white/10 rounded transition-colors"
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
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                        </svg>
                        Archive
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(project.id, project.title); }}
                        className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-white/10 rounded-b-lg flex items-center gap-2"
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

            {/* Manual status selector (if in manual mode) */}
            {project.statusMode === 'manual' && (
              <div className="flex items-center gap-2">
                <select
                  defaultValue={project.status}
                  onClick={(e)=>e.stopPropagation()}
                  onChange={async (e) => {
                    const newStatus = e.target.value as ProjectStatus;
                    try { 
                      await updateProject(uid, project.id, { status: newStatus }); 
                      markStatusSaved(project.id);
                    } catch (err) { 
                      toast.error('Failed to update status'); 
                    }
                  }}
                  className="flex-1 text-sm bg-transparent border border-white/10 rounded px-2 py-1 text-gray-300 hover:bg-white/5 focus:outline-none focus:ring-1 focus:ring-cyan-500/40"
                >
                  {getAllowedStatusTransitions(project).map((s) => (
                    <option key={s} value={s} className="bg-black">{statusLabel(s)}</option>
                  ))}
                </select>
                {savedStatus[project.id] && (
                  <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
                )}
              </div>
            )}

            {/* R2 Number */}
            {project.r2Number && (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                </svg>
                {project.r2Number}
              </div>
            )}

            {/* Dates */}
            <div className="space-y-1.5 text-sm">
              {project.prepDate && (
                <div className="flex items-center gap-2 text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Prep: {formatDate(project.prepDate)}</span>
                </div>
              )}
              {project.returnDate && (
                <div className="flex items-center gap-2 text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                  <span>Return: {formatDate(project.returnDate)}</span>
                </div>
              )}
              {project.installDate && (
                <div className="flex items-center gap-2 text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>Install: {formatDate(project.installDate)}</span>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between pt-2 border-t border-white/5">
              {/* Project Manager */}
            {project.projectManager && (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="text-cyan-400">PM: {project.projectManager}</span>
              </div>
            )}
              {/* Mode toggle */}
              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    const toManual = project.statusMode !== 'manual';
                    try {
                      if (toManual) {
                        await updateProject(uid, project.id, { statusMode: 'manual', status: project.effectiveStatus });
                      } else {
                        await updateProject(uid, project.id, { statusMode: 'auto' });
                      }
                      markModeSaved(project.id);
                    } catch (err) {
                      toast.error('Failed to update mode');
                    }
                  }}
                  className={`text-xs px-2 py-1 rounded border ${project.statusMode === 'manual' ? 'bg-purple-500/20 border-purple-500/30 text-purple-300' : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'}`}
                >
                  {project.statusMode === 'manual' ? 'Manual' : 'Auto'}
                </button>
                {savedMode[project.id] && (
                  <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
                )}
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

// List View
function ListView({ uid, projects, onProjectClick }: { uid: string; projects: any[]; onProjectClick: (project: any) => void }) {
  const toast = useToast();
  const [savedHints, setSavedHints] = useState<Record<string, { prep?: boolean; return?: boolean; pm?: boolean; status?: boolean; mode?: boolean; r2?: boolean; install?: boolean }>>({});
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const markSaved = (id: string, key: keyof NonNullable<typeof savedHints[string]>) => {
    setSavedHints((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), [key]: true } }));
    setTimeout(() => {
      setSavedHints((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), [key]: false } }));
    }, 1200);
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
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    try {
      await deleteProject(uid, projectId);
      toast.success(`Deleted ${title}`);
      setMenuOpen(null);
    } catch (err) {
      toast.error('Failed to delete project');
    }
  };

  return (
    <Card className="overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/5">
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Project</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Status</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Mode</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">R2#</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Prep Date</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Return Date</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Install Date</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">PM</th>
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
                <div className="flex items-center gap-3">
                  <StatusBadge status={project.effectiveStatus} size="sm" />
                  {project.statusMode === 'manual' && (
                    <select
                      defaultValue={project.status}
                      onClick={(e)=>e.stopPropagation()}
                      onChange={async (e) => {
                        const newStatus = e.target.value as ProjectStatus;
                        try { await updateProject(uid, project.id, { status: newStatus }); markSaved(project.id, 'status'); } catch (err) { toast.error('Failed to update status'); }
                      }}
                      className="bg-transparent border border-white/10 rounded px-2 py-1 text-gray-300 hover:bg-white/5 focus:outline-none focus:ring-1 focus:ring-cyan-500/40"
                    >
                      {getAllowedStatusTransitions(project).map((s) => (
                        <option key={s} value={s} className="bg-black">{statusLabel(s)}</option>
                      ))}
                    </select>
                  )}
                  {canManuallyChangeStatus(project) && project.statusMode !== 'manual' && (
                    <button
                      title="Toggle Not Started/Planning"
                      onClick={async (e) => {
                        e.stopPropagation();
                        const next = project.status === 'planning' ? 'not_started' : 'planning';
                        try { await updateProject(uid, project.id, { status: next }); markSaved(project.id, 'status'); } catch (err) { toast.error('Failed to update status'); }
                      }}
                      className="text-xs px-2 py-1 rounded bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10"
                    >
                      Toggle
                    </button>
                  )}
                  {savedHints[project.id]?.status && (
                    <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
                  )}
                </div>
              </td>
              <td className="py-3 px-4">
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    const toManual = project.statusMode !== 'manual';
                    try {
                      if (toManual) {
                        await updateProject(uid, project.id, { statusMode: 'manual', status: project.effectiveStatus });
                      } else {
                        await updateProject(uid, project.id, { statusMode: 'auto' });
                      }
                      markSaved(project.id, 'mode');
                    } catch (err) { toast.error('Failed to update mode'); }
                  }}
                  className={`text-xs px-2 py-1 rounded border ${project.statusMode === 'manual' ? 'bg-purple-500/20 border-purple-500/30 text-purple-300' : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'}`}
                >
                  {project.statusMode === 'manual' ? 'Manual' : 'Auto'}
                </button>
                {savedHints[project.id]?.mode && (
                  <svg className="inline ml-2 w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
                )}
              </td>
              <td className="py-3 px-4 text-sm text-gray-400">
                <input
                  type="text"
                  defaultValue={project.r2Number || ''}
                  placeholder="R2#"
                  onClick={(e)=>e.stopPropagation()}
                  onBlur={async (e) => {
                    const val = e.target.value.trim();
                    try { 
                      await updateProject(uid, project.id, { r2Number: val || null as any }); 
                      markSaved(project.id, 'r2');
                    } catch (err) { 
                      toast.error('Failed to save'); 
                    }
                  }}
                  className="bg-transparent border border-white/10 rounded px-2 py-1 text-gray-300 placeholder-gray-500 hover:bg-white/5 focus:outline-none focus:ring-1 focus:ring-cyan-500/40"
                />
                {savedHints[project.id]?.r2 && (
                  <svg className="inline ml-2 w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
                )}
              </td>
              <td className="py-3 px-4 text-sm text-gray-400">
                <input
                  type="date"
                  defaultValue={project.prepDate ? toDateInput(project.prepDate) : ''}
                  onClick={(e)=>e.stopPropagation()}
                  onBlur={async (e) => {
                    try { await updateProject(uid, project.id, { prepDate: e.target.value || null }); markSaved(project.id, 'prep'); } catch (err) { toast.error('Failed to save'); }
                  }}
                  className="bg-transparent border border-white/10 rounded px-2 py-1 text-gray-300 hover:bg-white/5 focus:outline-none focus:ring-1 focus:ring-cyan-500/40"
                />
                {savedHints[project.id]?.prep && (
                  <svg className="inline ml-2 w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
                )}
              </td>
              <td className="py-3 px-4 text-sm text-gray-400">
                <input
                  type="date"
                  defaultValue={project.returnDate ? toDateInput(project.returnDate) : ''}
                  onClick={(e)=>e.stopPropagation()}
                  onBlur={async (e) => {
                    try { await updateProject(uid, project.id, { returnDate: e.target.value || null }); markSaved(project.id, 'return'); } catch (err) { toast.error('Failed to save'); }
                  }}
                  className="bg-transparent border border-white/10 rounded px-2 py-1 text-gray-300 hover:bg-white/5 focus:outline-none focus:ring-1 focus:ring-cyan-500/40"
                />
                {savedHints[project.id]?.return && (
                  <svg className="inline ml-2 w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
                )}
              </td>
              <td className="py-3 px-4 text-sm text-gray-400">
                <input
                  type="date"
                  defaultValue={project.installDate ? toDateInput(project.installDate) : ''}
                  onClick={(e)=>e.stopPropagation()}
                  onBlur={async (e) => {
                    try { 
                      await updateProject(uid, project.id, { installDate: e.target.value || null }); 
                      markSaved(project.id, 'install');
                    } catch (err) { 
                      toast.error('Failed to save'); 
                    }
                  }}
                  className="bg-transparent border border-white/10 rounded px-2 py-1 text-gray-300 hover:bg-white/5 focus:outline-none focus:ring-1 focus:ring-cyan-500/40"
                />
                {savedHints[project.id]?.install && (
                  <svg className="inline ml-2 w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
                )}
              </td>
              <td className="py-3 px-4 text-sm text-cyan-400">
                <input
                  type="text"
                  defaultValue={project.projectManager || ''}
                  placeholder="Set PM"
                  onClick={(e)=>e.stopPropagation()}
                  onBlur={async (e) => {
                    const val = e.target.value.trim();
                    try { await updateProject(uid, project.id, { projectManager: val || null as any }); markSaved(project.id, 'pm'); } catch (err) { toast.error('Failed to save'); }
                  }}
                  className="bg-transparent border border-white/10 rounded px-2 py-1 text-cyan-400 placeholder-gray-500 hover:bg-white/5 focus:outline-none focus:ring-1 focus:ring-cyan-500/40"
                />
                {savedHints[project.id]?.pm && (
                  <svg className="inline ml-2 w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
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
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                        </svg>
                        Archive
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(project.id, project.title); }}
                        className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-white/10 rounded-b-lg flex items-center gap-2"
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
    </Card>
  );
}

// Kanban View
function KanbanView({ projects, onProjectClick }: { projects: any[]; onProjectClick: (project: any) => void }) {
  const columns: { id: ProjectStatus; label: string; color: string }[] = [
    { id: 'not_started', label: 'Not Started', color: 'from-gray-500/20 to-gray-600/20' },
    { id: 'planning', label: 'Planning', color: 'from-blue-500/20 to-blue-600/20' },
    { id: 'executing', label: 'Executing', color: 'from-purple-500/20 to-purple-600/20' },
    { id: 'post_event', label: 'Post-Event', color: 'from-orange-500/20 to-orange-600/20' },
    { id: 'completed', label: 'Completed', color: 'from-green-500/20 to-green-600/20' },
  ];

  return (
    <div className="grid grid-cols-5 gap-4 overflow-x-auto pb-4">
      {columns.map(column => {
        const columnProjects = projects.filter(p => p.effectiveStatus === column.id);
        
        return (
          <div key={column.id} className="min-w-[280px]">
            <div className={`bg-gradient-to-r ${column.color} backdrop-blur-sm border border-white/10 rounded-lg p-3 mb-3`}>
              <h3 className="font-semibold text-white flex items-center justify-between">
                <span>{column.label}</span>
                <span className="text-sm bg-white/10 px-2 py-0.5 rounded">{columnProjects.length}</span>
              </h3>
            </div>
            <div className="space-y-3">
              {columnProjects.map(project => (
                <Card 
                  key={project.id} 
                  hover 
                  className="p-3 space-y-2 cursor-pointer"
                  onClick={() => onProjectClick(project)}
                >
                  <h4 className="font-medium text-white text-sm line-clamp-2">
                    {project.title}
                  </h4>
                  {project.r2Number && (
                    <div className="text-xs text-gray-400">
                      {project.r2Number}
                    </div>
                  )}
                  {project.prepDate && (
                    <div className="text-xs text-gray-400">
                      Prep: {formatDate(project.prepDate)}
                    </div>
                  )}
                  {project.projectManager && (
                    <div className="text-xs text-cyan-400">
                      PM: {project.projectManager}
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
function formatDate(date: any): string {
  if (!date) return '-';
  let d: Date;
  
  if (date.toDate) {
    d = date.toDate();
  } else if (typeof date === 'string') {
    d = new Date(date);
  } else if (date instanceof Date) {
    d = date;
  } else {
    return '-';
  }
  
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
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

function toDateInput(date: any): string {
  // Convert Firestore TS / Date / string to YYYY-MM-DD for input[type=date]
  let d: Date | null = null;
  if (!date) return '';
  if (typeof date === 'object' && 'toDate' in date) d = (date as any).toDate();
  else if (date instanceof Date) d = date;
  else if (typeof date === 'string') d = new Date(date);
  if (!d || Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0,10);
}

// Create Project Modal Component (inline to keep file cohesive)
function CreateProjectModal({
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
}: {
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
}) {
  const titleEmpty = !titleValue.trim();
  const invalidOrder = !!(prepDateValue && returnDateValue && new Date(prepDateValue) > new Date(returnDateValue));
  const disabled = titleEmpty || invalidOrder;

  return (
    <Modal open={open} onClose={onClose} title="Create Project" widthClass="max-w-xl"
      footer={
        <div className="flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-300 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10">Cancel</button>
          <button disabled={disabled} onClick={onCreate} className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${disabled ? 'bg-white/10 cursor-not-allowed' : 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600'}`}>Create</button>
        </div>
      }>
      <div className="space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Title</label>
          <input value={titleValue} onChange={(e) => onTitleChange(e.target.value)} placeholder="Project title"
                 className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
     <div>
            <label className="block text-sm text-gray-400 mb-1">Prep Date</label>
       <input type="date" value={prepDateValue} onChange={(e) => onPrepDateChange(e.target.value)}
         className={`w-full px-3 py-2 rounded-lg bg-white/5 border text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 ${invalidOrder ? 'border-red-500/50' : 'border-white/10'}`} />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Return Date</label>
       <input type="date" value={returnDateValue} min={prepDateValue || undefined} onChange={(e) => onReturnDateChange(e.target.value)}
         className={`w-full px-3 py-2 rounded-lg bg-white/5 border text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 ${invalidOrder ? 'border-red-500/50' : 'border-white/10'}`} />
          </div>
        </div>
        {invalidOrder && (
          <p className="text-sm text-orange-400">Return Date must be the same as or after the Prep Date.</p>
        )}
        <div>
          <label className="block text-sm text-gray-400 mb-1">Project Manager</label>
          <input value={projectManagerValue} onChange={(e) => onProjectManagerChange(e.target.value)} placeholder="User ID or name"
                 className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50" />
        </div>
        <p className="text-xs text-gray-500">Status will be auto-managed between Prep and Return dates (Executing), and after Return (Post-Event). Before Prep you can toggle Not Started/Planning.</p>
      </div>
    </Modal>
  );
}
