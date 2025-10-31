// Utility for generating smart assignee suggestions based on skills, workload, and context
import type { WithId, Task, TeamMember, Project } from '../types';

// Skill keywords mapped to team member skill fields
const SKILL_KEYWORDS = {
  audio: ['audio', 'sound', 'mic', 'speaker', 'mixing', 'console', 'microphone'],
  video: ['video', 'camera', 'recording', 'streaming', 'broadcast', 'projection', 'led', 'screen'],
  lighting: ['lighting', 'light', 'dimmer', 'fixture', 'spot', 'wash', 'color', 'moving head'],
  rigging: ['rigging', 'truss', 'hang', 'fly', 'hoist', 'chain motor', 'grid'],
  stageDesign: ['stage', 'set', 'design', 'layout', 'floor plan', 'staging'],
  electric: ['electric', 'power', 'distribution', 'generator', 'cable', 'distro'],
  graphicDesign: ['graphic', 'design', 'branding', 'logo', 'visual', 'art'],
  truckDriving: ['truck', 'driving', 'transport', 'delivery', 'load', 'unload'],
};

interface SuggestionReason {
  type: 'skills' | 'workload' | 'project_member' | 'availability';
  text: string;
  weight: number; // 0-100
}

export interface AssigneeSuggestion {
  memberId: string;
  memberName: string;
  confidence: number; // 0-100
  reasons: SuggestionReason[];
  primaryReason: string; // Human-readable summary
}

interface SuggestionContext {
  taskTitle?: string;
  taskDescription?: string;
  projectId?: string | null;
  allTasks: WithId<Task>[];
  allTeamMembers: WithId<TeamMember>[];
  allProjects?: WithId<Project>[];
}

/**
 * Generate smart assignee suggestions based on task context and team data
 */
export function generateAssigneeSuggestions(
  context: SuggestionContext
): AssigneeSuggestion[] {
  const { taskTitle = '', taskDescription = '', projectId, allTasks, allTeamMembers, allProjects } = context;
  
  // Only consider active team members
  const activeMembers = allTeamMembers.filter(m => m.active);
  
  if (activeMembers.length === 0) {
    return [];
  }
  
  const suggestions: AssigneeSuggestion[] = [];
  const searchText = `${taskTitle} ${taskDescription}`.toLowerCase();
  
  // Get project team members if applicable
  const projectTeamIds = new Set<string>();
  if (projectId && allProjects) {
    const project = allProjects.find(p => p.id === projectId);
    if (project?.assignees) {
      project.assignees.forEach(id => projectTeamIds.add(id));
    }
    if (project?.owner) projectTeamIds.add(project.owner);
    if (project?.projectManager) projectTeamIds.add(project.projectManager);
  }
  
  // Analyze each team member
  activeMembers.forEach(member => {
    const reasons: SuggestionReason[] = [];
    let totalWeight = 0;
    
    // 1. Skills matching (0-40 points)
    if (member.skills) {
      let skillScore = 0;
      const matchedSkills: string[] = [];
      
      Object.entries(SKILL_KEYWORDS).forEach(([skillName, keywords]) => {
        const hasKeyword = keywords.some(keyword => searchText.includes(keyword));
        if (hasKeyword) {
          const skillValue = member.skills?.[skillName as keyof typeof member.skills] || 0;
          if (skillValue > 0) {
            skillScore += skillValue * 4; // Scale 0-10 skill to 0-40
            matchedSkills.push(skillName);
          }
        }
      });
      
      if (skillScore > 0) {
        const maxPossibleScore = 40;
        const normalizedScore = Math.min(skillScore, maxPossibleScore);
        reasons.push({
          type: 'skills',
          text: `Skills match (${matchedSkills.map(s => s.replace(/([A-Z])/g, ' $1').trim()).join(', ')})`,
          weight: normalizedScore,
        });
        totalWeight += normalizedScore;
      }
    }
    
    // 2. Workload analysis (0-30 points)
    const activeTasks = allTasks.filter(t => 
      t.assignee === member.id && 
      t.status !== 'done' && 
      t.status !== 'archived'
    );
    const taskCount = activeTasks.length;
    
    // Score: 0 tasks = 30pts, 1-2 = 25pts, 3-4 = 20pts, 5+ = 10pts, 8+ = 5pts
    let workloadScore = 0;
    let workloadText = '';
    if (taskCount === 0) {
      workloadScore = 30;
      workloadText = 'No active tasks';
    } else if (taskCount <= 2) {
      workloadScore = 25;
      workloadText = `Low workload (${taskCount} tasks)`;
    } else if (taskCount <= 4) {
      workloadScore = 20;
      workloadText = `Moderate workload (${taskCount} tasks)`;
    } else if (taskCount <= 7) {
      workloadScore = 10;
      workloadText = `High workload (${taskCount} tasks)`;
    } else {
      workloadScore = 5;
      workloadText = `Very high workload (${taskCount} tasks)`;
    }
    
    reasons.push({
      type: 'workload',
      text: workloadText,
      weight: workloadScore,
    });
    totalWeight += workloadScore;
    
    // 3. Project membership bonus (0-20 points)
    if (projectId && projectTeamIds.has(member.id)) {
      const bonus = 20;
      reasons.push({
        type: 'project_member',
        text: 'Already on this project',
        weight: bonus,
      });
      totalWeight += bonus;
    }
    
    // 4. Availability (0-10 points)
    if (member.availability !== undefined) {
      const availScore = (member.availability / 100) * 10;
      if (member.availability >= 80) {
        reasons.push({
          type: 'availability',
          text: `High availability (${member.availability}%)`,
          weight: availScore,
        });
        totalWeight += availScore;
      }
    }
    
    // Calculate confidence score (0-100)
    const confidence = Math.min(Math.round(totalWeight), 100);
    
    // Only suggest if confidence > 30
    if (confidence >= 30) {
      // Sort reasons by weight and pick primary
      reasons.sort((a, b) => b.weight - a.weight);
      const primaryReason = reasons.slice(0, 2).map(r => r.text).join(' • ');
      
      suggestions.push({
        memberId: member.id,
        memberName: member.name,
        confidence,
        reasons,
        primaryReason,
      });
    }
  });
  
  // Sort by confidence (highest first) and return top 3
  return suggestions
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3);
}
