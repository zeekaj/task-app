// Team View - Team management with skills and workload
import { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { useTeamMembers } from '../../hooks/useTeamMembers';
import { createTeamMember, updateTeamMember, deleteTeamMember, transferOwnership } from '../../services/teamMembers';
import { logActivity } from '../../services/activityHistory';
import { getTeamMemberByUserId } from '../../services/auth';
import { useToast } from '../shared/Toast';
import type { TeamMember, TeamMemberRole, SkillAssessment, WithId } from '../../types';

interface TeamViewProps {
  uid: string;
}

export function TeamView({ uid }: TeamViewProps) {
  const members = useTeamMembers(uid);
  const toast = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<WithId<TeamMember> | null>(null);
  const [currentUserMember, setCurrentUserMember] = useState<(TeamMember & { id: string }) | null>(null);
  const [transferOpen, setTransferOpen] = useState(false);

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
    if (!confirm(`Remove ${memberName} from the team?`)) return;
    try {
      await deleteTeamMember(memberId);
      toast.success('Member removed');
    } catch (err) {
      toast.error('Failed to remove member');
    }
  };

  const getRoleBadge = (role: TeamMemberRole) => {
    switch (role) {
      case 'owner': return <Badge color="purple" size="sm">Owner</Badge>;
      case 'admin': return <Badge color="red" size="sm">Admin</Badge>;
      case 'member': return <Badge color="blue" size="sm">Member</Badge>;
      case 'viewer': return <Badge color="gray" size="sm">Viewer</Badge>;
      default: return null;
    }
  };

  const getTopSkills = (skills?: SkillAssessment) => {
    if (!skills) return [];
    const skillEntries = Object.entries(skills) as [keyof SkillAssessment, number][];
    return skillEntries
      .filter(([_, value]) => value >= 7)
      .sort(([_, a], [__, b]) => b - a)
      .slice(0, 3)
      .map(([skill, value]) => ({
        name: skill.replace(/([A-Z])/g, ' $1').trim(),
        value,
      }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Team Management</h1>
          <p className="text-gray-400">Manage your team members and their skills.</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => handleOpenModal()}
            className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg font-medium hover:from-cyan-600 hover:to-blue-600 transition-all duration-200 flex items-center gap-2 shadow-lg shadow-cyan-500/20"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Member
          </button>
        )}
        {isOwner && (
          <button
            onClick={() => setTransferOpen(true)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-all duration-200 ml-3"
          >
            Transfer Ownership
          </button>
        )}
      </div>

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeMembers.map((member) => (
            <Card key={member.id} padding="lg" className="hover:border-cyan-500/30 transition-colors">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white font-bold text-lg">
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

              {member.email && (
                <div className="flex items-center gap-2 text-sm text-gray-400 mb-3">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span className="truncate">{member.email}</span>
                </div>
              )}

              <div className="mb-3 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400">Availability</span>
                  <span className="text-green-400 font-semibold">{member.availability || 100}%</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400">Workload</span>
                  <span className="text-yellow-400 font-semibold">{member.workload || 0}%</span>
                </div>
              </div>

              {getTopSkills(member.skills).length > 0 && (
                <div className="mb-4">
                  <p className="text-xs text-gray-500 mb-2">Top Skills</p>
                  <div className="flex flex-wrap gap-1">
                    {getTopSkills(member.skills).map((skill) => (
                      <span key={skill.name} className="px-2 py-1 bg-white/5 border border-white/10 rounded text-xs text-gray-300 capitalize">
                        {skill.name} ({skill.value}/10)
                      </span>
                    ))}
                  </div>
                </div>
              )}

               <div className="flex gap-2 pt-4 border-t border-white/5">
                <button
                  onClick={() => handleOpenModal(member)}
                  className="flex-1 px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 text-white transition-colors"
                  disabled={!isAdmin}
                  title={!isAdmin ? 'Only admins can edit team members' : ''}
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(member.id, member.name)}
                  className="flex-1 px-3 py-2 text-sm bg-red-500/10 border border-red-500/30 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!isAdmin || member.role === 'owner'}
                  title={!isAdmin ? 'Only admins can remove team members' : (member.role === 'owner' ? 'Cannot remove the Owner' : '')}
                >
                  Remove
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {modalOpen && (
        <TeamMemberModal
          member={editingMember}
          onClose={handleCloseModal}
          onSave={handleSave}
          canAssignOwner={isOwner}
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
    </div>
  );
}

interface TeamMemberModalProps {
  member: WithId<TeamMember> | null;
  onClose: () => void;
  onSave: (member: Partial<TeamMember>) => void;
  canAssignOwner?: boolean;
}

function TeamMemberModal({ member, onClose, onSave, canAssignOwner = false }: TeamMemberModalProps) {
  const [formData, setFormData] = useState<Partial<TeamMember>>({
    name: member?.name || '',
    email: member?.email || '',
    role: member?.role || 'member',
    title: member?.title || '',
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const updateSkill = (skill: keyof SkillAssessment, value: number) => {
    setFormData({
      ...formData,
      skills: {
        ...formData.skills,
        [skill]: value,
      },
    });
  };

  const SkillSlider = ({ name, label, value }: { name: keyof SkillAssessment; label: string; value: number }) => (
    <div className="flex flex-col">
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm text-gray-300">{label}</span>
        <span className="text-sm font-semibold text-blue-400">{value}/10</span>
      </div>
      <input
        type="range"
        min="0"
        max="10"
        value={value}
        onChange={(e) => updateSkill(name, parseInt(e.target.value))}
        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
        style={{
          background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${value * 10}%, #4b5563 ${value * 10}%, #4b5563 100%)`,
        }}
      />
    </div>
  );

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
            </div>

            <div className="grid grid-cols-2 gap-4">
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
                  <option value="member">Member</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
            </div>

            {formData.role === 'viewer' && (
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
              <h3 className="text-lg font-semibold mb-4 text-white">Skills Assessment</h3>
              <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                <SkillSlider name="audio" label="Audio" value={formData.skills?.audio || 5} />
                <SkillSlider name="graphicDesign" label="Graphic Design" value={formData.skills?.graphicDesign || 5} />
                <SkillSlider name="truckDriving" label="Truck Driving" value={formData.skills?.truckDriving || 5} />
                <SkillSlider name="video" label="Video" value={formData.skills?.video || 5} />
                <SkillSlider name="rigging" label="Rigging" value={formData.skills?.rigging || 5} />
                <SkillSlider name="lighting" label="Lighting" value={formData.skills?.lighting || 5} />
                <SkillSlider name="stageDesign" label="Stage Design" value={formData.skills?.stageDesign || 5} />
                <SkillSlider name="electric" label="Electric" value={formData.skills?.electric || 5} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-8">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-300">Availability</span>
                  <span className="text-sm font-semibold text-green-400">{formData.availability}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={formData.availability}
                  onChange={(e) => setFormData({ ...formData, availability: parseInt(e.target.value) })}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #10b981 0%, #10b981 ${formData.availability}%, #4b5563 ${formData.availability}%, #4b5563 100%)`,
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
                  value={formData.workload}
                  onChange={(e) => setFormData({ ...formData, workload: parseInt(e.target.value) })}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #f59e0b 0%, #f59e0b ${formData.workload}%, #4b5563 ${formData.workload}%, #4b5563 100%)`,
                  }}
                />
              </div>
            </div>
          </div>

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
              className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium text-white"
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

function TransferOwnershipModal({ members, totalCandidates, onClose, onTransfer }: TransferOwnershipModalProps) {
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
            className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium text-white"
            disabled={!selected}
          >
            Transfer
          </button>
        </div>
      </div>
    </div>
  );
}
