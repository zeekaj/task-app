/* eslint-disable react/prop-types */
// Team View - Team management with skills and workload

// Cards View Component
interface CardsViewProps {
  members: WithId<TeamMember>[];
  isAdmin: boolean;
  onEdit: (member: WithId<TeamMember>) => void;
  onDelete: (id: string, name: string) => void;
  getRoleBadge: (role: TeamMemberRole | 'member') => JSX.Element | null;
}

function CardsView({ members, isAdmin, onEdit, onDelete, getRoleBadge }: CardsViewProps) {
  // Separate team members and freelancers
  const teamMembers = members.filter(m => m.role !== 'freelance');
  const freelancers = members.filter(m => m.role === 'freelance');

  const renderMemberCard = (member: WithId<TeamMember>) => (
    <Card 
      key={member.id} 
      padding="lg" 
      className="hover:border-cyan-500/50 hover:bg-white/5 transition-all duration-200 cursor-pointer relative group"
      onClick={() => onEdit(member)}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-full ${
            member.role === 'freelance' 
              ? 'bg-gradient-to-br from-purple-500 to-pink-500' 
              : 'bg-gradient-to-br from-cyan-500 to-blue-500'
          } flex items-center justify-center text-white font-bold text-lg`}>
            {member.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="text-white font-semibold">{member.name}</h3>
            {member.title && (
              <p className="text-xs text-gray-400">{member.title}</p>
            )}
          </div>
        </div>
        {getRoleBadge(member.role)}
      </div>

      <div className="flex items-start gap-4 mb-3">
        {member.phone && (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <span className="truncate">{member.phone}</span>
          </div>
        )}
        {member.email && (
          <div className="flex items-center gap-2 text-sm text-gray-400 flex-1">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span className="truncate">{member.email}</span>
          </div>
        )}
      </div>

      <div className="mb-3">
        <div className="flex justify-between items-center text-xs gap-4">
          <div className="flex flex-col flex-1">
            <div className="flex items-center gap-1 mb-1">
              <span className="text-gray-400">Availability</span>
              <span className="text-brand-success font-semibold">{member.availability || 100}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-gray-700 overflow-hidden">
              <div
                className="h-2 rounded-full"
                style={{
                  width: `${Math.max(0, Math.min(100, member.availability || 100))}%`,
                  background: 'linear-gradient(90deg, #10b981 0%, #10b981 80%, #4b5563 100%)',
                  transition: 'width 0.3s'
                }}
              />
            </div>
          </div>
          <div className="flex flex-col flex-1">
            <div className="flex items-center gap-1 mb-1">
              <span className="text-gray-400">Workload</span>
              <span className="text-yellow-400 font-semibold">{member.workload || 0}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-gray-700 overflow-hidden">
              <div
                className="h-2 rounded-full"
                style={{
                  width: `${Math.max(0, Math.min(100, member.workload || 0))}%`,
                  background: 'linear-gradient(90deg, #f59e0b 0%, #f59e0b 80%, #4b5563 100%)',
                  transition: 'width 0.3s'
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {member.approvedPositions && member.approvedPositions.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-gray-500 mb-2">Approved Positions</p>
          <div className="flex flex-wrap gap-1">
            {member.approvedPositions.map((position) => (
              <span key={position} className="px-2 py-1 bg-cyan-500/10 border border-cyan-500/30 rounded text-xs text-cyan-300 font-medium">
                {position}
              </span>
            ))}
          </div>
        </div>
      )}

      {isAdmin && (
        <div 
          className="absolute right-4 bottom-4" 
          onClick={(e) => e.stopPropagation()}
        >
          <MenuButton
            onEdit={() => onEdit(member)}
            onRemove={() => onDelete(member.id, member.name)}
            disabledEdit={!isAdmin}
            disabledRemove={!isAdmin || member.role === 'owner'}
          />
        </div>
      )}
    </Card>
  );

  return (
    <div className="space-y-8">
      {/* Team Members Section */}
      {teamMembers.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-xl font-semibold text-white">Team Members</h2>
            <Badge color="blue" size="sm">{teamMembers.length}</Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teamMembers.map(renderMemberCard)}
          </div>
        </div>
      )}

      {/* Freelancers Section */}
      {freelancers.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-xl font-semibold text-white">Freelancers</h2>
            <Badge color="purple" size="sm">{freelancers.length}</Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {freelancers.map(renderMemberCard)}
          </div>
        </div>
      )}
    </div>
  );
}
import { useState, useEffect, useRef } from 'react';
// Simple three-dot menu button for card actions
const MenuButton: React.FC<{
  onEdit: () => void;
  onRemove: () => void;
  disabledEdit?: boolean;
  disabledRemove?: boolean;
}> = ({ onEdit, onRemove, disabledEdit, disabledRemove }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-700 hover:bg-gray-600 text-gray-300 focus:outline-none"
        onClick={() => setOpen((o) => !o)}
        aria-label="Open menu"
        type="button"
      >
        <svg width="20" height="20" fill="none" viewBox="0 0 20 20">
          <circle cx="4" cy="10" r="2" fill="currentColor" />
          <circle cx="10" cy="10" r="2" fill="currentColor" />
          <circle cx="16" cy="10" r="2" fill="currentColor" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 bottom-10 min-w-[120px] bg-gray-900 border border-white/10 rounded-lg shadow-xl z-50">
          <button
            className={`w-full text-left px-4 py-2 text-sm rounded-lg hover:bg-white/5 text-gray-200 ${disabledEdit ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={() => { setOpen(false); if (!disabledEdit) onEdit(); }}
            disabled={disabledEdit}
          >
            Edit
          </button>
          <button
            className={`w-full text-left px-4 py-2 text-sm rounded-lg hover:bg-white/5 text-red-400 ${disabledRemove ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={() => { setOpen(false); if (!disabledRemove) onRemove(); }}
            disabled={disabledRemove}
          >
            Remove
          </button>
        </div>
      )}
    </div>
  );
};
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { PillTabs } from '../ui/PillTabs';
import { useTeamMembers } from '../../hooks/useTeamMembers';
import { createTeamMember, updateTeamMember, deleteTeamMember, transferOwnership } from '../../services/teamMembers';
import { logActivity } from '../../services/activityHistory';
import { getTeamMemberByUserId } from '../../services/auth';
import { useToast } from '../shared/Toast';
import type { TeamMember, TeamMemberRole, SkillAssessment, WithId } from '../../types';

type TeamViewMode = 'cards' | 'skills' | 'table' | 'capacity';

interface TeamViewProps {
  uid: string;
}

export function TeamView({ uid }: TeamViewProps) {
  const members = useTeamMembers(uid);
  const toast = useToast();
  const [viewMode, setViewMode] = useState<TeamViewMode>('cards');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<WithId<TeamMember> | null>(null);
  const [currentUserMember, setCurrentUserMember] = useState<(TeamMember & { id: string }) | null>(null);
  const [transferOpen, setTransferOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<{ id: string; name: string } | null>(null);

  // Get current user's team member record to check role
  useEffect(() => {
    (async () => {
      const member = await getTeamMemberByUserId(uid);
      setCurrentUserMember(member);
    })();
  }, [uid]);

  if (members === null) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-white">Loading team members...</div>
      </div>
    );
  }

  const activeMembers = members.filter(m => m.active);
  // Derive role from fetched record or from self entry in the list
  const selfFromList = activeMembers.find(m => m.userId === uid);
  const currentRole = currentUserMember?.role || selfFromList?.role;
  const isOwner = currentRole === 'owner';
  const isAdmin = isOwner || currentRole === 'admin';

  const handleOpenModal = (member?: WithId<TeamMember>) => {
    setEditingMember(member || null);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingMember(null);
  };

  const handleSave = async (data: Partial<TeamMember>) => {
    try {
      if (editingMember) {
        await updateTeamMember(editingMember.id, data);
        toast.success('Member updated');
      } else {
        await createTeamMember(uid, { ...data, active: true } as any);
        toast.success('Team member added');
      }
      handleCloseModal();
    } catch (err) {
      toast.error('Failed to save member');
    }
  };

  const handleDelete = async (memberId: string, memberName: string) => {
    const target = activeMembers.find(m => m.id === memberId);
    if (target?.role === 'owner') {
      toast.error('You cannot remove the Owner. Transfer ownership first.');
      return;
    }
    setMemberToDelete({ id: memberId, name: memberName });
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!memberToDelete) return;
    try {
      await deleteTeamMember(memberToDelete.id);
      toast.success('Member removed');
      setDeleteConfirmOpen(false);
      setMemberToDelete(null);
    } catch (err) {
      toast.error('Failed to remove member');
    }
  };

  // Backward-compat: support legacy role value "member" by treating it as "technician"
  const getRoleBadge = (role: TeamMemberRole | 'member') => {
    switch (role) {
      case 'owner': return <Badge color="purple" size="sm">Owner</Badge>;
      case 'admin': return <Badge color="red" size="sm">Admin</Badge>;
      case 'technician': return <Badge color="blue" size="sm">Technician</Badge>;
      case 'member': return <Badge color="blue" size="sm">Technician</Badge>;
      case 'freelance': return <Badge color="cyan" size="sm">Freelance</Badge>;
      case 'viewer': return <Badge color="gray" size="sm">Viewer</Badge>;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Team Management</h1>
          <p className="text-gray-400">Manage your team members and their skills.</p>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <button
              onClick={() => handleOpenModal()}
              className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg font-medium hover:from-cyan-600 hover:to-blue-600 transition-all duration-200 flex items-center gap-2 shadow-lg shadow-cyan-500/20"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Team Member
            </button>
          )}
        </div>
      </div>

      {/* View Mode Tabs */}
      <PillTabs
        tabs={[
          { id: 'cards', label: 'Cards', icon: '▦' },
          { id: 'skills', label: 'Skills Radar', icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Concentric rings */}
              <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.2" opacity="0.9" />
              <circle cx="12" cy="12" r="6" stroke="currentColor" strokeWidth="1.2" opacity="0.7" />
              <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="1.2" opacity="0.6" />
              {/* Sweep line */}
              <path d="M12 12 L19 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.95" />
              {/* Center dot */}
              <circle cx="12" cy="12" r="1.1" fill="currentColor" />
            </svg>
          ) },
          { id: 'table', label: 'Table', icon: '☰' },
          { id: 'capacity', label: 'Capacity', icon: '◔' },
        ]}
        activeTab={viewMode}
        onChange={(id) => setViewMode(id as TeamViewMode)}
      />

      {activeMembers.length === 0 ? (
        <Card padding="lg">
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-800 rounded-full mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <p className="text-gray-500 text-sm">No team members yet</p>
            <p className="text-gray-600 text-xs mt-1">Add team members to get started</p>
          </div>
        </Card>
      ) : (
        <>
          {viewMode === 'cards' && (
            <CardsView 
              members={activeMembers}
              isAdmin={isAdmin}
              onEdit={handleOpenModal}
              onDelete={handleDelete}
              getRoleBadge={getRoleBadge}
            />
          )}
          {viewMode === 'skills' && (
            <SkillsRadarView members={activeMembers} />
          )}
          {viewMode === 'table' && (
            <TableView 
              members={activeMembers}
              isAdmin={isAdmin}
              onEdit={handleOpenModal}
              onDelete={handleDelete}
              getRoleBadge={getRoleBadge}
            />
          )}
          {viewMode === 'capacity' && (
            <CapacityView members={activeMembers} />
          )}
        </>
      )}

      {modalOpen && (
        <TeamMemberModal
          member={editingMember}
          onClose={handleCloseModal}
          onSave={handleSave}
          canAssignOwner={isOwner}
          isOwner={isOwner}
          onTransferOwnership={editingMember?.role === 'owner' && isOwner ? () => {
            handleCloseModal();
            setTransferOpen(true);
          } : undefined}
        />
      )}
      {isOwner && transferOpen && (
        <TransferOwnershipModal
          onClose={() => setTransferOpen(false)}
          members={activeMembers.filter(m => m.userId && m.role !== 'owner')}
          totalCandidates={activeMembers.filter(m => m.role !== 'owner').length}
          onTransfer={async (memberId) => {
            try {
              await transferOwnership(uid, memberId);
              const target = activeMembers.find(m => m.id === memberId);
              if (target) {
                await logActivity(uid, 'team', uid, 'Team', 'updated', {
                  description: `Transferred ownership to ${target.name}${target.email ? ` (${target.email})` : ''}`,
                });
              }
              toast.success('Ownership transferred');
              setTransferOpen(false);
            } catch (e) {
              toast.error('Failed to transfer ownership');
            }
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmOpen && memberToDelete && (
        <div
          className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50"
          onClick={() => setDeleteConfirmOpen(false)}
        >
          <div
            className="bg-gray-800 rounded-lg border border-gray-700 shadow-2xl max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Remove Team Member?</h2>
              <p className="text-gray-300 mb-6">
                Are you sure you want to remove <span className="font-semibold text-white">{memberToDelete.name}</span> from the team? This action cannot be undone.
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
                  Remove
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Skills Radar View Component
interface SkillsRadarViewProps {
  members: WithId<TeamMember>[];
}

// --- Top-level exports for all view/modal components ---

export function SkillsRadarView({ members }: SkillsRadarViewProps) {
  const skillNames: (keyof SkillAssessment)[] = [
    'audio', 'graphicDesign', 'truckDriving', 'video', 'rigging', 'lighting', 'stageDesign', 'electric'
  ];

  const skillLabels: Record<keyof SkillAssessment, string> = {
    audio: 'Audio',
    graphicDesign: 'Graphic Design',
    truckDriving: 'Truck Driving',
    video: 'Video',
    rigging: 'Rigging',
    lighting: 'Lighting',
    stageDesign: 'Stage Design',
    electric: 'Electric',
  };

  // Calculate team average for each skill
  const teamAverages = skillNames.map(skill => {
    const values = members
      .map(m => m.skills?.[skill] || 0)
      .filter(v => v > 0);
    const avg = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    return { skill, value: avg };
  });

  // Overall averages for availability and workload
  const memberCount = members.length || 1;
  const avgAvailability = Math.round(
    members.reduce((sum, m) => sum + (m.availability ?? 100), 0) / memberCount
  );
  const avgWorkload = Math.round(
    members.reduce((sum, m) => sum + (m.workload ?? 0), 0) / memberCount
  );

  // Helper to render a role badge with legacy 'member' -> 'technician' mapping
  const renderRoleBadge = (rawRole: any) => {
    const role: TeamMemberRole = (rawRole === 'member' ? 'technician' : rawRole) as TeamMemberRole;
    const color = role === 'owner' ? 'purple'
      : role === 'admin' ? 'red'
      : role === 'technician' ? 'blue'
      : role === 'freelance' ? 'cyan'
      : 'gray';
    const label = role === 'owner' ? 'Owner'
      : role === 'admin' ? 'Admin'
      : role === 'technician' ? 'Technician'
      : role === 'freelance' ? 'Freelance'
      : 'Viewer';
    return <Badge color={color as any} size="sm">{label}</Badge>;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Team Average card */}
      <Card key="team-average" padding="lg" className="relative flex flex-col justify-between">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-lg">
              ∑
            </div>
            <div>
              <h3 className="text-white font-semibold text-lg leading-tight">Team Average</h3>
              <p className="text-xs text-gray-400 leading-tight">{members.length} member{members.length === 1 ? '' : 's'}</p>
            </div>
          </div>
        </div>
        <div className="flex gap-4 mb-4">
          <div className="flex-1 bg-gray-900 rounded-lg p-3 flex flex-col items-center border border-white/10">
            <span className="text-xs text-gray-400 mb-1 flex items-center gap-1">
              <svg className="w-4 h-4 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9c0 7-7 13-7 13S5 16 5 9a7 7 0 1114 0z" /></svg>
              AVAILABILITY
            </span>
            <span className="text-brand-success font-bold text-lg">{avgAvailability}%</span>
          </div>
          <div className="flex-1 bg-gray-900 rounded-lg p-3 flex flex-col items-center border border-white/10">
            <span className="text-xs text-gray-400 mb-1 flex items-center gap-1">
              <svg className="w-4 h-4 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m4 0h-1v-4h-1" /></svg>
              WORKLOAD
            </span>
            <span className="text-yellow-400 font-bold text-lg">{avgWorkload}%</span>
            <div className="w-full h-2 rounded-full bg-gray-700 mt-1">
              <div className="h-2 rounded-full" style={{ width: `${avgWorkload}%`, background: 'linear-gradient(90deg, #f59e0b 0%, #f59e0b 80%, #4b5563 100%)', transition: 'width 0.3s' }} />
            </div>
          </div>
        </div>
        <div className="bg-gray-900 rounded-lg border border-white/10 p-4 mb-2">
          <h4 className="text-xs text-gray-400 font-semibold mb-2 text-center">Skills Map</h4>
          <SkillRadarChart
            skills={teamAverages.map(s => ({ name: skillLabels[s.skill], value: s.value }))}
            color="cyan"
          />
        </div>
      </Card>

      {members.map(member => (
        <Card key={member.id} padding="lg" className="relative flex flex-col justify-between">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white font-bold text-lg">
                {member.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg leading-tight">{member.name}</h3>
                {member.title && (
                  <p className="text-xs text-gray-400 leading-tight">{member.title}</p>
                )}
              </div>
            </div>
            {member.role && (
              <span className="ml-2">{renderRoleBadge((member as any).role)}</span>
            )}
          </div>
          {member.email && (
            <div className="flex items-center gap-2 text-sm text-gray-300 mb-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span className="truncate">{member.email}</span>
            </div>
          )}
          {member.phone && (
            <div className="flex items-center gap-2 text-sm text-gray-300 mb-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <span className="truncate">{member.phone}</span>
            </div>
          )}
          <div className="flex gap-4 mb-4">
            <div className="flex-1 bg-gray-900 rounded-lg p-3 flex flex-col items-center border border-white/10">
              <span className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                <svg className="w-4 h-4 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9c0 7-7 13-7 13S5 16 5 9a7 7 0 1114 0z" /></svg>
                AVAILABILITY
              </span>
              <span className="text-brand-success font-bold text-lg">{member.availability || 100}%</span>
            </div>
            <div className="flex-1 bg-gray-900 rounded-lg p-3 flex flex-col items-center border border-white/10">
              <span className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                <svg className="w-4 h-4 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m4 0h-1v-4h-1" /></svg>
                WORKLOAD
              </span>
              <span className="text-yellow-400 font-bold text-lg">{member.workload || 0}%</span>
              <div className="w-full h-2 rounded-full bg-gray-700 mt-1">
                <div className="h-2 rounded-full" style={{ width: `${Math.max(0, Math.min(100, member.workload || 0))}%`, background: 'linear-gradient(90deg, #f59e0b 0%, #f59e0b 80%, #4b5563 100%)', transition: 'width 0.3s' }} />
              </div>
            </div>
          </div>
          <div className="bg-gray-900 rounded-lg border border-white/10 p-4 mb-2">
            <h4 className="text-xs text-gray-400 font-semibold mb-2 text-center">Skills Map</h4>
            <SkillRadarChart
              skills={skillNames.map(skill => ({
                name: skillLabels[skill],
                value: member.skills?.[skill] || 0
              }))}
              color="blue"
            />
          </div>
        </Card>
      ))}
    </div>
  );
}

// Radar Chart Component
interface SkillRadarChartProps {
  skills: { name: string; value: number }[];
  color?: 'cyan' | 'blue' | 'purple';
}

function SkillRadarChart({ skills, color = 'cyan' }: SkillRadarChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
        const [tip, setTip] = useState<{ visible: boolean; text: string; x: number; y: number }>({
    visible: false,
    text: '',
    x: 0,
    y: 0,
  });
  // Increase canvas size and add internal padding so labels don't get clipped
  const size = 320;
  const center = size / 2;
  const padding = 52; // extra margin so outer label icons don’t clip
  const radius = center - padding; // main chart radius
  const levels = 5;

  const angleStep = (2 * Math.PI) / skills.length;

  const getPoint = (value: number, index: number) => {
    const angle = angleStep * index - Math.PI / 2;
        const distance = (value / 10) * radius; 
    return {
      x: center + distance * Math.cos(angle),
      y: center + distance * Math.sin(angle)
    };
  };

  const colorMap = {
    cyan: { fill: 'rgba(6, 182, 212, 0.2)', stroke: 'rgb(6, 182, 212)' },
        blue: { fill: 'rgba(59, 130, 246, 0.2)', stroke: 'rgb(59, 130, 246)' }, 
        purple: { fill: 'rgba(168, 85, 247, 0.2)', stroke: 'rgb(168, 85, 247)' },
  };

  const colors = colorMap[color];

  const dataPoints = skills.map((skill, i) => getPoint(skill.value, i));
  const pathData = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';

  // Show tooltip anchored at a fixed icon position (SVG coordinates)
  const showTipAt = (x: number, y: number, text: string) => {
    setTip({ visible: true, text, x, y });
  };
  const hideTip = () => setTip((t) => ({ ...t, visible: false }));

  return (
    <div className="flex flex-col items-center">
      <div ref={containerRef} className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="absolute inset-0">
        {/* Background circles */}
        {Array.from({ length: levels }).map((_, i) => {
          const levelRadius = ((i + 1) / levels) * radius;
          return (
            <circle
              key={i}
              cx={center}
              cy={center}
              r={levelRadius}
              fill="none"
              stroke="rgba(255, 255, 255, 0.1)"
              strokeWidth="1"
            />
          );
        })}

        {/* Axis lines */}
        {skills.map((_, i) => {
          const angle = angleStep * i - Math.PI / 2;
          const x = center + radius * Math.cos(angle);
          const y = center + radius * Math.sin(angle);
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={x}
              y2={y}
              stroke="rgba(255, 255, 255, 0.1)"
              strokeWidth="1"
            />
          );
        })}

        {/* Data polygon */}
        <path
          d={pathData}
          fill={colors.fill}
          stroke={colors.stroke}
          strokeWidth="2"
        />

        {/* Data points */}
        {dataPoints.map((point, i) => (
          <circle
            key={i}
            cx={point.x}
            cy={point.y}
            r="4"
            fill={colors.stroke}
          />
        ))}

        {/* Labels */}
        {skills.map((skill, i) => {
          const angle = angleStep * i - Math.PI / 2;
          const cos = Math.cos(angle);
          const sin = Math.sin(angle);
          const labelDistance = radius + 18; // slightly outside the chart, with padding to avoid clipping
          const x = center + labelDistance * cos;
          const y = center + labelDistance * sin;
          const tickEnd = radius + 10; // leader line length
          const xTick = center + tickEnd * cos;
          const yTick = center + tickEnd * sin;
          const rIcon = 12; // icon badge radius
          return (
            <g key={i}>
              {/* Leader line from chart edge to label for clarity */}
              <line
                x1={center + radius * cos}
                y1={center + radius * sin}
                x2={xTick}
                y2={yTick}
                stroke="rgba(255, 255, 255, 0.25)"
                strokeWidth="1"
              />
              {/* Icon badge with tooltip */}
              <g
                transform={`translate(${x}, ${y})`}
                onMouseEnter={() => showTipAt(x, y, skill.name)}
                onMouseLeave={hideTip}
                style={{ cursor: 'default' }}
              >
                <circle r={rIcon} fill="rgba(17, 24, 39, 0.9)" stroke="rgba(255,255,255,0.2)" />
                {(() => {
                  const n = skill.name.toLowerCase();
                  const stroke = 'rgba(59, 130, 246, 0.9)';
                  const common: { strokeWidth: number; fill: string } = { strokeWidth: 1.0, fill: 'none' };
                  if (n.includes('rigging')) {
                    // Shackle icon: bold closed bow, vertical legs, solid pin, knob on right (matches reference)
                    return (
                      <g>
                        {/* Bow: thick closed shape */}
                        <ellipse cx="0" cy="0.5" rx="7" ry="7" fill={stroke} />
                        <ellipse cx="0" cy="0.5" rx="4.5" ry="4.5" fill="rgba(17,24,39,0.9)" />
                        {/* Legs: vertical rectangles */}
                        <rect x="-5.5" y="7" width="2.5" height="6" rx="1.1" fill={stroke} />
                        <rect x="3" y="7" width="2.5" height="6" rx="1.1" fill={stroke} />
                        {/* Pin: solid horizontal bar */}
                        <rect x="-5.5" y="11" width="11" height="2.2" rx="1.1" fill={stroke} />
                        {/* Knob on right end */}
                        <rect x="5.5" y="10.5" width="3.2" height="3.2" rx="1.2" fill={stroke} />
                        <circle cx="7.1" cy="12.1" r="0.7" fill="white" />
                      </g>
                    );
                  }
                  if (n.includes('video')) {
                    // Film camera: side profile with boxy body, two reels, and protruding lens barrel
                    return (
                      <g>
                        {/* Camera body */}
                        <rect x="-6" y="-2" width="8" height="6" rx="1.2" stroke={stroke} {...common} />
                        {/* Lens barrel (side profile, protruding) */}
                        <rect x="2.2" y="-0.8" width="3.2" height="2.6" rx="1.0" fill={stroke} stroke="none" />
                        {/* Film reels */}
                        <circle cx="-3.5" cy="-3.2" r="2" stroke={stroke} strokeWidth="1" fill="rgba(17,24,39,0.9)" />
                        <circle cx="1.5" cy="-3.2" r="2" stroke={stroke} strokeWidth="1" fill="rgba(17,24,39,0.9)" />
                        {/* Reel holes */}
                        <circle cx="-3.5" cy="-3.2" r="0.5" fill={stroke} />
                        <circle cx="1.5" cy="-3.2" r="0.5" fill={stroke} />
                      </g>
                    );
                  }
                  if (n.includes('rigging')) {
                    // Shackle icon: clear bell-shaped bow (rounded top + vertical sides) with lugs and pin
                    const bg = 'rgba(17,24,39,0.9)';
                    return (
                      <g>
                        {/* Bow outer as a vertical capsule (stadium) trimmed at the pin line */}
                        <rect x="-6.0" y="-6.8" width="12.0" height="11.0" rx="6.0" fill={stroke} />
                        {/* Inner cutout to define bow thickness */}
                        <rect x="-4.2" y="-5.4" width="8.4" height="9.6" rx="4.2" fill={bg} />
                        {/* Trim bottom to create a flat at pin height, enhancing the bell look */}
                        <rect x="-9" y="3.6" width="18" height="6" fill={bg} />

                        {/* Cheeks/Lugs (slightly proud of bow) */}
                        <rect x="-7.8" y="3.2" width="3.0" height="5.2" rx="0.7" fill={stroke} />
                        <rect x="4.8" y="3.2" width="3.0" height="5.2" rx="0.7" fill={stroke} />
                        {/* Lug holes */}
                        <circle cx="-6.4" cy="4.8" r="0.9" fill={bg} />
                        <circle cx="6.4" cy="4.8" r="0.9" fill={bg} />
                        {/* Pin bar */}
                        <rect x="-6.6" y="4.2" width="13.2" height="2.4" rx="1.1" fill={stroke} />
                        {/* Pin end caps */}
                        <circle cx="-8.4" cy="5.4" r="1.2" fill={stroke} />
                        <circle cx="8.4" cy="5.4" r="1.2" fill={stroke} />
                        {/* Slot on right cap to suggest screw head */}
                        <line x1="7.7" y1="5.4" x2="9.1" y2="5.4" stroke={bg} strokeWidth="0.6" strokeLinecap="round" />
                      </g>
                    );
                  }
                  if (n.includes('lighting')) {
                    // Light bulb icon: bulb outline, filament, and small base
                    return (
                      <g>
                        {/* Bulb glass */}
                        <circle cx="0" cy="-2" r="5" stroke={stroke} {...common} />
                        {/* Neck */}
                        <path d="M -2 1 Q 0 2 2 1" stroke={stroke} {...common} />
                        {/* Base */}
                        <rect x="-2.2" y="1.2" width="4.2" height="6" rx="0.8" stroke={stroke} strokeWidth="1" />
                        {/* Screw lines */}
                        <line x1="-1.8" y1="2.1" x2="1.8" y2="2.1" stroke={stroke} strokeWidth="1" />
                        <line x1="-1.6" y1="5.5" x2="1.6" y2="5.5" stroke={stroke} strokeWidth="0.2" />
                        {/* Filament */}
                        <path d="M -2 -2 L -1 -1 L 0 -2 L 1 -1 L 2 -2" stroke={stroke} strokeWidth="1" fill="none" />
                      </g>
                    );
                  }
                  if (n.includes('stage')) {
                    // Stage curtains: proscenium frame + drapes that meet at the top center with added folds
                    const foldStroke = 'rgba(59, 130, 246, 0.6)';
                    return (
                      <g>
                        {/* Proscenium frame: top and bottom bars */}
                        <rect x="-9" y="-10" width="18" height="1" fill={stroke} />
                        <rect x="-9" y="8" width="18" height="1" fill={stroke} />
                        {/* Side posts */}
                        <rect x="-10" y="-8" width="1" height="16" fill={stroke} />
                        <rect x="9" y="-8" width="1" height="16" fill={stroke} />
                        {/* Inner edges of drapes meet at top center */}
                        <path d="M 0 -8 C -2 -6 -3 -2 -6 0 C -4 3 -5.2 6 -6.3 8" stroke={stroke} strokeWidth={1} fill="none" />
                        <path d="M 0 -8 C 2 -6 3 -2 6 0 C 4 3 5.2 6 6.3 8" stroke={stroke} strokeWidth={1} fill="none" />
                        {/* Tiebacks at mid-height */}
                        <path d="M -6.4 0 L -5.2 0" stroke={stroke} strokeWidth={1} />
                        <path d="M 6.4 0 L 5.2 0" stroke={stroke} strokeWidth={1} />
                        {/* Folds inside left drape (upper and lower) */}
                        <path d="M -1.2 -7 C -2.4 -6 -2.6 -4.5 -4 -3.2" stroke={foldStroke} strokeWidth={0.8} fill="none" />
                        <path d="M -5.6 -6 C -3.8 -4 -3.8 -2 -5.8 -0.6" stroke={foldStroke} strokeWidth={0.8} fill="none" />
                        <path d="M -5.2 1 C -3.8 2.8 -4.2 5.2 -5.8 7" stroke={foldStroke} strokeWidth={0.8} fill="none" />
                        {/* Folds inside right drape (mirror) */}
                        <path d="M 1.2 -7 C 2.4 -6 2.6 -4.5 4 -3.2" stroke={foldStroke} strokeWidth={0.8} fill="none" />
                        <path d="M 5.6 -6 C 3.8 -4 3.8 -2 5.8 -0.6" stroke={foldStroke} strokeWidth={0.8} fill="none" />
                        <path d="M 5.2 1 C 3.8 2.8 4.2 5.2 5.8 7" stroke={foldStroke} strokeWidth={0.8} fill="none" />
                      </g>
                    );
                  }
                  if (n.includes('electric')) {
                    // Solid lightning bolt (slightly larger)
                    return <polygon points="-2,-8 4,-2 1,-2 6,6 -3,1 0,1" fill={stroke} stroke="none" />;
                  }
                  return (
                    <text x={0} y={0} textAnchor="middle" dominantBaseline="central" fontSize="9" fill={stroke}>
                      {skill.name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()}
                    </text>
                  );
                })()}
              </g>
            </g>
          );
        })}
        </svg>
        {/* Tooltip overlay */}
        <div
          className={`pointer-events-none absolute z-10 px-2 py-1 rounded-md border text-[11px] shadow-xl backdrop-blur-sm ${
            tip.visible ? 'opacity-100' : 'opacity-0'
          } bg-gray-900/90 border-white/10 text-gray-100 transition-opacity duration-150`}
          style={{ left: tip.x, top: tip.y, transform: 'translate(-50%, -140%)' }}
          role="tooltip"
        >
          {tip.text}
        </div>
      </div>
    </div>
  );
}

// Table View Component
interface TableViewProps {
  members: WithId<TeamMember>[];
  isAdmin: boolean;
  onEdit: (member: WithId<TeamMember>) => void;
  onDelete: (id: string, name: string) => void;
  getRoleBadge: (role: TeamMemberRole | 'member') => JSX.Element | null;
}

export function TableView({ members, isAdmin, onEdit, onDelete, getRoleBadge }: TableViewProps) {
  // Separate team members and freelancers
  const teamMembers = members.filter(m => m.role !== 'freelance');
  const freelancers = members.filter(m => m.role === 'freelance');

  const renderTable = (memberList: WithId<TeamMember>[], title?: string, badgeColor?: 'blue' | 'purple') => (
    <div>
      {title && (
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-xl font-semibold text-white">{title}</h2>
          <Badge color={badgeColor || 'blue'} size="sm">{memberList.length}</Badge>
        </div>
      )}
      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Member</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Role</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Approved Positions</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Email</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Phone</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">Availability</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">Workload</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {memberList.map(member => (
                <tr key={member.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full ${
                        member.role === 'freelance' 
                          ? 'bg-gradient-to-br from-purple-500 to-pink-500' 
                          : 'bg-gradient-to-br from-cyan-500 to-blue-500'
                      } flex items-center justify-center text-white font-bold text-sm`}>
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-white font-medium">{member.name}</div>
                        {member.title && <div className="text-xs text-gray-400">{member.title}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {getRoleBadge(member.role)}
                  </td>
                  <td className="px-6 py-4">
                    {member.approvedPositions && member.approvedPositions.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {member.approvedPositions.map((position) => (
                          <span key={position} className="px-2 py-0.5 bg-cyan-500/10 border border-cyan-500/30 rounded text-xs text-cyan-300 font-medium">
                            {position}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-300">{member.email || '—'}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-300">{member.phone || '—'}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-sm font-semibold text-brand-success">{member.availability || 100}%</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-sm font-semibold text-yellow-400">{member.workload || 0}%</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => onEdit(member)}
                        className="px-3 py-1 text-xs bg-white/5 border border-white/10 rounded hover:bg-white/10 text-white transition-colors"
                        disabled={!isAdmin}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onDelete(member.id, member.name)}
                        className="px-3 py-1 text-xs bg-red-500/10 border border-red-500/30 rounded hover:bg-red-500/20 text-red-400 transition-colors disabled:opacity-50"
                        disabled={!isAdmin || member.role === 'owner'}
                      >
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );

  return (
    <div className="space-y-8">
      {teamMembers.length > 0 && renderTable(teamMembers, 'Team Members', 'blue')}
      {freelancers.length > 0 && renderTable(freelancers, 'Freelancers', 'purple')}
    </div>
  );
}

// Capacity View Component
interface CapacityViewProps {
  members: WithId<TeamMember>[];
}

export function CapacityView({ members }: CapacityViewProps) {
  // Separate team members and freelancers
  const teamMembers = members.filter(m => m.role !== 'freelance');
  const freelancers = members.filter(m => m.role === 'freelance');
  
  // Calculate team metrics
  const totalMembers = members.length;
  const avgAvailability = members.reduce((sum, m) => sum + (m.availability || 100), 0) / totalMembers;
  const avgWorkload = members.reduce((sum, m) => sum + (m.workload || 0), 0) / totalMembers;
  const underutilized = members.filter(m => (m.workload || 0) < 50).length;
  const atCapacity = members.filter(m => (m.workload || 0) >= 80).length;

  const renderCapacitySection = (memberList: WithId<TeamMember>[], title?: string, badgeColor?: 'blue' | 'purple') => (
    <div>
      {title && (
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-xl font-semibold text-white">{title}</h2>
          <Badge color={badgeColor || 'blue'} size="sm">{memberList.length}</Badge>
        </div>
      )}
      <Card padding="lg">
        <div className="space-y-3">
          {memberList.map((member) => {
            const workload = member.workload || 0;
            const availability = member.availability || 100;
            const wasted = Math.max(0, availability - workload);

            return (
              <div key={member.id} className="space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full ${
                      member.role === 'freelance' 
                        ? 'bg-gradient-to-br from-purple-500 to-pink-500' 
                        : 'bg-gradient-to-br from-cyan-500 to-blue-500'
                    } flex items-center justify-center text-white font-bold text-xs`}>
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-white font-medium text-sm">{member.name}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-gray-400">
                      Workload: <span className="text-yellow-400 font-semibold">{workload}%</span>
                    </span>
                    <span className="text-gray-400">
                      Available: <span className="text-brand-success font-semibold">{availability}%</span>
                    </span>
                  </div>
                </div>
                <div className="relative h-8 bg-gray-800 rounded-lg overflow-hidden">
                  {/* Workload bar */}
                  <div 
                    className="absolute h-full bg-gradient-to-r from-yellow-500 to-yellow-600 transition-all duration-300"
                    style={{ width: `${workload}%` }}
                  />
                  {/* Availability indicator */}
                  <div 
                    className="absolute h-full border-r-2 border-green-400"
                    style={{ left: `${availability}%` }}
                  />
                  {/* Percentage labels */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-white text-xs font-semibold mix-blend-difference">
                      {workload >= availability ? 'At Capacity' : `${wasted.toFixed(0)}% Available`}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card padding="lg">
          <div className="text-center">
            <div className="text-3xl font-bold text-brand-cyan mb-1">{totalMembers}</div>
            <div className="text-sm text-gray-400">Team Members</div>
          </div>
        </Card>
        <Card padding="lg">
          <div className="text-center">
            <div className="text-3xl font-bold text-brand-success mb-1">{avgAvailability.toFixed(0)}%</div>
            <div className="text-sm text-gray-400">Avg Availability</div>
          </div>
        </Card>
        <Card padding="lg">
          <div className="text-center">
            <div className="text-3xl font-bold text-brand-warning mb-1">{avgWorkload.toFixed(0)}%</div>
            <div className="text-sm text-gray-400">Avg Workload</div>
          </div>
        </Card>
        <Card padding="lg">
          <div className="text-center">
            <div className="text-3xl font-bold text-brand-violet mb-1">{underutilized}</div>
            <div className="text-sm text-gray-400">Underutilized</div>
          </div>
        </Card>
      </div>

      {/* Member Capacity Bars - Team Members */}
      {teamMembers.length > 0 && renderCapacitySection(teamMembers, 'Team Members', 'blue')}

      {/* Member Capacity Bars - Freelancers */}
      {freelancers.length > 0 && renderCapacitySection(freelancers, 'Freelancers', 'purple')}

      {/* Alerts */}
      {atCapacity > 0 && (
        <Card padding="lg" className="border-yellow-500/30">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <h4 className="text-yellow-400 font-semibold mb-1">High Workload Alert</h4>
              <p className="text-gray-300 text-sm">{atCapacity} team member{atCapacity > 1 ? 's are' : ' is'} at or near capacity (80%+ workload)</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

interface TeamMemberModalProps {
  member: WithId<TeamMember> | null;
  onClose: () => void;
  onSave: (member: Partial<TeamMember>) => void;
  canAssignOwner?: boolean;
  onTransferOwnership?: () => void;
  isOwner?: boolean;
}

export function TeamMemberModal({ member, onClose, onSave, canAssignOwner = false, onTransferOwnership, isOwner = false }: TeamMemberModalProps) {
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<Partial<TeamMember>>({
    name: member?.name || '',
    email: member?.email || '',
    phone: member?.phone || '',
  role: (((member as any)?.role === 'member') ? 'technician' : (member?.role || 'technician')) as TeamMemberRole,
    title: member?.title || '',
    jobTitle: member?.jobTitle,
    approvedPositions: member?.approvedPositions || [],
    skills: member?.skills || {
      audio: 5,
      graphicDesign: 5,
      truckDriving: 5,
      video: 5,
      rigging: 5,
      lighting: 5,
      stageDesign: 5,
      electric: 5,
    },
    availability: member?.availability || 100,
    workload: member?.workload || 0,
    viewerPermissions: member?.viewerPermissions || [],
  });

  useEffect(() => {
    nameInputRef.current?.focus();
  }, []);

  const formatPhoneNumber = (value: string): string => {
    const digits = value.replace(/\D/g, '');
    if (digits.length === 0) return '';
    if (digits.length <= 3) return `(${digits}`;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    if (digits.length <= 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string): boolean => {
    if (!phone.trim()) return true;
    const digitsOnly = phone.replace(/\D/g, '');
    return digitsOnly.length === 10;
  };

  const handlePhoneChange = (value: string) => {
    const formatted = formatPhoneNumber(value);
    setFormData({ ...formData, phone: formatted });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      alert('Name is required');
      return;
    }
    if (!formData.email?.trim()) {
      alert('Email is required');
      return;
    }
    if (!validateEmail(formData.email)) {
      alert('Please enter a valid email address');
      return;
    }
    if (formData.phone && !validatePhone(formData.phone)) {
      alert('Please enter a valid 10-digit phone number');
      return;
    }
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={onClose}>
      <div 
        className="bg-gray-800 rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">
            {member ? 'Edit Team Member' : 'Add Team Member'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">
            ×
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">Full Name</label>
                <input
                  ref={nameInputRef}
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">Phone</label>
                <input
                  type="tel"
                  value={formData.phone || ''}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  placeholder="(555) 123-4567"
                  maxLength={14}
                  className="w-full px-4 py-3 bg-gray-700 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none text-white"
                />
              </div>
            </div>

            <div className={`grid ${formData.role === 'freelance' ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
              {formData.role !== 'freelance' && (
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">Job Title</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-700 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none text-white"
                    placeholder="e.g., Audio Engineer, Stage Manager"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as TeamMemberRole })}
                  className="w-full px-4 py-3 bg-gray-700 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none text-white"
                >
                  <option value="">Select role</option>
                  {canAssignOwner && <option value="owner">Owner</option>}
                  <option value="admin">Admin</option>
                  <option value="technician">Technician</option>
                  <option value="freelance">Freelance</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
            </div>

            {(formData.role === 'viewer') && (
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">Viewer Permissions</label>
                <p className="text-sm text-gray-400 mb-3">Select what this viewer can access:</p>
                <div className="space-y-2">
                  {['projects', 'tasks', 'team', 'calendar', 'blockers'].map((perm) => (
                    <label key={perm} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.viewerPermissions?.includes(perm)}
                        onChange={(e) => {
                          const perms = formData.viewerPermissions || [];
                          setFormData({
                            ...formData,
                            viewerPermissions: e.target.checked
                              ? [...perms, perm]
                              : perms.filter((p) => p !== perm),
                          });
                        }}
                        className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm capitalize text-gray-300">{perm}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">Approved Positions</label>
              <p className="text-xs text-gray-400 mb-3">Select all positions this person is qualified to work:</p>
              <div className="grid grid-cols-2 gap-2">
                {(['A1', 'A2', 'V1', 'V2', 'LD', 'ME', 'TD', 'Stagehand', 'Show Producer', 'vMix Op'] as const).map((position) => (
                  <label key={position} className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={formData.approvedPositions?.includes(position) || false}
                      onChange={(e) => {
                        const positions = formData.approvedPositions || [];
                        setFormData({
                          ...formData,
                          approvedPositions: e.target.checked
                            ? [...positions, position]
                            : positions.filter((p) => p !== position),
                        });
                      }}
                      className="w-4 h-4 text-cyan-500 bg-gray-700 border-gray-600 rounded focus:ring-cyan-500"
                    />
                    <span className="text-sm text-gray-300 group-hover:text-cyan-300 transition-colors">{position}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4 text-white">Skills Assessment</h3>
              <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                {[
                  { name: 'audio' as keyof SkillAssessment, label: 'Audio' },
                  { name: 'graphicDesign' as keyof SkillAssessment, label: 'Graphic Design' },
                  { name: 'truckDriving' as keyof SkillAssessment, label: 'Truck Driving' },
                  { name: 'video' as keyof SkillAssessment, label: 'Video' },
                  { name: 'rigging' as keyof SkillAssessment, label: 'Rigging' },
                  { name: 'lighting' as keyof SkillAssessment, label: 'Lighting' },
                  { name: 'stageDesign' as keyof SkillAssessment, label: 'Stage Design' },
                  { name: 'electric' as keyof SkillAssessment, label: 'Electric' },
                ]
                  .filter(({ name }) => !(formData.role === 'freelance' && name === 'truckDriving'))
                  .map(({ name, label }) => {
                  const value = formData.skills?.[name] ?? 5;
                  return (
                    <div key={name} className="flex flex-col">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-gray-300">{label}</span>
                        <span className="text-sm font-semibold text-brand-violet">{value}/10</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="10"
                        step="1"
                        value={value}
                        onInput={(e) => {
                          const newValue = parseInt((e.target as HTMLInputElement).value);
                          setFormData(prev => ({
                            ...prev,
                            skills: {
                              ...prev.skills,
                              [name]: newValue,
                            },
                          }));
                        }}
                        className="w-full rounded-lg"
                        style={{
                          background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${value * 10}%, #4b5563 ${value * 10}%, #4b5563 100%)`
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {formData.role !== 'freelance' && (
              <div className="grid grid-cols-2 gap-x-8">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-300">Availability</span>
                    <span className="text-sm font-semibold text-brand-success">{formData.availability}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={formData.availability}
                    onInput={(e) => setFormData(prev => ({ ...prev, availability: parseInt((e.target as HTMLInputElement).value) }))}
                    className="w-full rounded-lg"
                    style={{
                      background: `linear-gradient(to right, #10b981 0%, #10b981 ${formData.availability}%, #4b5563 ${formData.availability}%, #4b5563 100%)`
                    }}
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-300">Current Workload</span>
                    <span className="text-sm font-semibold text-yellow-400">{formData.workload}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={formData.workload}
                    onInput={(e) => setFormData(prev => ({ ...prev, workload: parseInt((e.target as HTMLInputElement).value) }))}
                    className="w-full rounded-lg"
                    style={{
                      background: `linear-gradient(to right, #f59e0b 0%, #f59e0b ${formData.workload}%, #4b5563 ${formData.workload}%, #4b5563 100%)`
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Transfer Ownership Section (only shown for owner) */}
          {member?.role === 'owner' && isOwner && onTransferOwnership && (
            <div className="mt-6 pt-6 border-t border-gray-700">
              <h3 className="text-lg font-semibold mb-2 text-white">Transfer Ownership</h3>
              <p className="text-sm text-gray-400 mb-3">
                Transfer ownership of this organization to another team member. You will become an admin after the transfer.
              </p>
              <button
                type="button"
                onClick={onTransferOwnership}
                className="px-4 py-2 bg-brand-violet hover:bg-brand-violet/90 text-white rounded-lg font-medium text-sm transition-colors"
              >
                Transfer Ownership...
              </button>
            </div>
          )}

          <div className="flex gap-3 mt-8">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-600 hover:bg-gray-500 rounded-lg font-medium text-white"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="flex-1 px-6 py-3 bg-brand-violet hover:bg-brand-violet/90 rounded-lg font-medium text-white"
            >
              {member ? 'Update' : 'Add'} Member
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface TransferOwnershipModalProps {
  members: WithId<TeamMember>[];
  totalCandidates?: number;
  onClose: () => void;
  onTransfer: (memberId: string) => void | Promise<void>;
}

export function TransferOwnershipModal({ members, totalCandidates, onClose, onTransfer }: TransferOwnershipModalProps) {
  const [selected, setSelected] = useState<string>(members[0]?.id || '');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={onClose}>
      <div
        className="bg-gray-800 rounded-lg p-6 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Transfer Ownership</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">×</button>
        </div>
        <p className="text-gray-300 mb-2 text-sm">Select a team member to become the new Owner. Your role will be changed to Admin.</p>
        <p className="text-gray-500 mb-4 text-xs">Only members who have logged in at least once are eligible. Showing {members.length}{typeof totalCandidates === 'number' ? ` of ${totalCandidates}` : ''}.</p>
        <label className="block text-sm font-medium mb-2 text-gray-300">New Owner</label>
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="w-full px-4 py-3 bg-gray-700 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none text-white mb-6"
        >
          {members.map(m => (
            <option key={m.id} value={m.id}>{m.name} {m.email ? `(${m.email})` : ''}</option>
          ))}
        </select>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 px-6 py-3 bg-gray-600 hover:bg-gray-500 rounded-lg font-medium text-white">Cancel</button>
          <button
            onClick={() => selected && onTransfer(selected)}
            className="flex-1 px-6 py-3 bg-brand-violet hover:bg-brand-violet/90 rounded-lg font-medium text-white"
            disabled={!selected}
          >
            Transfer
          </button>
        </div>
      </div>
    </div>
  );
}