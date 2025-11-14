// Dashboard View - Main overview page
import { useMemo, useEffect, useState, useRef, memo } from 'react';
import { KPITile, ChartPanel } from '../ui/Card';
import { useRoleBasedTasks } from '../../hooks/useRoleBasedTasks';
import { useRoleBasedProjects } from '../../hooks/useRoleBasedProjects';
import { useTeamMembers } from '../../hooks/useTeamMembers';
import { useUserContext } from '../../hooks/useUserContext';
import { computeProjectStatus } from '../../utils/projectStatus';
import type { Activity } from '../../types';
import { TaskCreateForm } from '../TaskCreateForm';
import { Modal } from '../shared/Modal';

// Helper to navigate and set filters
const navigateToView = (view: 'tasks' | 'projects' | 'team', filters?: Record<string, any>) => {
  // Save filters to localStorage for the target view
  if (filters) {
    localStorage.setItem(`${view}ViewFilters`, JSON.stringify(filters));
  }
  // Change the active tab
  localStorage.setItem('activeTab', view);
  // Trigger a page reload to apply filters
  window.location.reload();
};

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
  const tasks = useRoleBasedTasks(uid);
  // Show all projects on the dashboard (skip role-based filtering)
  const projects = useRoleBasedProjects(uid, undefined, true);
  const teamMembers = useTeamMembers(uid);
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);
  const [showQuickAddTask, setShowQuickAddTask] = useState(false);
  
  // Get organization ID from user context
  const { organizationId } = useUserContext();
  
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
    console.log('useEffect running, uid:', uid, 'organizationId:', organizationId);
    if (!uid || !organizationId) return;
    
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
        const activitiesRef = fb.orgCol(organizationId, 'activities');
        const q = query(activitiesRef, orderBy('createdAt', 'desc'), limit(50));
        
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
  }, [uid, organizationId]);  // Calculate KPI metrics
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
    
    // Task velocity metrics - calculate tasks completed in last 7 and 30 days
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const taskCompletionsLast7Days = recentActivity.filter(a => {
      if (a.action !== 'updated' || a.entityType !== 'task') return false;
      if (!a.changes?.status || a.changes.status.to !== 'done') return false;
      
      const activityDate = a.createdAt && typeof a.createdAt === 'object' && 'toDate' in a.createdAt 
        ? a.createdAt.toDate() 
        : (a.createdAt && typeof a.createdAt === 'object' && 'seconds' in a.createdAt 
            ? new Date(a.createdAt.seconds * 1000) 
            : new Date());
      
      return activityDate >= sevenDaysAgo;
    }).length;

    const taskCompletionsLast30Days = recentActivity.filter(a => {
      if (a.action !== 'updated' || a.entityType !== 'task') return false;
      if (!a.changes?.status || a.changes.status.to !== 'done') return false;
      
      const activityDate = a.createdAt && typeof a.createdAt === 'object' && 'toDate' in a.createdAt 
        ? a.createdAt.toDate() 
        : (a.createdAt && typeof a.createdAt === 'object' && 'seconds' in a.createdAt 
            ? new Date(a.createdAt.seconds * 1000) 
            : new Date());
      
      return activityDate >= thirtyDaysAgo;
    }).length;

    const velocityPerDay = taskCompletionsLast7Days / 7;
    const velocityPerWeek = taskCompletionsLast7Days;
    
    // Estimate days to complete remaining tasks based on velocity
    const daysToComplete = velocityPerDay > 0 ? Math.ceil(activeTasks / velocityPerDay) : null;
    
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

    // Project health (on track vs behind) - enhanced algorithm
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
      
      // Get project tasks for health calculation
      const projectTasks = tasks?.filter(t => t.projectId === project.id) || [];
      const totalTasks = projectTasks.length;
      const completedTasks = projectTasks.filter(t => t.status === 'done').length;
      const blockedTasks = projectTasks.filter(t => t.status === 'blocked').length;
      const overdueTasks = projectTasks.filter(t => {
        if (!t.dueDate || t.status === 'done') return false;
        const dueDate = new Date(t.dueDate);
        return dueDate < now;
      }).length;
      
      // Calculate health score (0-100, higher is better)
      let healthScore = 100;
      
      // Factor 1: Blocked status (instant critical)
      if (effectiveStatus === 'blocked') {
        healthScore -= 50;
      }
      
      // Factor 2: Days until install vs project status
      if (daysUntilInstall < 0) {
        // Project is overdue
        healthScore -= 40;
      } else if (daysUntilInstall < 3 && effectiveStatus !== 'executing') {
        // Critical: install in <3 days but not executing
        healthScore -= 35;
      } else if (daysUntilInstall < 7 && effectiveStatus === 'not_started') {
        // Warning: install in <7 days but not started
        healthScore -= 25;
      }
      
      // Factor 3: Task completion percentage
      if (totalTasks > 0) {
        const completionPercentage = (completedTasks / totalTasks) * 100;
        
        // Calculate expected completion based on days until install
        const totalDaysForProject = 30; // assume 30-day project cycle
        const daysPassed = totalDaysForProject - daysUntilInstall;
        const expectedCompletion = Math.max(0, Math.min(100, (daysPassed / totalDaysForProject) * 100));
        
        // Penalize if behind expected progress
        const progressGap = expectedCompletion - completionPercentage;
        if (progressGap > 20) {
          healthScore -= 20; // Significantly behind
        } else if (progressGap > 10) {
          healthScore -= 10; // Moderately behind
        }
      }
      
      // Factor 4: Blocked tasks (proportional penalty)
      if (totalTasks > 0 && blockedTasks > 0) {
        const blockedPercentage = (blockedTasks / totalTasks) * 100;
        if (blockedPercentage > 50) {
          healthScore -= 25; // More than half blocked
        } else if (blockedPercentage > 25) {
          healthScore -= 15; // Quarter blocked
        } else {
          healthScore -= 10; // Some blocked
        }
      }
      
      // Factor 5: Overdue tasks
      if (overdueTasks > 0) {
        const overduePercentage = (overdueTasks / totalTasks) * 100;
        if (overduePercentage > 30) {
          healthScore -= 20; // Many overdue
        } else if (overduePercentage > 10) {
          healthScore -= 10; // Some overdue
        } else {
          healthScore -= 5; // Few overdue
        }
      }
      
      // Categorize based on final health score
      if (healthScore >= 70) {
        projectHealth.onTrack++;
      } else if (healthScore >= 40) {
        projectHealth.atRisk++;
      } else {
        projectHealth.behind++;
      }
    });

    // Burn-down data for active projects
    const burnDownData = projects
      ?.filter(p => p.status !== 'completed' && p.status !== 'archived')
      .map(project => {
        const projectTasks = tasks?.filter(t => t.projectId === project.id) || [];
        const totalTasks = projectTasks.length;
        const completedTasks = projectTasks.filter(t => t.status === 'done').length;
        const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        
        return {
          id: project.id,
          title: project.title,
          totalTasks,
          completedTasks,
          remainingTasks: totalTasks - completedTasks,
          completionPercentage,
        };
      })
      .filter(p => p.totalTasks > 0) // Only show projects with tasks
      .sort((a, b) => b.totalTasks - a.totalTasks) // Sort by most tasks first
      .slice(0, 5) || []; // Show top 5 projects

    // Team utilization data
    const teamUtilization = teamMembers
      ?.filter(m => m.active)
      .map(member => {
        const assignedTasks = tasks?.filter(t => 
          t.assignee === member.id && 
          t.status !== 'done' && 
          t.status !== 'archived'
        ) || [];
        
        const activeTasks = assignedTasks.length;
        const highPriorityTasks = assignedTasks.filter(t => t.priority && t.priority >= 61).length;
        const overdueTasks = assignedTasks.filter(t => {
          if (!t.dueDate) return false;
          const dueDate = new Date(t.dueDate);
          return dueDate < now;
        }).length;

        // Calculate utilization score (0-100)
        // 0-5 tasks = normal, 6-10 = high, 11+ = overloaded
        const utilizationScore = Math.min(Math.round((activeTasks / 10) * 100), 100);
        
        return {
          id: member.id,
          name: member.name,
          activeTasks,
          highPriorityTasks,
          overdueTasks,
          utilizationScore,
          status: utilizationScore < 30 ? 'underutilized' : 
                  utilizationScore < 70 ? 'optimal' : 
                  utilizationScore < 90 ? 'high' : 'overloaded',
        };
      })
      .sort((a, b) => b.activeTasks - a.activeTasks) // Sort by most active tasks
      .slice(0, 6) || []; // Show top 6 team members

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
      burnDownData,
      teamUtilization,
      velocity: {
        perDay: velocityPerDay,
        perWeek: velocityPerWeek,
        completionsLast7Days: taskCompletionsLast7Days,
        completionsLast30Days: taskCompletionsLast30Days,
        daysToComplete,
      },
    };
  }, [tasks, projects, teamMembers, recentActivity]);

  return (
    <>
    <div className="space-y-6">
      {/* Page Header with Quick Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-brand-text mb-2">Dashboard</h1>
          <p className="text-gray-400">{"Welcome back! Here's your productivity snapshot."}</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Quick Actions */}
          <button
            onClick={() => setShowQuickAddTask(true)}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 rounded-lg text-cyan-400 text-sm font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Quick Add Task
          </button>
        </div>
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
        
        <div onClick={() => navigateToView('tasks', { status: ['active'] })} className="cursor-pointer">
          <KPITile
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            }
            label="Active Tasks"
            value={metrics.activeTasks.toString()}
            subtitle="Click to view • Not done or archived"
            color="cyan"
          />
        </div>
        
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
        
        <div onClick={() => navigateToView('tasks', { minPriority: [61] })} className="cursor-pointer">
          <KPITile
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            label="High Priority"
            value={metrics.highPriorityTasks.toString()}
            subtitle="Click to view • Priority > 60"
            color="orange"
          />
        </div>
      </div>

      {/* Project KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div onClick={() => navigateToView('projects')} className="cursor-pointer">
          <KPITile
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            }
            label="Active Projects"
            value={metrics.activeProjects.toString()}
            subtitle="Click to view • Not completed or archived"
            color="violet"
          />
        </div>
        
        <KPITile
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          label="On Track"
          value={metrics.projectHealth.onTrack.toString()}
          subtitle="Projects with good health"
          color="green"
        />
        
        <KPITile
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          label="At Risk"
          value={metrics.projectHealth.atRisk.toString()}
          subtitle="Projects need attention"
          color="orange"
        />
        
        <KPITile
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          }
          label="Behind"
          value={metrics.projectHealth.behind.toString()}
          subtitle="Projects critically behind"
          color="red"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alerts & Blockers */}
        <ChartPanel
          title="Alerts & Blockers"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          }
        >
          <div className="space-y-3">
            {/* Blocked Items */}
            {(() => {
              const blockedTasks = tasks?.filter(t => t.status === 'blocked') || [];
              const blockedProjects = projects?.filter(p => p.status === 'blocked') || [];
              const totalBlocked = blockedTasks.length + blockedProjects.length;
              
              // Overdue tasks
              const now = new Date();
              const overdueTasks = tasks?.filter(t => {
                if (t.status === 'done' || t.status === 'archived' || !t.dueDate) return false;
                const dueDate = new Date(t.dueDate);
                return dueDate < now;
              }) || [];
              
              // Critical projects (install date < 3 days)
              const criticalProjects = projects?.filter(p => {
                if (p.status === 'completed' || p.status === 'archived' || !p.installDate) return false;
                const installDate = p.installDate instanceof Date 
                  ? p.installDate 
                  : typeof p.installDate === 'object' && 'toDate' in p.installDate
                    ? p.installDate.toDate()
                    : new Date(p.installDate);
                const daysUntil = Math.floor((installDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                return daysUntil >= 0 && daysUntil < 3;
              }) || [];
              
              const hasAlerts = totalBlocked > 0 || overdueTasks.length > 0 || criticalProjects.length > 0;
              
              if (!hasAlerts) {
                return (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-3">✨</div>
                    <div className="text-sm text-gray-400">All clear! No alerts or blockers</div>
                  </div>
                );
              }
              
              return (
                <>
                  {totalBlocked > 0 && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                          </svg>
                          <span className="text-sm font-semibold text-red-400">Blocked Items</span>
                        </div>
                        <span className="text-xs px-2 py-1 rounded bg-red-500/20 text-red-300 font-bold">{totalBlocked}</span>
                      </div>
                      <div className="text-xs text-gray-400 space-y-1">
                        {blockedTasks.length > 0 && (
                          <div 
                            className="cursor-pointer hover:text-gray-300 transition-colors"
                            onClick={() => navigateToView('tasks', { status: ['blocked'] })}
                          >
                            • {blockedTasks.length} blocked task{blockedTasks.length !== 1 ? 's' : ''} (click to view)
                          </div>
                        )}
                        {blockedProjects.length > 0 && (
                          <div 
                            className="cursor-pointer hover:text-gray-300 transition-colors"
                            onClick={() => navigateToView('projects')}
                          >
                            • {blockedProjects.length} blocked project{blockedProjects.length !== 1 ? 's' : ''} (click to view)
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {overdueTasks.length > 0 && (
                    <div 
                      className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/30 cursor-pointer hover:bg-orange-500/15 transition-colors"
                      onClick={() => navigateToView('tasks', { due: ['overdue'] })}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-sm font-semibold text-orange-400">Overdue Tasks</span>
                        </div>
                        <span className="text-xs px-2 py-1 rounded bg-orange-500/20 text-orange-300 font-bold">{overdueTasks.length}</span>
                      </div>
                      <div className="text-xs text-gray-400">
                        {overdueTasks.slice(0, 2).map((t, i) => (
                          <div key={i} className="truncate">• {t.title}</div>
                        ))}
                        {overdueTasks.length > 2 && <div className="text-gray-500 mt-1">+{overdueTasks.length - 2} more (click to view all)</div>}
                      </div>
                    </div>
                  )}
                  
                  {criticalProjects.length > 0 && (
                    <div 
                      className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 cursor-pointer hover:bg-yellow-500/15 transition-colors"
                      onClick={() => navigateToView('projects')}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          <span className="text-sm font-semibold text-yellow-400">Critical Projects</span>
                        </div>
                        <span className="text-xs px-2 py-1 rounded bg-yellow-500/20 text-yellow-300 font-bold">{criticalProjects.length}</span>
                      </div>
                      <div className="text-xs text-gray-400">
                        Install date within 3 days
                        {criticalProjects.slice(0, 2).map((p, i) => (
                          <div key={i} className="truncate mt-1">• {p.title}</div>
                        ))}
                        {criticalProjects.length > 2 && <div className="text-gray-500 mt-1">+{criticalProjects.length - 2} more (click to view all)</div>}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </ChartPanel>

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
                
                // Get the user name who performed the action
                const userName = activity.userName || 'Someone';
                
                return (
                  <div key={activity.id} className="flex items-start gap-3 pb-3 border-b border-gray-800 last:border-0">
                    <div className="flex-shrink-0 w-2 h-2 mt-1.5 rounded-full bg-cyan-500" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-300 truncate">{activity.entityTitle}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        <span className="text-cyan-400 font-medium">{userName}</span>
                        <span className="capitalize"> · {description} · {timeAgo}</span>
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

        {/* Priority Distribution */}
        <ChartPanel
          title="Priority Distribution"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
            </svg>
          }
        >
          {(() => {
            const activeTasks = tasks?.filter(t => t.status !== 'done' && t.status !== 'archived') || [];
            if (activeTasks.length === 0) {
              return (
                <div className="text-sm text-gray-500 text-center py-8">
                  No active tasks
                </div>
              );
            }
            
            // Group by priority ranges: 0-20 (Low), 21-40 (Medium-Low), 41-60 (Medium), 61-80 (Medium-High), 81-100 (High)
            const priorityRanges = {
              'Critical (81-100)': activeTasks.filter(t => t.priority > 80).length,
              'High (61-80)': activeTasks.filter(t => t.priority >= 61 && t.priority <= 80).length,
              'Medium (41-60)': activeTasks.filter(t => t.priority >= 41 && t.priority <= 60).length,
              'Low (21-40)': activeTasks.filter(t => t.priority >= 21 && t.priority <= 40).length,
              'Minimal (0-20)': activeTasks.filter(t => t.priority <= 20).length,
            };
            
            const colors = {
              'Critical (81-100)': 'bg-red-500',
              'High (61-80)': 'bg-orange-500',
              'Medium (41-60)': 'bg-yellow-500',
              'Low (21-40)': 'bg-blue-500',
              'Minimal (0-20)': 'bg-gray-500',
            };
            
            const total = activeTasks.length;
            
            return (
              <div className="space-y-3">
                {Object.entries(priorityRanges).map(([label, count]) => {
                  const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
                  
                  return (
                    <div key={label} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">{label}</span>
                        <span className="text-gray-300 font-medium">{count} ({percentage}%)</span>
                      </div>
                      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${colors[label as keyof typeof colors]} transition-all duration-300`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
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
                  <div 
                    key={task.id} 
                    className="flex items-center justify-between p-2 rounded bg-gray-800/50 hover:bg-gray-800 transition-colors cursor-pointer"
                    onClick={() => navigateToView('tasks', { due: [isToday ? 'today' : 'week'] })}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-300 truncate">{task.title}</p>
                      <p className="text-xs text-gray-500">Task • Click to view</p>
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
                  <div 
                    key={project.id} 
                    className="flex items-center justify-between p-2 rounded bg-gray-800/50 hover:bg-gray-800 transition-colors cursor-pointer"
                    onClick={() => navigateToView('projects')}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-300 truncate">{project.title}</p>
                      <p className="text-xs text-gray-500">Project Install Date • Click to view</p>
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
                {/* On Track */}
                <div 
                  className="text-center p-3 rounded bg-green-500/10 border border-green-500/20 cursor-help group relative"
                  title="Health Score ≥70"
                >
                  <div className="text-2xl font-bold text-green-400">{metrics.projectHealth.onTrack}</div>
                  <div className="text-xs text-gray-400 mt-1">On Track</div>
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900/95 border border-green-500/30 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 w-64 z-10">
                    <div className="text-xs text-green-400 font-semibold mb-1">On Track (Health ≥70)</div>
                    <div className="text-xs text-gray-300 space-y-1">
                      <div>• Not blocked</div>
                      <div>• Good progress vs timeline</div>
                      <div>• Few/no overdue tasks</div>
                      <div>• Minimal blockers</div>
                    </div>
                  </div>
                </div>
                
                {/* At Risk */}
                <div 
                  className="text-center p-3 rounded bg-yellow-500/10 border border-yellow-500/20 cursor-help group relative"
                  title="Health Score 40-69"
                >
                  <div className="text-2xl font-bold text-yellow-400">{metrics.projectHealth.atRisk}</div>
                  <div className="text-xs text-gray-400 mt-1">At Risk</div>
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900/95 border border-yellow-500/30 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 w-64 z-10">
                    <div className="text-xs text-yellow-400 font-semibold mb-1">At Risk (Health 40-69)</div>
                    <div className="text-xs text-gray-300 space-y-1">
                      <div>• Behind schedule</div>
                      <div>• Some overdue tasks</div>
                      <div>• Moderate blockers (10-50%)</div>
                      <div>• Install date approaching</div>
                    </div>
                  </div>
                </div>
                
                {/* Behind */}
                <div 
                  className="text-center p-3 rounded bg-red-500/10 border border-red-500/20 cursor-help group relative"
                  title="Health Score <40"
                >
                  <div className="text-2xl font-bold text-red-400">{metrics.projectHealth.behind}</div>
                  <div className="text-xs text-gray-400 mt-1">Behind</div>
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900/95 border border-red-500/30 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 w-64 z-10">
                    <div className="text-xs text-red-400 font-semibold mb-1">Behind (Health &lt;40)</div>
                    <div className="text-xs text-gray-300 space-y-1">
                      <div>• Project blocked</div>
                      <div>• Install date overdue/critical</div>
                      <div>• Many overdue tasks (&gt;30%)</div>
                      <div>• Significant blockers (&gt;50%)</div>
                      <div>• Well behind progress target</div>
                    </div>
                  </div>
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

        {/* Burn-Down Chart */}
        <ChartPanel
          title="Project Progress"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
        >
          {metrics.burnDownData.length === 0 ? (
            <div className="text-sm text-gray-500 text-center py-8">
              No active projects with tasks
            </div>
          ) : (
            <div className="space-y-4">
              {metrics.burnDownData.map((project) => {
                const completedWidth = project.completionPercentage;
                const remainingWidth = 100 - completedWidth;

                return (
                  <div 
                    key={project.id} 
                    className="space-y-2 cursor-pointer hover:bg-gray-800/30 p-2 -m-2 rounded transition-colors"
                    onClick={() => {
                      // Navigate to projects view and try to open this specific project
                      navigateToView('projects');
                    }}
                    title="Click to view project details"
                  >
                    <div className="flex justify-between items-baseline">
                      <span className="text-sm font-medium text-gray-300 truncate flex-1 mr-2">{project.title}</span>
                      <span className="text-xs text-gray-400 whitespace-nowrap">
                        {project.completedTasks}/{project.totalTasks} ({project.completionPercentage}%)
                      </span>
                    </div>
                    <div className="h-7 bg-gray-800/50 rounded-full overflow-hidden flex border border-gray-700/50">
                      {completedWidth > 0 && (
                        <div
                          className="bg-gradient-to-r from-emerald-500 to-cyan-500 flex items-center justify-end pr-2 transition-all duration-500"
                          style={{ width: `${completedWidth}%` }}
                        >
                          {completedWidth > 15 && (
                            <span className="text-xs font-semibold text-white drop-shadow">
                              {project.completedTasks}
                            </span>
                          )}
                        </div>
                      )}
                      {remainingWidth > 0 && (
                        <div
                          className="bg-gray-700/40 flex items-center justify-start pl-2"
                          style={{ width: `${remainingWidth}%` }}
                        >
                          {remainingWidth > 15 && (
                            <span className="text-xs font-medium text-gray-400">
                              {project.remainingTasks}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ChartPanel>

        {/* Team Utilization */}
        <ChartPanel
          title="Team Utilization"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          }
        >
          {metrics.teamUtilization.length === 0 ? (
            <div className="text-sm text-gray-500 text-center py-8">
              No team members with active tasks
            </div>
          ) : (
            <div className="space-y-3">
              {metrics.teamUtilization.map((member) => {
                const statusColor = 
                  member.status === 'underutilized' ? 'bg-blue-500/20 border-blue-500/30 text-blue-400' :
                  member.status === 'optimal' ? 'bg-green-500/20 border-green-500/30 text-green-400' :
                  member.status === 'high' ? 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400' :
                  'bg-red-500/20 border-red-500/30 text-red-400';

                return (
                  <div 
                    key={member.id} 
                    className="space-y-1.5 cursor-pointer hover:bg-gray-800/30 p-2 -m-2 rounded transition-colors"
                    onClick={() => navigateToView('tasks', { assigned: [member.id] })}
                    title="Click to view this member's tasks"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-300">{member.name}</span>
                      <div className="flex items-center gap-2">
                        {member.overdueTasks > 0 && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">
                            {member.overdueTasks} overdue
                          </span>
                        )}
                        {member.highPriorityTasks > 0 && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30">
                            {member.highPriorityTasks} high priority
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-6 bg-gray-800/50 rounded-full overflow-hidden border border-gray-700/50">
                        <div
                          className={`h-full flex items-center justify-center text-xs font-semibold transition-all duration-500 ${statusColor}`}
                          style={{ width: `${member.utilizationScore}%` }}
                        >
                          {member.utilizationScore > 15 && (
                            <span>{member.activeTasks} tasks</span>
                          )}
                        </div>
                      </div>
                      {member.utilizationScore <= 15 && (
                        <span className="text-xs text-gray-400 whitespace-nowrap">
                          {member.activeTasks} tasks
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ChartPanel>

        {/* Task Velocity Metrics */}
        <ChartPanel
          title="Task Velocity"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          }
        >
          <div className="space-y-4">
            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 rounded bg-cyan-500/10 border border-cyan-500/20">
                <div className="text-2xl font-bold text-cyan-400">
                  {metrics.velocity.completionsLast7Days}
                </div>
                <div className="text-xs text-gray-400 mt-1">Last 7 Days</div>
              </div>
              <div className="text-center p-3 rounded bg-blue-500/10 border border-blue-500/20">
                <div className="text-2xl font-bold text-blue-400">
                  {metrics.velocity.completionsLast30Days}
                </div>
                <div className="text-xs text-gray-400 mt-1">Last 30 Days</div>
              </div>
            </div>

            {/* Velocity Rates */}
            <div className="space-y-2">
              <div className="flex justify-between items-center p-2 rounded bg-gray-800/30">
                <span className="text-sm text-gray-400">Per Day</span>
                <span className="text-sm font-semibold text-gray-200">
                  {metrics.velocity.perDay.toFixed(1)} tasks
                </span>
              </div>
              <div className="flex justify-between items-center p-2 rounded bg-gray-800/30">
                <span className="text-sm text-gray-400">Per Week</span>
                <span className="text-sm font-semibold text-gray-200">
                  {metrics.velocity.perWeek} tasks
                </span>
              </div>
            </div>

            {/* Forecast */}
            {metrics.velocity.daysToComplete && (
              <div className="mt-3 pt-3 border-t border-gray-700/50">
                <div className="text-center">
                  <div className="text-xs text-gray-400 mb-1">Est. completion of active tasks</div>
                  <div className="text-lg font-bold text-emerald-400">
                    {metrics.velocity.daysToComplete} days
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    at current velocity
                  </div>
                </div>
              </div>
            )}
            {!metrics.velocity.daysToComplete && metrics.activeTasks > 0 && (
              <div className="text-xs text-gray-500 text-center py-2">
                No recent completions to forecast
              </div>
            )}
          </div>
        </ChartPanel>
      </div>

      {/* Insights & Recommendations */}
      <ChartPanel
        title="Insights & Recommendations"
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Task Completion Rate */}
          {(() => {
            const totalTasks = tasks?.length || 0;
            const completedTasks = tasks?.filter(t => t.status === 'done').length || 0;
            const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
            
            return (
              <div className="p-4 rounded-lg bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20">
                <div className="text-3xl font-bold text-cyan-400 mb-2">{completionRate}%</div>
                <div className="text-sm text-gray-300 font-medium mb-1">Overall Completion Rate</div>
                <div className="text-xs text-gray-400">{completedTasks} of {totalTasks} tasks completed</div>
              </div>
            );
          })()}
          
          {/* Team Performance */}
          {(() => {
            const activeMembers = metrics.teamUtilization.length;
            const optimalMembers = metrics.teamUtilization.filter(m => m.status === 'optimal').length;
            const overloadedMembers = metrics.teamUtilization.filter(m => m.status === 'overloaded').length;
            
            let recommendation = '';
            let icon = '👍';
            
            if (overloadedMembers > 0) {
              recommendation = `${overloadedMembers} team member${overloadedMembers !== 1 ? 's' : ''} overloaded. Consider redistributing tasks.`;
              icon = '⚠️';
            } else if (optimalMembers === activeMembers && activeMembers > 0) {
              recommendation = 'Team workload is well balanced!';
              icon = '✨';
            } else if (activeMembers > 0) {
              recommendation = 'Team capacity available for new assignments.';
              icon = '📊';
            } else {
              recommendation = 'No team members with active tasks.';
              icon = '📋';
            }
            
            return (
              <div className="p-4 rounded-lg bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20">
                <div className="text-3xl mb-2">{icon}</div>
                <div className="text-sm text-gray-300 font-medium mb-1">Team Balance</div>
                <div className="text-xs text-gray-400">{recommendation}</div>
              </div>
            );
          })()}
          
          {/* Next Action */}
          {(() => {
            const now = new Date();
            const blockedCount = (tasks?.filter(t => t.status === 'blocked').length || 0) + 
                                (projects?.filter(p => p.status === 'blocked').length || 0);
            const overdueCount = tasks?.filter(t => {
              if (t.status === 'done' || t.status === 'archived' || !t.dueDate) return false;
              return new Date(t.dueDate) < now;
            }).length || 0;
            
            let action = '';
            let icon = '🎯';
            
            if (blockedCount > 0) {
              action = `Resolve ${blockedCount} blocker${blockedCount !== 1 ? 's' : ''} to unblock progress.`;
              icon = '🚧';
            } else if (overdueCount > 0) {
              action = `Address ${overdueCount} overdue task${overdueCount !== 1 ? 's' : ''}.`;
              icon = '⏰';
            } else if (metrics.upcomingTasks.length > 0) {
              action = `${metrics.upcomingTasks.length} task${metrics.upcomingTasks.length !== 1 ? 's' : ''} due in the next 7 days.`;
              icon = '📅';
            } else if (metrics.activeTasks > 0) {
              action = 'Keep up the momentum! All tasks are on track.';
              icon = '🚀';
            } else {
              action = 'All caught up! Ready for new challenges.';
              icon = '✅';
            }
            
            return (
              <div className="p-4 rounded-lg bg-gradient-to-br from-purple-500/10 to-violet-500/10 border border-purple-500/20">
                <div className="text-3xl mb-2">{icon}</div>
                <div className="text-sm text-gray-300 font-medium mb-1">Next Focus</div>
                <div className="text-xs text-gray-400">{action}</div>
              </div>
            );
          })()}
        </div>
      </ChartPanel>
    </div>

    {/* Quick Add Task Modal */}
    {showQuickAddTask && (
      <Modal
        open={showQuickAddTask}
        onClose={() => setShowQuickAddTask(false)}
        title="Quick Add Task"
      >
        <TaskCreateForm
          uid={uid}
          allProjects={projects}
          onCreated={() => {
            setShowQuickAddTask(false);
            // Optionally show a success toast or refresh
          }}
        />
      </Modal>
    )}
  </>
  );
};

// Wrap in memo to prevent unnecessary remounts and export as named export
export const DashboardView = memo(DashboardViewComponent);
