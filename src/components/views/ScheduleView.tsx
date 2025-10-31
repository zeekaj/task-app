// src/components/views/ScheduleView.tsx
import { useMemo, useState, useEffect } from 'react';
import { useScheduleEvents } from '../../hooks/useScheduleEvents';
import { useShifts } from '../../hooks/useShifts';
import { useTeamMembers } from '../../hooks/useTeamMembers';
import { useMaybeProjects } from '../../hooks/useMaybeProjects';
import type { ScheduleStatus, ShiftStatus } from '../../types';
import { bulkSetScheduleStatus, updateScheduleEvent } from '../../services/scheduling';
import { deleteShift } from '../../services/shifts';
import { undoLastChange } from '../../services/undo';
import { GenericShiftModal } from '../GenericShiftModal';
import { ProjectShiftModal } from '../ProjectShiftModal';
import { WeeklyScheduleGrid } from './WeeklyScheduleGrid';

interface ScheduleViewProps {
  uid: string;
}

type ViewMode = 'week' | 'month';
type DisplayMode = 'all' | 'events' | 'shifts';

export function ScheduleView({ uid }: ScheduleViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('all');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [statusFilters, setStatusFilters] = useState<ScheduleStatus[]>(['tentative', 'hold', 'confirmed', 'published']);
  const [shiftStatusFilters, setShiftStatusFilters] = useState<ShiftStatus[]>(['draft', 'offered', 'confirmed']);
  const [filterByMember, setFilterByMember] = useState<string>('');
  const [filterByProject, setFilterByProject] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [shiftModalOpen, setShiftModalOpen] = useState(false);
  const [shiftModalType, setShiftModalType] = useState<'generic' | 'project'>('generic');
  const [editingShift, setEditingShift] = useState<any>(null);
  const [defaultShiftProjectId, setDefaultShiftProjectId] = useState<string>('');
  
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
  const { events, loading: eventsLoading } = useScheduleEvents(uid, {
    startDate: start,
    endDate: end,
    status: statusFilters,
  });
  const { shifts, loading: shiftsLoading } = useShifts(uid, {
    startDate: start,
    endDate: end,
    memberId: filterByMember || undefined,
    projectId: filterByProject || undefined,
    status: shiftStatusFilters,
  });
  const teamMembers = useTeamMembers(uid);
  const projects = useMaybeProjects(uid);
  
  const loading = eventsLoading || shiftsLoading;

  const allSelected = useMemo(() => events.length > 0 && selectedIds.size === events.length, [events.length, selectedIds.size]);
  const clearBanner = () => setBanner(null);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClick = () => setOpenMenuId(null);
    if (openMenuId) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [openMenuId]);
  
  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(events.map(e => e.id!)));
    }
  };
  const toggleOne = (id?: string) => {
    if (!id) return;
    setSelectedIds(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };
  const setAllStatus = async (newStatus: ScheduleStatus) => {
    if (selectedIds.size === 0) return;
    try {
      setBusy(true);
      clearBanner();
      const count = await bulkSetScheduleStatus(uid, Array.from(selectedIds), newStatus);
      setBanner({ type: 'success', message: `${count} event${count === 1 ? '' : 's'} updated to ${newStatus}.` });
      setSelectedIds(new Set());
    } catch (e: any) {
      setBanner({ type: 'error', message: e?.message || 'Failed to update events' });
    } finally {
      setBusy(false);
    }
  };

  const setSingleStatus = async (id: string, newStatus: ScheduleStatus) => {
    try {
      setBusy(true);
      clearBanner();
      await updateScheduleEvent(uid, id, { status: newStatus } as any);
      setBanner({ type: 'success', message: `Event updated to ${newStatus}.` });
      setOpenMenuId(null);
    } catch (e: any) {
      setBanner({ type: 'error', message: e?.message || 'Failed to update event' });
    } finally {
      setBusy(false);
    }
  };
  
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
  
  const goToToday = () => {
    setSelectedDate(new Date());
  };
  
  const formatDateRange = () => {
    if (viewMode === 'week') {
      const weekStart = new Date(selectedDate);
      const day = weekStart.getDay();
      const diff = day === 0 ? -6 : 1 - day; // If Sunday, go back 6 days; otherwise go to Monday
      weekStart.setDate(weekStart.getDate() + diff);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      
      return `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    } else {
      return selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
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
              {/* Display Mode Toggle */}
              <div className="flex bg-gray-700/50 rounded-lg p-1">
                <button
                  onClick={() => setDisplayMode('all')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    displayMode === 'all'
                      ? 'bg-purple-500 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                  title="Show all items"
                >
                  All
                </button>
                <button
                  onClick={() => setDisplayMode('events')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    displayMode === 'events'
                      ? 'bg-purple-500 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                  title="Show events only"
                >
                  Events
                </button>
                <button
                  onClick={() => setDisplayMode('shifts')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    displayMode === 'shifts'
                      ? 'bg-purple-500 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                  title="Show shifts only"
                >
                  Shifts
                </button>
              </div>
              
              {/* View Mode Toggle */}
              <div className="flex bg-gray-700/50 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('week')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'week'
                      ? 'bg-cyan-500 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Week
                </button>
                <button
                  onClick={() => setViewMode('month')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'month'
                      ? 'bg-cyan-500 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Month
                </button>
              </div>
              
              {/* Create Shift Button with Dropdown */}
              <div className="relative">
                <button
                  onClick={() => {
                    setEditingShift(null);
                    setShiftModalType('generic');
                    setDefaultShiftProjectId('');
                    setShiftModalOpen(true);
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white rounded-l-lg font-medium transition-all shadow-lg shadow-cyan-500/20"
                  title="Create generic shift"
                >
                  + New Shift
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenMenuId(openMenuId === 'shift-dropdown' ? null : 'shift-dropdown');
                  }}
                  className="px-2 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white rounded-r-lg border-l border-cyan-400/30 font-medium transition-all shadow-lg shadow-cyan-500/20"
                  title="More shift options"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {/* Dropdown Menu */}
                {openMenuId === 'shift-dropdown' && (
                  <div 
                    className="absolute right-0 mt-2 w-56 bg-[rgba(20,20,30,0.98)] backdrop-blur-md border border-white/10 rounded-lg shadow-xl shadow-black/50 z-50"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="py-1">
                      <button
                        onClick={() => {
                          setEditingShift(null);
                          setShiftModalType('generic');
                          setDefaultShiftProjectId('');
                          setShiftModalOpen(true);
                          setOpenMenuId(null);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                      >
                        <div className="font-medium">Generic Shift</div>
                        <div className="text-xs text-gray-500">Standalone shift not tied to a project</div>
                      </button>
                      <button
                        onClick={() => {
                          setEditingShift(null);
                          setShiftModalType('project');
                          setDefaultShiftProjectId('');
                          setShiftModalOpen(true);
                          setOpenMenuId(null);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors border-t border-white/5"
                      >
                        <div className="font-medium">Project Shift</div>
                        <div className="text-xs text-gray-500">Shift linked to a specific event/project</div>
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Create Event Button */}
              <button
                onClick={() => {
                  // TODO: Open create event modal
                  alert('Create event modal coming soon');
                }}
                className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white rounded-lg font-medium transition-all shadow-lg shadow-cyan-500/20"
              >
                + New Event
              </button>
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
            
            <div className="text-lg font-semibold text-white">
              {formatDateRange()}
            </div>
          </div>
          {/* Filters and bulk actions */}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {/* Filter by Team Member */}
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
            
            {/* Filter by Project */}
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
            
            {/* Event Status Filters */}
            {(displayMode === 'all' || displayMode === 'events') && (
              <div className="flex items-center gap-2">
                {(['tentative','hold','confirmed','published'] as ScheduleStatus[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setStatusFilters(prev => prev.includes(s) ? prev.filter(x => x !== s) as ScheduleStatus[] : ([...prev, s] as ScheduleStatus[]));
                    }}
                    className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                      statusFilters.includes(s)
                        ? 'bg-cyan-500/20 border-cyan-400/40 text-cyan-200'
                        : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                    }`}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            )}
            
            {/* Shift Status Filters */}
            {(displayMode === 'all' || displayMode === 'shifts') && (
              <div className="flex items-center gap-2">
                {(['draft','offered','confirmed'] as ShiftStatus[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setShiftStatusFilters(prev => prev.includes(s) ? prev.filter(x => x !== s) as ShiftStatus[] : ([...prev, s] as ShiftStatus[]));
                    }}
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
            )}
            
            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={toggleSelectAll}
                className="px-3 py-1.5 text-xs rounded-lg bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10"
              >
                {allSelected ? 'Clear selection' : 'Select all'}
              </button>
              <button
                disabled={busy || selectedIds.size === 0}
                onClick={() => setAllStatus('confirmed')}
                className="px-3 py-1.5 text-xs rounded-lg bg-blue-600 disabled:opacity-50 hover:bg-blue-500 text-white"
              >
                Confirm
              </button>
              <button
                disabled={busy || selectedIds.size === 0}
                onClick={() => setAllStatus('published')}
                className="px-3 py-1.5 text-xs rounded-lg bg-emerald-600 disabled:opacity-50 hover:bg-emerald-500 text-white"
              >
                Publish
              </button>
              <button
                disabled={busy || selectedIds.size === 0}
                onClick={() => setAllStatus('canceled')}
                className="px-3 py-1.5 text-xs rounded-lg bg-red-600 disabled:opacity-50 hover:bg-red-500 text-white"
              >
                Cancel
              </button>
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
            events={displayMode !== 'shifts' ? events : []}
            shifts={displayMode !== 'events' ? shifts : []}
            teamMembers={teamMembers || []}
            onShiftClick={(shift) => {
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
            onAddShift={(_memberId, date) => {
              setEditingShift(null);
              setShiftModalType('generic'); // Default to generic for quick add
              setDefaultShiftProjectId('');
              setShiftModalOpen(true);
              // The modal will use selectedDate, so update it
              setSelectedDate(date);
            }}
          />
        ) : (() => {
          // Merge events and shifts based on displayMode
          const displayItems: Array<{ type: 'event' | 'shift'; data: any }> = [];
          if (displayMode !== 'shifts') {
            displayItems.push(...events.map(e => ({ type: 'event' as const, data: e })));
          }
          if (displayMode !== 'events') {
            displayItems.push(...shifts.map(s => ({ type: 'shift' as const, data: s })));
          }
          // Sort by date/time
          displayItems.sort((a, b) => {
            const aDate = a.type === 'event' 
              ? (a.data.start && 'toDate' in a.data.start ? a.data.start.toDate() : new Date(a.data.start))
              : new Date(a.data.date);
            const bDate = b.type === 'event'
              ? (b.data.start && 'toDate' in b.data.start ? b.data.start.toDate() : new Date(b.data.start))
              : new Date(b.data.date);
            return aDate.getTime() - bDate.getTime();
          });

          if (displayItems.length === 0) {
            return (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <div className="w-16 h-16 bg-gray-700/50 rounded-2xl flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  {displayMode === 'events' ? 'No events scheduled' : displayMode === 'shifts' ? 'No shifts scheduled' : 'No items scheduled'}
                </h3>
                <p className="text-gray-400 mb-4">
                  {displayMode === 'events' ? 'Create your first schedule event to get started' : 
                   displayMode === 'shifts' ? 'Create your first shift to get started' :
                   'Create events or shifts to get started'}
                </p>
                <div className="flex gap-3">
                  {displayMode !== 'shifts' && (
                    <button
                      onClick={() => alert('Create event modal coming soon')}
                      className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg font-medium transition-all"
                    >
                      Create Event
                    </button>
                  )}
                  {displayMode !== 'events' && (
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
              </div>
            );
          }

          return (
            <div className="space-y-3">
              {displayItems.map((item) => {
                if (item.type === 'event') {
                  const event = item.data;
                  const startDate = event.start && 'toDate' in event.start 
                    ? (event.start as any).toDate() 
                    : new Date(event.start as any);
                  const endDate = event.end && 'toDate' in event.end 
                    ? (event.end as any).toDate() 
                    : new Date(event.end as any);
                  
                  const assignedNames = event.assignedMemberIds
                    .map((id: string) => teamMembers?.find(m => m.id === id)?.name)
                    .filter(Boolean)
                    .join(', ');
                  
                  const checked = selectedIds.has(event.id!);
                  const status = (event as any).status as ScheduleStatus | undefined;
                  
                  return (
                    <div
                      key={`event-${event.id}`}
                      className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4 hover:border-cyan-500/50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleOne(event.id)}
                            className="mt-1.5 w-4 h-4 rounded bg-gray-700 border-gray-600 text-cyan-500 focus:ring-cyan-500/40"
                          />
                          <div>
                            <h3 className="text-lg font-semibold text-white mb-1">{event.title}</h3>
                            <div className="flex items-center gap-4 text-sm text-gray-400">
                              <span>
                                {startDate.toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric',
                                  hour: 'numeric',
                                  minute: '2-digit'
                                })}
                                {' - '}
                                {endDate.toLocaleDateString('en-US', { 
                                  hour: 'numeric',
                                  minute: '2-digit'
                                })}
                              </span>
                              {event.location && (
                                <span className="flex items-center gap-1">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                  </svg>
                                  {event.location}
                                </span>
                              )}
                            </div>
                            {assignedNames && (
                              <div className="mt-2 text-sm text-gray-300">
                                Assigned: {assignedNames}
                              </div>
                            )}
                            {event.notes && (
                              <p className="mt-2 text-sm text-gray-400">{event.notes}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 relative">
                          {status && (
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                              status === 'tentative' ? 'bg-amber-500/10 text-amber-200 border-amber-400/30' :
                              status === 'hold' ? 'bg-fuchsia-500/10 text-fuchsia-200 border-fuchsia-400/30' :
                              status === 'confirmed' ? 'bg-blue-500/10 text-blue-200 border-blue-400/30' :
                              status === 'published' ? 'bg-emerald-500/10 text-emerald-200 border-emerald-400/30' :
                              'bg-red-500/10 text-red-200 border-red-400/30'
                            }`}>
                              {status.toUpperCase()}
                            </span>
                          )}
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-300">
                            EVENT
                          </span>
                          <button
                            disabled={busy}
                            onClick={async () => {
                              if (!event.id) return;
                              try {
                                setBusy(true);
                                clearBanner();
                                const ok = await undoLastChange(uid, 'schedule', event.id);
                                if (ok) {
                                  setBanner({ type: 'success', message: 'Undid last change.' });
                                } else {
                                  setBanner({ type: 'info', message: 'Nothing to undo for this event.' });
                                }
                              } catch (e: any) {
                                setBanner({ type: 'error', message: e?.message || 'Failed to undo change' });
                              } finally {
                                setBusy(false);
                              }
                            }}
                            className="px-2 py-1 text-[11px] rounded border border-white/10 text-gray-300 hover:text-white hover:bg-white/10"
                            title="Undo last change on this event"
                          >
                            Undo
                          </button>
                          <button
                            disabled={busy}
                            onClick={() => setOpenMenuId(openMenuId === event.id ? null : (event.id || null))}
                            className="p-1.5 rounded hover:bg-white/10 text-gray-300 hover:text-white"
                            title="Change status"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.75a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 6a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 6a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" />
                            </svg>
                          </button>
                          {openMenuId === event.id && (
                            <div className="absolute right-0 top-7 min-w-[180px] bg-[rgba(20,20,30,0.95)] backdrop-blur-sm border border-white/10 rounded-lg shadow-lg z-20 overflow-hidden">
                              {(['tentative','hold','confirmed','published','canceled'] as ScheduleStatus[]).map((s) => (
                                <button
                                  key={s}
                                  onClick={() => event.id && setSingleStatus(event.id, s)}
                                  className="w-full text-left px-4 py-2 text-sm hover:bg-white/10 text-white"
                                >
                                  {s.charAt(0).toUpperCase() + s.slice(1)}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                } else {
                  // Shift rendering
                  const shift = item.data;
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
                                  {shiftDate.toLocaleDateString('en-US', { 
                                    month: 'short', 
                                    day: 'numeric',
                                    year: 'numeric'
                                  })}
                                </span>
                              </div>
                              
                              <div className="flex items-center gap-2 text-gray-400">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>{shift.startTime} - {shift.endTime}</span>
                              </div>
                              
                              {shift.location && (
                                <div className="flex items-center gap-2 text-gray-400">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                  </svg>
                                  <span>{shift.location}</span>
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
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300">
                            SHIFT
                          </span>
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
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }
              })}
            </div>
          );
        })()}
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
        }}
        onSuccess={() => {
          setShiftModalOpen(false);
          setEditingShift(null);
          setDefaultShiftProjectId('');
          setBanner({ type: 'success', message: editingShift ? 'Shift updated successfully' : 'Shift created successfully' });
        }}
        defaultDate={selectedDate.toISOString().split('T')[0]}
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
