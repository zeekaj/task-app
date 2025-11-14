// src/components/views/WeeklyScheduleGrid.tsx
import { useMemo, useState } from 'react';
import type { ScheduleEvent, Shift, WithId, Task, Project } from '../../types';
import { FloatingDropdown } from '../shared/FloatingDropdown';

interface WeeklyScheduleGridProps {
  weekStart: Date;
  events: WithId<ScheduleEvent>[];
  shifts: WithId<Shift>[];
  tasks?: WithId<Task>[];
  projects?: WithId<Project>[];
  teamMembers: any[];
  onShiftClick: (shift: WithId<Shift>) => void;
  onEventClick: (event: WithId<ScheduleEvent>) => void;
  onAddShift: (memberId: string, date: Date) => void;
  onTaskClick?: (task: WithId<Task>) => void;
  onProjectClick?: (project: WithId<Project>) => void;
}

interface DayColumn {
  date: Date;
  dateKey: string;
  dayName: string;
  dayNumber: number;
  monthName: string;
  isToday: boolean;
}

interface ScheduleItem {
  id: string;
  type: 'shift' | 'event' | 'task' | 'project';
  title: string;
  startTime: string;
  endTime: string;
  location?: string;
  color: string;
  textColor: string;
  data: any;
  style?: React.CSSProperties;
}

// Convert 24-hour time to 12-hour AM/PM format
function formatTime(time: string): string {
  const [hourStr, minute] = time.split(':');
  let hour = parseInt(hourStr, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12 || 12;
  return `${hour}:${minute} ${ampm}`;
}

export function WeeklyScheduleGrid({
  weekStart,
  events,
  shifts,
  tasks = [],
  projects = [],
  teamMembers,
  onShiftClick,
  onEventClick,
  onAddShift,
  onTaskClick,
  onProjectClick,
}: WeeklyScheduleGridProps) {
  const [temporaryFreelancers, setTemporaryFreelancers] = useState<string[]>([]);
  const [showFreelancerDropdown, setShowFreelancerDropdown] = useState(false);
  
  // Filter out freelancers from regular team members
  const regularTeamMembers = useMemo(() => {
    return teamMembers.filter(member => member.role !== 'freelance');
  }, [teamMembers]);
  
  // Get only freelancers
  const freelancers = useMemo(() => {
    return teamMembers.filter(member => member.role === 'freelance');
  }, [teamMembers]);
  
  // Get active freelancers (those with shifts or temporarily added)
  const activeFreelancers = useMemo(() => {
    const activeIds = new Set<string>(temporaryFreelancers);

    // Add freelancers who have shifts
    shifts.forEach(shift => {
      const member = teamMembers.find((m: any) => m.id === shift.assignedMemberId);
      if (member && member.role === 'freelance') {
        activeIds.add(member.id);
      }
    });

    return freelancers.filter(f => activeIds.has(f.id));
  }, [freelancers, shifts, teamMembers, temporaryFreelancers]);
  
  // Combine regular members and active freelancers for display
  const displayMembers = useMemo(() => {
    return [...regularTeamMembers, ...activeFreelancers];
  }, [regularTeamMembers, activeFreelancers]);

  // Build the 7-day header starting at weekStart
  const days = useMemo<DayColumn[]>(() => {
    const result: DayColumn[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + i);
      const isToday = date.getTime() === today.getTime();

      result.push({
        date,
        dateKey: date.toISOString().split('T')[0],
        dayName: date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
        dayNumber: date.getDate(),
        monthName: date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
        isToday,
      });
    }

    return result;
  }, [weekStart]);

  // Organize items by member and date
  const itemsByMemberAndDate = useMemo(() => {
    const map = new Map<string, Map<string, ScheduleItem[]>>();
    
    // Initialize map for all team members
    teamMembers?.forEach((member: any) => {
      map.set(member.id, new Map());
    });
    
    // Process shifts
    shifts.forEach(shift => {
      if (!shift.assignedMemberId) return; // Skip unassigned
      
      const memberId = shift.assignedMemberId;
      const dateKey = shift.date;
      
      if (!map.has(memberId)) {
        map.set(memberId, new Map());
      }
      const memberMap = map.get(memberId)!;
      if (!memberMap.has(dateKey)) {
        memberMap.set(dateKey, []);
      }
      
      // Check if shift is published (offered or confirmed status)
      const isPublished = shift.status === 'offered' || shift.status === 'confirmed';
      
      // Get project color if shift is linked to a project
      const project = shift.projectId ? projects.find(p => p.id === shift.projectId) : null;
      const projectColor = project?.color || '#14B8A6'; // default teal
      
      memberMap.get(dateKey)!.push({
        id: shift.id!,
        type: 'shift',
        title: shift.title,
        startTime: formatTime(shift.startTime),
        endTime: formatTime(shift.endTime),
        location: shift.location,
        color: isPublished ? '' : 'border-2 border-dashed',
        textColor: 'text-white',
        data: shift,
        style: { 
          backgroundColor: isPublished ? projectColor : `${projectColor}30`,
          borderColor: isPublished ? 'transparent' : `${projectColor}80`
        },
      });
    });
    
    // Process events
    events.forEach(event => {
      if (!event.assignedMemberIds || event.assignedMemberIds.length === 0) return;
      
      const startDate = event.start && 'toDate' in event.start 
        ? (event.start as any).toDate() 
        : new Date(event.start as any);
      const endDate = event.end && 'toDate' in event.end 
        ? (event.end as any).toDate() 
        : new Date(event.end as any);
      const dateKey = startDate.toISOString().split('T')[0];
      
      const startTime = startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      const endTime = endDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      
      event.assignedMemberIds.forEach(memberId => {
        if (!map.has(memberId)) {
          map.set(memberId, new Map());
        }
        const memberMap = map.get(memberId)!;
        if (!memberMap.has(dateKey)) {
          memberMap.set(dateKey, []);
        }
        
        memberMap.get(dateKey)!.push({
          id: event.id!,
          type: 'event',
          title: event.title,
          startTime,
          endTime,
          location: event.location,
          color: 'bg-purple-600',
          textColor: 'text-white',
          data: event,
        });
      });
    });
    
    // Process tasks - show on due date
    tasks.forEach(task => {
      if (!task.dueDate || !task.assignee) return;
      
      const dateKey = task.dueDate; // Already in YYYY-MM-DD format
      const memberId = typeof task.assignee === 'string' ? task.assignee : task.assignee.id;
      
      if (!map.has(memberId)) {
        map.set(memberId, new Map());
      }
      const memberMap = map.get(memberId)!;
      if (!memberMap.has(dateKey)) {
        memberMap.set(dateKey, []);
      }
      
      memberMap.get(dateKey)!.push({
        id: task.id!,
        type: 'task',
        title: task.title,
        startTime: 'Due',
        endTime: '',
        location: undefined,
        color: 'bg-purple-600/80',
        textColor: 'text-purple-100',
        data: task,
      });
    });
    
    // Process projects - show across project date range
    projects.forEach(project => {
      const prepDate = project.prepDate ? new Date(project.prepDate) : null;
      const returnDate = project.returnDate ? new Date(project.returnDate) : null;
      
      if (!prepDate && !returnDate) return;
      
      // Get all team members assigned to this project
      const projectMembers: string[] = [];
      if (project.projectManager) projectMembers.push(project.projectManager);
      if (project.assignees) projectMembers.push(...project.assignees);
      if (projectMembers.length === 0) return;
      
      // Show project across all dates in its range
      const projectStart = prepDate || returnDate!;
      const projectEnd = returnDate || prepDate!;
      
      // For each day in the project range that's visible in this week
      days.forEach(day => {
        const dayDate = new Date(day.date);
        if (dayDate >= projectStart && dayDate <= projectEnd) {
          const dateKey = day.dateKey;
          
          projectMembers.forEach(memberId => {
            if (!map.has(memberId)) {
              map.set(memberId, new Map());
            }
            const memberMap = map.get(memberId)!;
            if (!memberMap.has(dateKey)) {
              memberMap.set(dateKey, []);
            }
            
            memberMap.get(dateKey)!.push({
              id: project.id!,
              type: 'project',
              title: project.title,
              startTime: dayDate.getTime() === projectStart.getTime() ? 'Prep' : 
                         dayDate.getTime() === projectEnd.getTime() ? 'Return' : 'Active',
              endTime: '',
              location: undefined,
              color: 'bg-blue-600/80',
              textColor: 'text-blue-100',
              data: project,
            });
          });
        }
      });
    });
    
    // Sort items by start time within each cell
    map.forEach(memberMap => {
      memberMap.forEach(items => {
        items.sort((a, b) => {
          // Extract the original 24-hour time for proper sorting
          const getTime24 = (item: ScheduleItem) => {
            // Get the original shift/event data to access the 24-hour time
            if (item.type === 'shift' && item.data.startTime) {
              return item.data.startTime; // This is in HH:MM format (24-hour)
            }
            // For events or if no 24-hour time, fall back to parsing the formatted time
            const timeStr = item.startTime;
            const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
            if (!match) return '00:00';
            
            let hour = parseInt(match[1]);
            const minute = match[2];
            const period = match[3].toUpperCase();
            
            if (period === 'PM' && hour !== 12) hour += 12;
            if (period === 'AM' && hour === 12) hour = 0;
            
            return `${String(hour).padStart(2, '0')}:${minute}`;
          };
          
          const aTime = getTime24(a);
          const bTime = getTime24(b);
          return aTime.localeCompare(bTime);
        });
      });
    });
    
    return map;
  }, [shifts, events, displayMembers]);
  
  const handleAddFreelancer = (freelancerId: string) => {
    if (!temporaryFreelancers.includes(freelancerId)) {
      setTemporaryFreelancers([...temporaryFreelancers, freelancerId]);
    }
    setShowFreelancerDropdown(false);
  };
  
  const handleRemoveFreelancer = (freelancerId: string) => {
    setTemporaryFreelancers(temporaryFreelancers.filter(id => id !== freelancerId));
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
      {/* Header with days */}
      <div className="flex border-b border-gray-700 bg-gray-800/80 sticky top-0 z-10">
        {/* Team member column header */}
        <div className="w-48 flex-shrink-0 px-4 py-3 border-r border-gray-700 font-semibold text-gray-300 text-sm">
          TEAM MEMBER
        </div>
        
        {/* Day columns */}
        {days.map((day, idx) => (
          <div
            key={idx}
            className={`flex-1 min-w-[140px] px-3 py-2 text-center border-r border-gray-700 ${
              day.isToday ? 'bg-cyan-500/10' : ''
            }`}
          >
            <div className={`text-[11px] font-semibold tracking-wider ${
              day.isToday ? 'text-cyan-400' : 'text-gray-500'
            }`}>
              {day.dayName}
            </div>
            <div className="flex items-baseline justify-center gap-1 mt-0.5">
              <span className={`text-lg font-bold ${
                day.isToday ? 'text-cyan-300' : 'text-white'
              }`}>
                {day.dayNumber}
              </span>
              <span className={`text-[10px] font-medium ${
                day.isToday ? 'text-cyan-400' : 'text-gray-500'
              }`}>
                {day.monthName}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Team member rows */}
      <div className="flex-1 overflow-auto">
        {displayMembers && displayMembers.length > 0 ? (
          <>
            {displayMembers.map((member: any) => {
              const memberItems = itemsByMemberAndDate.get(member.id);
              const isFreelancer = member.role === 'freelance';
              
              return (
                <div key={member.id} className="flex border-b border-gray-700 hover:bg-gray-800/30 transition-colors group">
                  {/* Member name cell */}
                  <div className="w-48 flex-shrink-0 px-4 py-3 border-r border-gray-700 flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full ${
                      isFreelancer 
                        ? 'bg-gradient-to-br from-purple-500 to-pink-500' 
                        : 'bg-gradient-to-br from-cyan-500 to-blue-500'
                    } flex items-center justify-center text-white text-sm font-semibold flex-shrink-0`}>
                      {member.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate flex items-center gap-2">
                        {member.name}
                        {isFreelancer && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 font-medium">
                            FREELANCE
                          </span>
                        )}
                      </div>
                      {member.title && (
                        <div className="text-xs text-gray-500 truncate">
                          {member.title}
                        </div>
                      )}
                    </div>
                    {isFreelancer && temporaryFreelancers.includes(member.id) && (
                      <button
                        onClick={() => handleRemoveFreelancer(member.id)}
                        className="p-1 hover:bg-red-500/20 rounded text-gray-500 hover:text-red-400 transition-colors"
                        title="Remove from schedule"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                
                {/* Day cells */}
                {days.map((day) => {
                  const dayItems = memberItems?.get(day.dateKey) || [];
                  
                  return (
                    <div
                      key={day.dateKey}
                      className={`flex-1 min-w-[140px] p-2 border-r border-gray-700 min-h-[80px] ${
                        day.isToday ? 'bg-cyan-500/5' : ''
                      }`}
                    >
                      <div className="space-y-1.5">
                        {dayItems.map((item) => (
                          <div
                            key={item.id}
                            className={`${item.color} ${item.textColor} rounded px-2 py-1.5 cursor-pointer hover:opacity-90 transition-opacity shadow-sm`}
                            style={item.style}
                            onClick={() => {
                              if (item.type === 'shift') {
                                onShiftClick(item.data);
                              } else if (item.type === 'event') {
                                onEventClick(item.data);
                              } else if (item.type === 'task' && onTaskClick) {
                                onTaskClick(item.data);
                              } else if (item.type === 'project' && onProjectClick) {
                                onProjectClick(item.data);
                              }
                            }}
                          >
                            <div className="text-xs font-semibold truncate flex items-center gap-1">
                              {item.type === 'task' && '📋'}
                              {item.type === 'project' && '📁'}
                              {item.title}
                            </div>
                            <div className="text-[11px] opacity-90 mt-0.5">
                              {item.startTime}{item.endTime && ` - ${item.endTime}`}
                            </div>
                            {item.location && (
                              <div className="text-[10px] opacity-75 truncate mt-0.5">
                                📍 {item.location}
                              </div>
                            )}
                          </div>
                        ))}
                        
                        {/* Add shift button (shown on hover) */}
                        <button
                          onClick={() => onAddShift(member.id, day.date)}
                          className="w-full py-1.5 text-xs text-gray-500 hover:text-cyan-400 hover:bg-gray-700/50 rounded border border-dashed border-gray-600 hover:border-cyan-500/50 transition-all opacity-0 group-hover:opacity-100"
                        >
                          + Add Shift
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
          
          {/* Add Freelancer Row */}
          {freelancers.length > 0 && (
            <div className="flex border-b border-gray-700 bg-gray-800/20">
              <FloatingDropdown
                open={showFreelancerDropdown}
                onOpenChange={setShowFreelancerDropdown}
                triggerClassName="w-48 flex-shrink-0 px-4 py-3 border-r border-gray-700"
                trigger={
                  <button className="w-full flex items-center gap-3 px-3 py-2 border border-dashed border-gray-600 hover:border-purple-500/50 rounded hover:bg-purple-500/10 transition-all text-gray-400 hover:text-purple-400">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span className="text-sm font-medium">Add Freelancer</span>
                  </button>
                }
              >
                <div className="py-1">
                  {freelancers
                    .filter(f => !activeFreelancers.find(af => af.id === f.id))
                    .map((freelancer) => (
                      <button
                        key={freelancer.id}
                        onClick={() => handleAddFreelancer(freelancer.id)}
                        className="w-full px-4 py-2 text-left hover:bg-white/5 transition-colors flex items-center gap-3"
                      >
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                          {freelancer.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-white truncate">
                            {freelancer.name}
                          </div>
                          {freelancer.title && (
                            <div className="text-xs text-gray-500 truncate">
                              {freelancer.title}
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  {freelancers.filter(f => !activeFreelancers.find(af => af.id === f.id)).length === 0 && (
                    <div className="px-4 py-3 text-sm text-gray-500 text-center">
                      All freelancers are already shown
                    </div>
                  )}
                </div>
              </FloatingDropdown>
              
              {/* Empty day cells */}
              {days.map((day) => (
                <div
                  key={day.dateKey}
                  className={`flex-1 min-w-[140px] p-2 border-r border-gray-700 min-h-[60px] ${
                    day.isToday ? 'bg-cyan-500/5' : ''
                  }`}
                />
              ))}
            </div>
          )}
          </>
        ) : (
          <div className="flex items-center justify-center h-64 text-gray-500">
            No team members found. Add team members to start scheduling.
          </div>
        )}
      </div>
    </div>
  );
}
