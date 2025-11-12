// src/components/views/ScheduleView.tsx
import { useMemo, useState, useEffect } from 'react';
// Events deprecated: remove useScheduleEvents
import { useShifts } from '../../hooks/useShifts';
import { useTeamMembers } from '../../hooks/useTeamMembers';
import { useMaybeProjects } from '../../hooks/useMaybeProjects';
import { useRoleBasedTasks } from '../../hooks/useRoleBasedTasks';
import { useVenues } from '../../hooks/useVenues';
import { useUserContext } from '../../hooks/useUserContext';
import type { ShiftStatus, WithId, Task, Project } from '../../types';
// import { bulkSetScheduleStatus, updateScheduleEvent } from '../../services/scheduling';
import { deleteShift } from '../../services/shifts';
// import { undoLastChange } from '../../services/undo';
import { GenericShiftModal } from '../GenericShiftModal';
import { ProjectShiftModal } from '../ProjectShiftModal';
import { WeeklyScheduleGrid } from './WeeklyScheduleGrid';

interface ScheduleViewProps {
  uid: string;
}

type ViewMode = 'week' | 'month';

export function ScheduleView({ uid }: ScheduleViewProps) {
  const { userId, role } = useUserContext();
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [shiftStatusFilters, setShiftStatusFilters] = useState<ShiftStatus[]>(['draft', 'offered', 'confirmed']);
  const [filterByMember, setFilterByMember] = useState<string>('');
  const [filterByProject, setFilterByProject] = useState<string>('');
  const [showMyScheduleOnly, setShowMyScheduleOnly] = useState(() => {
    const saved = localStorage.getItem('showMyScheduleOnly');
    return saved === 'true';
  });
  const [, setBusy] = useState(false);
  const [banner, setBanner] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [shiftModalOpen, setShiftModalOpen] = useState(false);
  const [shiftModalType, setShiftModalType] = useState<'generic' | 'project'>('generic');
  const [editingShift, setEditingShift] = useState<any>(null);
  const [defaultShiftProjectId, setDefaultShiftProjectId] = useState<string>('');
  const [defaultShiftMemberId, setDefaultShiftMemberId] = useState<string>('');
  
  // Calculate date range based on view mode
  const getDateRange = () => {
    const start = new Date(selectedDate);
    const end = new Date(selectedDate);
    
    if (viewMode === 'week') {
      // Start of week (Monday)
      const day = start.getDay();
      const diff = day === 0 ? -6 : 1 - day; // If Sunday, go back 6 days; otherwise go to Monday
      start.setDate(start.getDate() + diff);
      start.setHours(0, 0, 0, 0);
      // End of week (Sunday)
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
    } else {
      // Month view
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(end.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
    }
    
    return { start, end };
  };
  
  const { start, end } = getDateRange();
  const { shifts, loading: shiftsLoading } = useShifts(uid, {
    startDate: start,
    endDate: end,
    memberId: filterByMember || undefined,
    projectId: filterByProject || undefined,
    status: shiftStatusFilters,
  });
  const teamMembers = useTeamMembers(uid);
  const projects = useMaybeProjects(uid);
  const allTasks = useRoleBasedTasks(uid);
  const [venues] = useVenues(uid);
  
  // Calculate self member ID early for filtering
  const selfMemberId = useMemo(() => teamMembers?.find(m => m.userId === userId)?.id || null, [teamMembers, userId]);
  
  // Filter tasks and projects that fall within the date range
  const scheduleTasks = useMemo(() => {
    let filtered = allTasks.filter((task: WithId<Task>) => {
      if (!task.dueDate) return false;
      const dueDate = new Date(task.dueDate);
      return dueDate >= start && dueDate <= end;
    });
    
    // If "My Schedule" mode, only show tasks assigned to current user
    if (showMyScheduleOnly && selfMemberId) {
      filtered = filtered.filter((task: WithId<Task>) => {
        const assignee = typeof task.assignee === 'string' ? task.assignee : task.assignee?.id;
        return assignee === selfMemberId;
      });
    }
    
    return filtered;
  }, [allTasks, start, end, showMyScheduleOnly, selfMemberId]);
  
  const scheduleProjects = useMemo(() => {
    let filtered = projects.filter((project: WithId<Project>) => {
      // Show project if any of its date range overlaps with the view range
      const prepDate = project.prepDate ? new Date(project.prepDate) : null;
      const returnDate = project.returnDate ? new Date(project.returnDate) : null;
      
      if (!prepDate && !returnDate) return false;
      
      const projectStart = prepDate || returnDate;
      const projectEnd = returnDate || prepDate;
      
      // Check if project date range overlaps with view range
      return projectStart! <= end && projectEnd! >= start;
    });
    
    // If "My Schedule" mode, only show projects where user is assigned
    if (showMyScheduleOnly && selfMemberId) {
      filtered = filtered.filter((project: WithId<Project>) => {
        return project.projectManager === selfMemberId || 
               project.assignees?.includes(selfMemberId);
      });
    }
    
    return filtered;
  }, [projects, start, end, showMyScheduleOnly, selfMemberId]);
  
  // Build venue name lookup
  const venueNameById = useMemo(() => {
    const map: Record<string, string> = {};
    if (venues && Array.isArray(venues)) {
      venues.forEach(v => { 
        if (v && v.id) map[v.id] = v.name; 
      });
    }
    return map;
  }, [venues]);
  
  const loading = shiftsLoading;

  // Role-based permissions
  const isOwner = role === 'owner';
  const isAdmin = isOwner || role === 'admin';
  const isTechnician = role === 'technician';
  const canManageShifts = isAdmin || isTechnician; // Owners, Admins, Technicians can create/edit
  const isFreelance = role === 'freelance';
  
  // Save schedule view preference
  useEffect(() => {
    localStorage.setItem('showMyScheduleOnly', String(showMyScheduleOnly));
  }, [showMyScheduleOnly]);
  
  // Freelancers only see their own shifts
  const scopedShifts = useMemo(() => {
    if (isFreelance && selfMemberId) return shifts.filter(s => s.assignedMemberId === selfMemberId);
    if (isFreelance && !selfMemberId) return [];
    return shifts;
  }, [shifts, isFreelance, selfMemberId]);

  const clearBanner = () => setBanner(null);
  
  const goToPrevious = () => {
    const newDate = new Date(selectedDate);
    if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setMonth(newDate.getMonth() - 1);
    }
    setSelectedDate(newDate);
  };
  const goToNext = () => {
    const newDate = new Date(selectedDate);
    if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setSelectedDate(newDate);
  };
  const goToToday = () => setSelectedDate(new Date());
  const formatDateRange = () => {
    if (viewMode === 'week') {
      const weekStart = new Date(selectedDate);
      const day = weekStart.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      weekStart.setDate(weekStart.getDate() + diff);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      return `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
    return selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };
  
  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <div className="flex-none border-b border-gray-700/50 bg-gray-800/50 backdrop-blur-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">Schedule</h1>
              <p className="text-sm text-gray-400">Manage staff scheduling and assignments</p>
            </div>
            <div className="flex items-center gap-3">
              {/* Schedule Filter Toggle */}
              <div className="flex bg-gray-700/50 rounded-lg p-1">
                <button
                  onClick={() => setShowMyScheduleOnly(true)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    showMyScheduleOnly ? 'bg-cyan-500 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  My Schedule
                </button>
                <button
                  onClick={() => setShowMyScheduleOnly(false)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    !showMyScheduleOnly ? 'bg-cyan-500 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Full Team
                </button>
              </div>
              {/* View Mode Toggle */}
              <div className="flex bg-gray-700/50 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('week')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'week' ? 'bg-cyan-500 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Week
                </button>
                <button
                  onClick={() => setViewMode('month')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'month' ? 'bg-cyan-500 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Month
                </button>
              </div>
              {canManageShifts && (
                <button
                  onClick={() => {
                    setEditingShift(null);
                    setShiftModalType('generic');
                    setDefaultShiftProjectId('');
                    setShiftModalOpen(true);
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white rounded-lg font-medium transition-all shadow-lg shadow-cyan-500/20"
                >
                  + New Shift
                </button>
              )}
            </div>
          </div>
          
          {/* Date Navigation */}
          <div className="flex items-center gap-4 mt-4">
            <button
              onClick={goToPrevious}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={goToToday}
              className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors"
            >
              Today
            </button>
            <button
              onClick={goToNext}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <div className="text-lg font-semibold text-white">{formatDateRange()}</div>
          </div>
          
          {/* Filters */}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <select
              value={filterByMember}
              onChange={(e) => setFilterByMember(e.target.value)}
              className="px-3 py-1.5 text-xs bg-gray-700/50 border border-gray-600 rounded-lg text-gray-300"
            >
              <option value="">All Members</option>
              {teamMembers?.filter(m => m.active).map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
            <select
              value={filterByProject}
              onChange={(e) => setFilterByProject(e.target.value)}
              className="px-3 py-1.5 text-xs bg-gray-700/50 border border-gray-600 rounded-lg text-gray-300"
            >
              <option value="">All Projects</option>
              {projects?.filter(p => p.status !== 'archived').map(p => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
            <div className="flex items-center gap-2">
              {(['draft','offered','confirmed'] as ShiftStatus[]).map(s => (
                <button
                  key={s}
                  onClick={() => setShiftStatusFilters(prev => prev.includes(s) ? prev.filter(x => x !== s) as ShiftStatus[] : [...prev, s] as ShiftStatus[])}
                  className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                    shiftStatusFilters.includes(s)
                      ? 'bg-purple-500/20 border-purple-400/40 text-purple-200'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                  }`}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>
          {banner && (
            <div className={`mt-3 text-sm px-3 py-2 rounded border ${
              banner.type === 'success' ? 'bg-emerald-500/10 border-emerald-400/30 text-emerald-200' :
              banner.type === 'error' ? 'bg-red-500/10 border-red-400/30 text-red-200' :
              'bg-cyan-500/10 border-cyan-400/30 text-cyan-200'
            }`}>
              {banner.message}
            </div>
          )}
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-400">Loading schedule...</div>
          </div>
        ) : viewMode === 'week' ? (
          <WeeklyScheduleGrid
            weekStart={start}
            events={[]}
            shifts={scopedShifts}
            tasks={scheduleTasks}
            projects={scheduleProjects}
            teamMembers={teamMembers || []}
            onShiftClick={(shift) => {
              if (!canManageShifts) return;
              setEditingShift(shift);
              // Determine modal type based on whether shift has a project
              setShiftModalType(shift.projectId ? 'project' : 'generic');
              setDefaultShiftProjectId(shift.projectId || '');
              setShiftModalOpen(true);
            }}
            onEventClick={(event) => {
              // Could open event edit modal here
              console.log('Event clicked:', event);
            }}
            onTaskClick={(task) => {
              // TODO: Open task edit modal
              console.log('Task clicked:', task);
            }}
            onProjectClick={(project) => {
              // TODO: Open project detail modal
              console.log('Project clicked:', project);
            }}
            onAddShift={(memberId, date) => {
              if (!canManageShifts) return;
              setEditingShift(null);
              setShiftModalType('generic'); // Default to generic for quick add
              setDefaultShiftProjectId('');
              setDefaultShiftMemberId(memberId); // Pre-fill the employee
              setShiftModalOpen(true);
              // The modal will use selectedDate, so update it
              setSelectedDate(date);
            }}
          />
        ) : (
          scopedShifts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className="w-16 h-16 bg-gray-700/50 rounded-2xl flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">No shifts scheduled</h3>
              <p className="text-gray-400 mb-4">Create your first shift to get started</p>
              {canManageShifts && (
                <button
                  onClick={() => {
                    setEditingShift(null);
                    setShiftModalType('generic');
                    setDefaultShiftProjectId('');
                    setShiftModalOpen(true);
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white rounded-lg font-medium transition-all"
                >
                  Create Shift
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {scopedShifts.map((shift) => {
                const shiftDate = new Date(shift.date);
                const assignedMember = shift.assignedMemberId 
                  ? teamMembers?.find(m => m.id === shift.assignedMemberId)
                  : null;
                return (
                  <div
                    key={`shift-${shift.id}`}
                    className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4 hover:border-cyan-500/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-white">{shift.title || 'Untitled Shift'}</h3>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                            shift.status === 'draft' ? 'bg-gray-500/10 text-gray-300 border-gray-400/30' :
                            shift.status === 'offered' ? 'bg-amber-500/10 text-amber-200 border-amber-400/30' :
                            shift.status === 'confirmed' ? 'bg-blue-500/10 text-blue-200 border-blue-400/30' :
                            shift.status === 'declined' ? 'bg-red-500/10 text-red-200 border-red-400/30' :
                            shift.status === 'completed' ? 'bg-emerald-500/10 text-emerald-200 border-emerald-400/30' :
                            'bg-gray-500/10 text-gray-300 border-gray-400/30'
                          }`}>
                            {shift.status.toUpperCase()}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2 text-gray-400">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <span>
                                {shiftDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-400">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>{shift.startTime} - {shift.endTime}</span>
                            </div>
                            {shift.venueId && venueNameById[shift.venueId] && (
                              <div className="flex items-center gap-2 text-gray-400">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <span>{venueNameById[shift.venueId]}</span>
                              </div>
                            )}
                          </div>
                          <div className="space-y-1.5">
                            {assignedMember && (
                              <div className="flex items-center gap-2 text-gray-300">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                <span>{assignedMember.name}</span>
                              </div>
                            )}
                            {shift.jobTitle && (
                              <div className="flex items-center gap-2 text-gray-400">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                <span>{shift.jobTitle}</span>
                              </div>
                            )}
                            {shift.estimatedHours && (
                              <div className="flex items-center gap-2 text-gray-400">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>{shift.estimatedHours}h estimated</span>
                              </div>
                            )}
                          </div>
                        </div>
                        {shift.notes && (
                          <p className="mt-3 text-sm text-gray-400 border-t border-gray-700/50 pt-3">{shift.notes}</p>
                        )}
                      </div>
                      <div className="flex items-start gap-2 ml-4">
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300">SHIFT</span>
                        {canManageShifts && (
                          <>
                            <button
                              onClick={() => {
                                setEditingShift(shift);
                                setShiftModalType(shift.projectId ? 'project' : 'generic');
                                setDefaultShiftProjectId(shift.projectId || '');
                                setShiftModalOpen(true);
                              }}
                              className="p-1.5 rounded hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
                              title="Edit shift"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={async () => {
                                if (!shift.id) return;
                                if (!window.confirm(`Delete shift "${shift.title || 'Untitled'}"?`)) return;
                                try {
                                  setBusy(true);
                                  clearBanner();
                                  await deleteShift(uid, shift.id);
                                  setBanner({ type: 'success', message: 'Shift deleted successfully' });
                                } catch (e: any) {
                                  setBanner({ type: 'error', message: e?.message || 'Failed to delete shift' });
                                } finally {
                                  setBusy(false);
                                }
                              }}
                              className="p-1.5 rounded hover:bg-red-500/10 text-gray-300 hover:text-red-400 transition-colors"
                              title="Delete shift"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>
      
      {/* Shift Modals */}
      <GenericShiftModal
        uid={uid}
        shift={shiftModalType === 'generic' ? editingShift : undefined}
        isOpen={shiftModalOpen && shiftModalType === 'generic'}
        onClose={() => {
          setShiftModalOpen(false);
          setEditingShift(null);
          setDefaultShiftProjectId('');
          setDefaultShiftMemberId('');
        }}
        onSuccess={() => {
          setShiftModalOpen(false);
          setEditingShift(null);
          setDefaultShiftProjectId('');
          setDefaultShiftMemberId('');
          setBanner({ type: 'success', message: editingShift ? 'Shift updated successfully' : 'Shift created successfully' });
        }}
        defaultDate={selectedDate.toISOString().split('T')[0]}
        defaultMemberId={defaultShiftMemberId}
      />
      
      <ProjectShiftModal
        uid={uid}
        shift={shiftModalType === 'project' ? editingShift : undefined}
        defaultProjectId={defaultShiftProjectId}
        isOpen={shiftModalOpen && shiftModalType === 'project'}
        onClose={() => {
          setShiftModalOpen(false);
          setEditingShift(null);
          setDefaultShiftProjectId('');
        }}
        onSuccess={() => {
          setShiftModalOpen(false);
          setEditingShift(null);
          setDefaultShiftProjectId('');
          setBanner({ type: 'success', message: editingShift ? 'Shift updated successfully' : 'Shift created successfully' });
        }}
        defaultDate={selectedDate.toISOString().split('T')[0]}
      />
    </div>
  );
}
