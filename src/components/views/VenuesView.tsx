// src/components/views/VenuesView.tsx
import { useState } from 'react';
import { Card } from '../ui/Card';
import { Modal } from '../shared/Modal';
import { useVenues } from '../../hooks/useVenues';
import { createVenue, updateVenue, deleteVenue } from '../../services/venues';
import { useToast } from '../shared/Toast';
import type { Venue, WithId } from '../../types';

interface VenuesViewProps {
  uid: string;
}

export function VenuesView({ uid }: VenuesViewProps) {
  const [venues, refetchVenues] = useVenues(uid);
  const toast = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingVenue, setEditingVenue] = useState<WithId<Venue> | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [venueToDelete, setVenueToDelete] = useState<{ id: string; name: string } | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [country, setCountry] = useState('USA');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [loadInNotes, setLoadInNotes] = useState('');

  const resetForm = () => {
    setName('');
    setAddress('');
    setCity('');
    setState('');
    setZip('');
    setCountry('USA');
    setContactName('');
    setContactPhone('');
    setLoadInNotes('');
  };

  const formatPhoneNumber = (value: string): string => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    
    // Don't format if empty
    if (digits.length === 0) return '';
    
    // Format as (123) 456-7890
    if (digits.length <= 3) {
      return `(${digits}`;
    } else if (digits.length <= 6) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    } else if (digits.length <= 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    } else {
      // Limit to 10 digits
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
    }
  };

  const handlePhoneChange = (value: string) => {
    const formatted = formatPhoneNumber(value);
    setContactPhone(formatted);
  };

  const validatePhone = (phone: string): boolean => {
    if (!phone.trim()) return true; // Empty is valid (optional field)
    const digitsOnly = phone.replace(/\D/g, '');
    return digitsOnly.length === 10;
  };

  const handleCreate = async () => {
    if (!name.trim() || !address.trim() || !city.trim() || !state.trim()) {
      toast.error('Name, address, city, and state are required');
      return;
    }
    if (contactPhone.trim() && !validatePhone(contactPhone)) {
      toast.error('Please enter a valid 10-digit phone number');
      return;
    }
    try {
      const venueData: any = {
        name: name.trim(),
        address: address.trim(),
        city: city.trim(),
        state: state.trim(),
        country: country.trim() || 'USA',
        active: true,
      };
      // Only include optional fields if they have values (Firestore doesn't accept undefined)
      if (zip.trim()) venueData.zip = zip.trim();
      if (contactName.trim()) venueData.contactName = contactName.trim();
      if (contactPhone.trim()) venueData.contactPhone = contactPhone.trim();
      if (loadInNotes.trim()) venueData.loadInNotes = loadInNotes.trim();
      
      await createVenue(uid, venueData);
      toast.success('Venue created');
      resetForm();
      setCreateOpen(false);
      refetchVenues(); // Refresh the list
    } catch (err) {
      console.error('Failed to create venue:', err);
      toast.error('Failed to create venue');
    }
  };

  const handleEdit = (venue: WithId<Venue>) => {
    setEditingVenue(venue);
    setName(venue.name || '');
    setAddress(venue.address || '');
    setCity(venue.city || '');
    setState(venue.state || '');
    setZip(venue.zip || '');
    setCountry(venue.country || 'USA');
    setContactName(venue.contactName || '');
    setContactPhone(venue.contactPhone || '');
    setLoadInNotes(venue.loadInNotes || '');
  };

  const handleUpdate = async () => {
    if (!editingVenue || !name.trim() || !address.trim() || !city.trim() || !state.trim()) {
      toast.error('Name, address, city, and state are required');
      return;
    }
    if (contactPhone.trim() && !validatePhone(contactPhone)) {
      toast.error('Please enter a valid 10-digit phone number');
      return;
    }
    try {
      const updates: any = {
        name: name.trim(),
        address: address.trim(),
        city: city.trim(),
        state: state.trim(),
        country: country.trim() || 'USA',
      };
      // Only include optional fields if they have values (Firestore doesn't accept undefined)
      if (zip.trim()) updates.zip = zip.trim();
      if (contactName.trim()) updates.contactName = contactName.trim();
      if (contactPhone.trim()) updates.contactPhone = contactPhone.trim();
      if (loadInNotes.trim()) updates.loadInNotes = loadInNotes.trim();
      
      await updateVenue(uid, editingVenue.id, updates);
      toast.success('Venue updated');
      resetForm();
      setEditingVenue(null);
      refetchVenues(); // Refresh the list
    } catch (err) {
      toast.error('Failed to update venue');
    }
  };

  const handleDeleteRequest = (venue: WithId<Venue>) => {
    setVenueToDelete({ id: venue.id, name: venue.name });
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!venueToDelete) return;
    try {
      await deleteVenue(uid, venueToDelete.id);
      toast.success(`Deleted ${venueToDelete.name}`);
      setDeleteConfirmOpen(false);
      setVenueToDelete(null);
      refetchVenues(); // Refresh the list
    } catch (err) {
      toast.error('Failed to delete venue');
    }
  };

  if (!venues) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-400">Loading venues...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Venues</h2>
        <button
          onClick={() => setCreateOpen(true)}
          className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg font-medium hover:from-cyan-600 hover:to-blue-600 transition-all duration-200"
        >
          + New Venue
        </button>
      </div>

      {venues.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-800 rounded-xl mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No venues yet</h3>
            <p className="text-gray-400 mb-6">Add venues to associate with your projects</p>
            <button
              onClick={() => setCreateOpen(true)}
              className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg font-medium hover:from-cyan-600 hover:to-blue-600 transition-all duration-200"
            >
              Add Venue
            </button>
          </div>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Name</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Address</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">City</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">State</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Contact</th>
                <th className="w-24"></th>
              </tr>
            </thead>
            <tbody>
              {venues.map((venue) => (
                <tr 
                  key={venue.id} 
                  onClick={() => handleEdit(venue)}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <td className="py-3 px-4">
                    <div className="font-medium text-white">{venue.name}</div>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-400">{venue.address || '—'}</td>
                  <td className="py-3 px-4 text-sm text-gray-400">{venue.city || '—'}</td>
                  <td className="py-3 px-4 text-sm text-gray-400">{venue.state || '—'}</td>
                  <td className="py-3 px-4 text-sm text-gray-400">{venue.contactName || '—'}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(venue);
                        }}
                        className="p-1.5 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 rounded transition-colors"
                        title="Edit venue"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteRequest(venue);
                        }}
                        className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
                        title="Delete venue"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Create Modal */}
      <Modal
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          resetForm();
        }}
        title="New Venue"
        widthClass="max-w-2xl"
        footer={
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={() => {
                setCreateOpen(false);
                resetForm();
              }}
              className="px-4 py-2 text-sm font-medium text-gray-300 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={!name.trim() || !address.trim() || !city.trim() || !state.trim()}
              className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
                !name.trim() || !address.trim() || !city.trim() || !state.trim()
                  ? 'bg-white/10 cursor-not-allowed'
                  : 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600'
              }`}
            >
              Create
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Venue Name *</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Venue name"
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Address *</label>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Street address"
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">City *</label>
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="City"
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">State *</label>
              <input
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="State"
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">ZIP</label>
              <input
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                placeholder="ZIP code"
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Country</label>
              <input
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="USA"
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Contact Name</label>
            <input
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="Venue contact person"
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Contact Phone</label>
            <input
              type="tel"
              value={contactPhone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              placeholder="(555) 123-4567"
              maxLength={14}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Load-In Notes</label>
            <textarea
              value={loadInNotes}
              onChange={(e) => setLoadInNotes(e.target.value)}
              placeholder="Special instructions for load-in, parking, access, etc."
              rows={3}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            />
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      {editingVenue && (
        <Modal
          open={!!editingVenue}
          onClose={() => {
            setEditingVenue(null);
            resetForm();
          }}
          title="Edit Venue"
          widthClass="max-w-2xl"
          footer={
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setEditingVenue(null);
                  resetForm();
                }}
                className="px-4 py-2 text-sm font-medium text-gray-300 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdate}
                disabled={!name.trim() || !address.trim() || !city.trim() || !state.trim()}
                className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
                  !name.trim() || !address.trim() || !city.trim() || !state.trim()
                    ? 'bg-white/10 cursor-not-allowed'
                    : 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600'
                }`}
              >
                Update
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Venue Name *</label>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Venue name"
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Address *</label>
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Street address"
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">City *</label>
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="City"
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">State *</label>
                <input
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="State"
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">ZIP</label>
                <input
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                  placeholder="ZIP code"
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Country</label>
                <input
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="USA"
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Contact Name</label>
              <input
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Venue contact person"
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Contact Phone</label>
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="(555) 123-4567"
                maxLength={14}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Load-In Notes</label>
              <textarea
                value={loadInNotes}
                onChange={(e) => setLoadInNotes(e.target.value)}
                placeholder="Special instructions for load-in, parking, access, etc."
                rows={3}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              />
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmOpen && venueToDelete && (
        <div
          className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50"
          onClick={() => setDeleteConfirmOpen(false)}
        >
          <div
            className="bg-gray-800 rounded-lg border border-gray-700 shadow-2xl max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Delete Venue?</h2>
              <p className="text-gray-300 mb-6">
                Are you sure you want to delete <span className="font-semibold text-white">{venueToDelete.name}</span>? This action cannot be undone.
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
