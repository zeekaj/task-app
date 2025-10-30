// Dashboard View - Main overview page
import { useMemo, useEffect, useState, useRef, memo } from 'react';
import { KPITile, ChartPanel } from '../ui/Card';
import { useTasks } from '../../hooks/useTasks';
import { useProjects } from '../../hooks/useProjects';
import { useTeamMembers } from '../../hooks/useTeamMembers';
import { computeProjectStatus } from '../../utils/projectStatus';
import type { Activity } from '../../types';

// Helper function to format time ago
function getTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  
  // For older dates, show actual date
  const now = new Date();
  const isThisYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(isThisYear ? {} : { year: 'numeric' })
  });
}

interface DashboardViewProps {
  uid: string;
}

const DashboardViewComponent = ({ uid }: DashboardViewProps) => {
  const tasks = useTasks(uid);
  const projects = useProjects(uid);
  const teamMembers = useTeamMembers(uid);
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);
  
  // Prevent state from being reset on remount by keeping unsubscribe at module level
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Debug: Log when recentActivity changes
  useEffect(() => {
    console.log('recentActivity state updated:', recentActivity.length, recentActivity);
  }, [recentActivity]);

  // Debug: Track render count
  const renderCount = useRef(0);
  useEffect(() => {
    renderCount.current += 1;
    console.log('DashboardView render #', renderCount.current, 'recentActivity.length:', recentActivity.length);
  });

  // Fetch recent activity with real-time updates
  useEffect(() => {
    console.log('useEffect running, uid:', uid);
    if (!uid) return;
    
    // Clean up any existing listener before setting up a new one
    if (unsubscribeRef.current) {
      console.log('Cleaning up existing listener before setting up new one');
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    
    let isMounted = true;
    
    const setupListener = async () => {
      try {
        const { getFirebase } = await import('../../firebase');
        const { onSnapshot, query, orderBy, limit } = await import('firebase/firestore');
        
        if (!isMounted) return; // Check if still mounted before setting up listener
        
        const fb = await getFirebase();
        const activitiesRef = fb.col(uid, 'activities');
        const q = query(activitiesRef, orderBy('createdAt', 'desc'), limit(10));
        
        unsubscribeRef.current = onSnapshot(q, (snapshot: any) => {
          if (!isMounted) {
            console.log('Snapshot received but component unmounted, ignoring');
            return;
          }
          
          const activities = snapshot.docs.map((doc: any) => ({
            id: doc.id,
            ...doc.data()
          }));
          
          console.log('Raw activities from Firestore:', activities.map((a: any) => ({
            id: a.id,
            action: a.action,
            entityTitle: a.entityTitle,
            createdAt: a.createdAt,
            createdAtSeconds: a.createdAt?.seconds,
            createdAtDate: a.createdAt?.seconds ? new Date(a.createdAt.seconds * 1000).toISOString() : 'no timestamp'
          })));
          
          // Sort activities by createdAt descending (newest first) as a fallback
          // Create a NEW array to ensure React detects the state change
          const sortedActivities = [...activities].sort((a: any, b: any) => {
            const aTime = a.createdAt && typeof a.createdAt === 'object' && 'toDate' in a.createdAt 
              ? a.createdAt.toDate().getTime() 
              : (a.createdAt && typeof a.createdAt === 'object' && 'seconds' in a.createdAt 
                  ? a.createdAt.seconds * 1000 
                  : 0);
                  
            const bTime = b.createdAt && typeof b.createdAt === 'object' && 'toDate' in b.createdAt 
              ? b.createdAt.toDate().getTime() 
              : (b.createdAt && typeof b.createdAt === 'object' && 'seconds' in b.createdAt 
                  ? b.createdAt.seconds * 1000 
                  : 0);
                  
            return bTime - aTime; // Most recent first
          });
          
          console.log('Activities loaded and updating state:', sortedActivities.length, sortedActivities.slice(0, 5).map((a: any) => ({
            id: a.id,
            action: a.action,
            entityTitle: a.entityTitle
          })));
          console.log('About to call setRecentActivity with', sortedActivities.length, 'activities');
          setRecentActivity(sortedActivities as Activity[]);
        });
        
        console.log('Firestore listener setup complete');
      } catch (error) {
        console.error('Error setting up activity listener:', error);
      }
    };
    
    setupListener();
    
    return () => {
      console.log('Cleanup: unmounting, isMounted =', isMounted);
      isMounted = false;
      if (unsubscribeRef.current) {
        console.log('Cleanup: unsubscribing from Firestore listener');
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [uid]);

  // Calculate KPI metrics
  const metrics = useMemo(() => {
    // Active team members (active: true)
    const activeTeamMembers = teamMembers?.filter(m => m.active).length || 0;

    // Active tasks (not done, not archived)
    const activeTasks = tasks?.filter(t => 
      t.status !== 'done' && t.status !== 'archived'
    ).length || 0;

    // High priority tasks (priority > 60)
    const highPriorityTasks = tasks?.filter(t => 
      t.priority > 60 && t.status !== 'done' && t.status !== 'archived'
    ).length || 0;

    // Calculate team workload
    const tasksByAssignee = new Map<string, number>();
    tasks?.forEach(task => {
      if (task.status === 'done' || task.status === 'archived') return;
      const assignee = typeof task.assignee === 'string' ? task.assignee : task.assignee?.id;
      if (assignee) {
        tasksByAssignee.set(assignee, (tasksByAssignee.get(assignee) || 0) + 1);
      }
    });

    // Average workload (assuming max 10 tasks per person is 100%)
    const workloads = Array.from(tasksByAssignee.values());
    const avgWorkload = workloads.length > 0
      ? Math.round((workloads.reduce((a, b) => a + b, 0) / workloads.length / 10) * 100)
      : 0;

    // Active projects (not completed, not archived)
    const activeProjects = projects?.filter(p =>
      p.status !== 'completed' && p.status !== 'archived'
    ).length || 0;

    // Task status distribution
    const statusCounts = {
      not_started: 0,
      in_progress: 0,
      done: 0,
      blocked: 0,
      archived: 0,
    };
    tasks?.forEach(task => {
      if (task.status in statusCounts) {
        statusCounts[task.status as keyof typeof statusCounts]++;
      }
    });

    // Upcoming deadlines (next 7 days)
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const upcomingTasks = tasks?.filter(task => {
      if (!task.dueDate || task.status === 'done' || task.status === 'archived') return false;
      const dueDate = new Date(task.dueDate);
      return dueDate >= now && dueDate <= sevenDaysFromNow;
    }).sort((a, b) => {
      const aDate = new Date(a.dueDate!).getTime();
      const bDate = new Date(b.dueDate!).getTime();
      return aDate - bDate;
    }) || [];

    const upcomingProjects = projects?.filter(project => {
      if (project.status === 'completed' || project.status === 'archived') return false;
      if (!project.installDate) return false;
      const installDate = project.installDate instanceof Date 
        ? project.installDate 
        : typeof project.installDate === 'object' && 'toDate' in project.installDate
          ? project.installDate.toDate()
          : new Date(project.installDate);
      return installDate >= now && installDate <= sevenDaysFromNow;
    }).sort((a, b) => {
      const aDate = a.installDate instanceof Date 
        ? a.installDate 
        : typeof a.installDate === 'object' && 'toDate' in a.installDate
          ? a.installDate.toDate()
          : new Date(a.installDate!);
      const bDate = b.installDate instanceof Date 
        ? b.installDate 
        : typeof b.installDate === 'object' && 'toDate' in b.installDate
          ? b.installDate.toDate()
          : new Date(b.installDate!);
      return aDate.getTime() - bDate.getTime();
    }) || [];

    // Project health (on track vs behind)
    const projectHealth = {
      onTrack: 0,
      atRisk: 0,
      behind: 0,
    };
    projects?.forEach(project => {
      if (project.status === 'completed' || project.status === 'archived') return;
      const effectiveStatus = computeProjectStatus(project);
      const installDate = project.installDate instanceof Date 
        ? project.installDate 
        : typeof project.installDate === 'object' && 'toDate' in project.installDate
          ? project.installDate.toDate()
          : project.installDate ? new Date(project.installDate) : null;
      
      if (!installDate) {
        projectHealth.atRisk++;
        return;
      }

      const daysUntilInstall = Math.floor((installDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (effectiveStatus === 'blocked') {
        projectHealth.behind++;
      } else if (daysUntilInstall < 3 && effectiveStatus !== 'executing') {
        projectHealth.behind++;
      } else if (daysUntilInstall < 7 && effectiveStatus === 'not_started') {
        projectHealth.atRisk++;
      } else {
        projectHealth.onTrack++;
      }
    });

    return {
      activeTeamMembers,
      activeTasks,
      highPriorityTasks,
      avgWorkload: Math.min(avgWorkload, 100), // Cap at 100%
      activeProjects,
      statusCounts,
      upcomingTasks,
      upcomingProjects,
      projectHealth,
    };
  }, [tasks, projects, teamMembers]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-brand-text mb-2">Dashboard</h1>
        <p className="text-gray-400">{"Welcome back! Here's your productivity snapshot."}</p>
      </div>

      {/* KPI Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPITile
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
          label="Team Members"
          value={metrics.activeTeamMembers.toString()}
          subtitle="Active members"
          color="blue"
        />
        
        <KPITile
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }
          label="Active Tasks"
          value={metrics.activeTasks.toString()}
          subtitle="Not done or archived"
          color="cyan"
        />
        
        <KPITile
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          }
          label="Avg Workload"
          value={`${metrics.avgWorkload}%`}
          subtitle="Team capacity utilization"
          color="green"
        />
        
        <KPITile
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          label="High Priority"
          value={metrics.highPriorityTasks.toString()}
          subtitle="Priority > 60"
          color="orange"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <ChartPanel
          title="Recent Activity"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        >
          <div className="space-y-3">
            {recentActivity.length === 0 ? (
              <div className="text-sm text-gray-500 text-center py-8">
                No recent activity to display
              </div>
            ) : (
              recentActivity.slice(0, 5).map((activity) => {
                // Handle Firestore Timestamp conversion
                let createdAt: Date;
                if (activity.createdAt && typeof activity.createdAt === 'object') {
                  if ('toDate' in activity.createdAt && typeof activity.createdAt.toDate === 'function') {
                    createdAt = activity.createdAt.toDate();
                  } else if ('seconds' in activity.createdAt && typeof activity.createdAt.seconds === 'number') {
                    // Firestore Timestamp object with seconds and nanoseconds
                    createdAt = new Date((activity.createdAt as any).seconds * 1000);
                  } else {
                    createdAt = new Date();
                  }
                } else if (typeof activity.createdAt === 'string') {
                  createdAt = new Date(activity.createdAt);
                } else {
                  createdAt = new Date();
                }
                const timeAgo = getTimeAgo(createdAt);
                
                // Generate human-readable description
                let description = activity.description || '';
                if (activity.changes && Object.keys(activity.changes).length > 0) {
                  const changeDescriptions: string[] = [];
                  Object.entries(activity.changes).forEach(([field, change]) => {
                    const { to } = change;
                    
                    // Format field name nicely
                    const fieldName = field.replace(/([A-Z])/g, ' $1').toLowerCase().trim();
                    
                    // Format values
                    const formatValue = (val: any) => {
                      if (val === null || val === undefined || val === '') return 'none';
                      if (typeof val === 'boolean') return val ? 'yes' : 'no';
                      
                      // Handle empty object (likely a date that wasn't serialized properly)
                      if (typeof val === 'object' && val !== null && Object.keys(val).length === 0) {
                        return 'updated';
                      }
                      
                      // Handle Firestore Timestamp
                      if (typeof val === 'object' && val !== null && 'seconds' in val) {
                        return new Date(val.seconds * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                      }
                      
                      // Handle Date object
                      if (val instanceof Date) {
                        return val.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                      }
                      
                      // Handle ISO date string
                      if (typeof val === 'string' && (val.includes('T') || val.match(/^\d{4}-\d{2}-\d{2}/))) {
                        try {
                          return new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                        } catch {
                          return String(val).replace(/_/g, ' ');
                        }
                      }
                      
                      return String(val).replace(/_/g, ' ');
                    };
                    
                    const toStr = formatValue(to);
                    
                    if (field === 'status') {
                      changeDescriptions.push(`${toStr}`);
                    } else {
                      changeDescriptions.push(`${fieldName}: ${toStr}`);
                    }
                  });
                  
                  if (changeDescriptions.length > 0) {
                    description = changeDescriptions.join(', ');
                  }
                } else if (activity.action === 'created') {
                  description = 'Created';
                } else if (activity.action === 'deleted') {
                  description = 'Deleted';
                } else if (activity.action === 'archived') {
                  description = 'Archived';
                }
                
                return (
                  <div key={activity.id} className="flex items-start gap-3 pb-3 border-b border-gray-800 last:border-0">
                    <div className="flex-shrink-0 w-2 h-2 mt-1.5 rounded-full bg-cyan-500" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-300 truncate">{activity.entityTitle}</p>
                      <p className="text-xs text-gray-500 mt-0.5 capitalize">
                        {description} · {timeAgo}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ChartPanel>

        {/* Task Status Distribution */}
        <ChartPanel
          title="Task Status Distribution"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
            </svg>
          }
        >
          {tasks && tasks.length > 0 ? (
            <div className="space-y-3">
              {Object.entries(metrics.statusCounts).map(([status, count]) => {
                const total = tasks.length;
                const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
                const colors: Record<string, string> = {
                  not_started: 'bg-gray-500',
                  in_progress: 'bg-blue-500',
                  done: 'bg-green-500',
                  blocked: 'bg-red-500',
                  archived: 'bg-gray-700',
                };
                const labels: Record<string, string> = {
                  not_started: 'Not Started',
                  in_progress: 'In Progress',
                  done: 'Done',
                  blocked: 'Blocked',
                  archived: 'Archived',
                };
                
                return (
                  <div key={status} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">{labels[status]}</span>
                      <span className="text-gray-300 font-medium">{count} ({percentage}%)</span>
                    </div>
                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${colors[status]} transition-all duration-300`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-sm text-gray-500 text-center py-8">
              No task data available
            </div>
          )}
        </ChartPanel>
      </div>

      {/* Upcoming Deadlines & Project Health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Deadlines */}
        <ChartPanel
          title="Upcoming Deadlines (Next 7 Days)"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
        >
          {metrics.upcomingTasks.length === 0 && metrics.upcomingProjects.length === 0 ? (
            <div className="text-sm text-gray-500 text-center py-8">
              No upcoming deadlines
            </div>
          ) : (
            <div className="space-y-2">
              {metrics.upcomingTasks.slice(0, 3).map(task => {
                const dueDate = new Date(task.dueDate!);
                const daysUntil = Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                const isOverdue = daysUntil < 0;
                const isToday = daysUntil === 0;
                
                return (
                  <div key={task.id} className="flex items-center justify-between p-2 rounded bg-gray-800/50 hover:bg-gray-800 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-300 truncate">{task.title}</p>
                      <p className="text-xs text-gray-500">Task</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${
                      isOverdue ? 'bg-red-500/20 text-red-400' :
                      isToday ? 'bg-orange-500/20 text-orange-400' :
                      'bg-cyan-500/20 text-cyan-400'
                    }`}>
                      {isOverdue ? 'Overdue' : isToday ? 'Today' : `${daysUntil}d`}
                    </span>
                  </div>
                );
              })}
              {metrics.upcomingProjects.slice(0, 3).map(project => {
                const installDate = project.installDate instanceof Date 
                  ? project.installDate 
                  : typeof project.installDate === 'object' && 'toDate' in project.installDate
                    ? project.installDate.toDate()
                    : new Date(project.installDate!);
                const daysUntil = Math.ceil((installDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                const isToday = daysUntil === 0;
                
                return (
                  <div key={project.id} className="flex items-center justify-between p-2 rounded bg-gray-800/50 hover:bg-gray-800 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-300 truncate">{project.title}</p>
                      <p className="text-xs text-gray-500">Project Install Date</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${
                      isToday ? 'bg-orange-500/20 text-orange-400' :
                      daysUntil <= 3 ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-cyan-500/20 text-cyan-400'
                    }`}>
                      {isToday ? 'Today' : `${daysUntil}d`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </ChartPanel>

        {/* Project Health */}
        <ChartPanel
          title="Project Health"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        >
          {projects && projects.length > 0 ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 rounded bg-green-500/10 border border-green-500/20">
                  <div className="text-2xl font-bold text-green-400">{metrics.projectHealth.onTrack}</div>
                  <div className="text-xs text-gray-400 mt-1">On Track</div>
                </div>
                <div className="text-center p-3 rounded bg-yellow-500/10 border border-yellow-500/20">
                  <div className="text-2xl font-bold text-yellow-400">{metrics.projectHealth.atRisk}</div>
                  <div className="text-xs text-gray-400 mt-1">At Risk</div>
                </div>
                <div className="text-center p-3 rounded bg-red-500/10 border border-red-500/20">
                  <div className="text-2xl font-bold text-red-400">{metrics.projectHealth.behind}</div>
                  <div className="text-xs text-gray-400 mt-1">Behind</div>
                </div>
              </div>
              <div className="text-xs text-gray-500 text-center">
                Active projects: {metrics.activeProjects}
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-500 text-center py-8">
              No active projects
            </div>
          )}
        </ChartPanel>
      </div>
    </div>
  );
};

// Wrap in memo to prevent unnecessary remounts and export as named export
export const DashboardView = memo(DashboardViewComponent);
