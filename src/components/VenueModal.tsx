// src/components/VenueModal.tsx
import { useState, useEffect, useRef } from 'react';
import { Modal } from './shared/Modal';
import type { Venue } from '../types';

interface VenueModalProps {
  uid: string;
  venue?: Venue | null;
  prefillName?: string;
  onSave: (data: Omit<Venue, 'id' | 'createdAt' | 'updatedAt' | 'active'>) => Promise<void>;
  onClose: () => void;
}

export function VenueModal({ venue, prefillName, onSave, onClose }: VenueModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    country: 'USA',
    contactName: '',
    contactPhone: '',
    loadInNotes: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const addressRef = useRef<HTMLInputElement>(null);

  // Format phone number as user types
  const formatPhoneNumber = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    
    // Format as (XXX) XXX-XXXX
    if (digits.length <= 3) {
      return digits;
    } else if (digits.length <= 6) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    } else {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setFormData({ ...formData, contactPhone: formatted });
  };

  useEffect(() => {
    if (venue) {
      setFormData({
        name: venue.name || '',
        address: venue.address || '',
        city: venue.city || '',
        state: venue.state || '',
        zip: venue.zip || '',
        country: venue.country || 'USA',
        contactName: venue.contactName || '',
        contactPhone: venue.contactPhone || '',
        loadInNotes: venue.loadInNotes || '',
      });
    } else if (prefillName) {
      setFormData({
        name: prefillName,
        address: '',
        city: '',
        state: '',
        zip: '',
        country: 'USA',
        contactName: '',
        contactPhone: '',
        loadInNotes: '',
      });
      // Focus the address field after prefilling the name
      setTimeout(() => {
        addressRef.current?.focus();
      }, 100);
    }
  }, [venue, prefillName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Venue name is required');
      return;
    }
    if (!formData.address.trim()) {
      setError('Address is required');
      return;
    }
    if (!formData.city.trim()) {
      setError('City is required');
      return;
    }
    if (!formData.state.trim()) {
      setError('State is required');
      return;
    }

    try {
      setSaving(true);
      await onSave(formData);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save venue');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={true} onClose={onClose} widthClass="max-w-3xl">
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-white mb-6">
          {venue ? 'Edit Venue' : 'Add New Venue'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Venue Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Venue Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-cyan-500"
              placeholder="Enter venue name"
              autoFocus={!prefillName}
            />
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Address <span className="text-red-400">*</span>
            </label>
            <input
              ref={addressRef}
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-cyan-500"
              placeholder="Street address"
            />
          </div>

          {/* City, State, Zip */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-1">
                City <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-cyan-500"
                placeholder="City"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                State <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-cyan-500"
                placeholder="CA"
                maxLength={2}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                ZIP Code
              </label>
              <input
                type="text"
                value={formData.zip}
                onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-cyan-500"
                placeholder="90210"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Country
              </label>
              <input
                type="text"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-cyan-500"
                placeholder="USA"
              />
            </div>
          </div>

          {/* Contact Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Contact Name
            </label>
            <input
              type="text"
              value={formData.contactName}
              onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-cyan-500"
              placeholder="On-site contact name"
            />
          </div>

          {/* Contact Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Contact Phone
            </label>
            <input
              type="tel"
              value={formData.contactPhone}
              onChange={handlePhoneChange}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-cyan-500"
              placeholder="(555) 123-4567"
              maxLength={14}
            />
          </div>

          {/* Load-In Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Load-In Notes
            </label>
            <textarea
              value={formData.loadInNotes}
              onChange={(e) => setFormData({ ...formData, loadInNotes: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-cyan-500 min-h-[80px]"
              placeholder="Loading dock location, access codes, parking instructions, etc."
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="text-red-400 text-sm">{error}</div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-white/5 text-white hover:bg-white/10 transition-colors"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-cyan-500 text-white hover:bg-cyan-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={saving}
            >
              {saving ? 'Saving...' : venue ? 'Save Changes' : 'Add Venue'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
