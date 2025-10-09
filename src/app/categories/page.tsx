'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';

// Icons
const PlusIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
  </svg>
);

const EditIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const TrashIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const ChevronDownIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

const ChevronRightIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

// Types
interface SubCategory {
  id: string;
  name: string;
  detail?: string;
  frequency?: {
    cadence: 'daily' | 'weekly' | 'monthly';
    timesPerWeek?: number;
    daysOfWeek?: string[];
    timesPerMonth?: number;
    daysOfMonth?: number[];
    time: string;
  };
  postPlan?: {
    numberOfPosts: number;
    offsets: number[];
  };
}

// interface Category {
//   id: string;
//   name: string;
//   type: 'deals' | 'offerings' | 'seasonal' | 'custom';
//   description?: string;
//   template?: 'deals-like' | 'offerings-like' | 'seasonal-like';
// }

interface Deal {
  id: string;
  name: string;
  frequency: {
    cadence: 'daily' | 'weekly' | 'monthly';
    timesPerWeek?: number;
    daysOfWeek?: string[];
    timesPerMonth?: number;
    daysOfMonth?: number[];
    time: string;
  };
  subCategories: SubCategory[];
}

interface Offering {
  id: string;
  name: string;
  frequency: {
    cadence: 'daily' | 'weekly' | 'monthly';
    timesPerWeek?: number;
    daysOfWeek?: string[];
    timesPerMonth?: number;
    daysOfMonth?: number[];
    time: string;
  };
  subCategories: SubCategory[];
}

interface SeasonalEvent {
  id: string;
  name: string;
  detail: string;
  eventDate?: string; // Single date
  eventDateRange?: {
    startDate: string;
    endDate: string;
    postDays: number[]; // Days within the range to post (e.g., [1, 3, 5])
  };
  postPlan: {
    numberOfPosts: number;
    offsets: number[];
  };
  subCategories: SubCategory[];
}

// Modal Components
const NewDealModal = ({ isOpen, onClose, onSave }: { isOpen: boolean; onClose: () => void; onSave: (deal: Omit<Deal, 'id'>) => void }) => {
  const [formData, setFormData] = useState({
    name: '',
    cadence: 'weekly' as 'daily' | 'weekly' | 'monthly',
    timesPerWeek: 1,
    daysOfWeek: [] as string[],
    daysOfMonth: [] as number[],
    time: '09:00'
  });

  const daysOfWeekOptions = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const handleDaysOfWeekChange = (day: string, checked: boolean) => {
    if (checked) {
      setFormData(prev => ({ ...prev, daysOfWeek: [...prev.daysOfWeek, day] }));
    } else {
      setFormData(prev => ({ ...prev, daysOfWeek: prev.daysOfWeek.filter(d => d !== day) }));
    }
  };


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    
    const frequency: {
      cadence: 'daily' | 'weekly' | 'monthly';
      timesPerWeek?: number;
      daysOfWeek?: string[];
      timesPerMonth?: number;
      daysOfMonth?: number[];
      time: string;
    } = {
      cadence: formData.cadence,
      time: formData.time
    };

    if (formData.cadence === 'weekly') {
      frequency.timesPerWeek = formData.timesPerWeek;
      frequency.daysOfWeek = formData.daysOfWeek;
    } else if (formData.cadence === 'monthly') {
      frequency.daysOfMonth = formData.daysOfMonth;
    }
    
    onSave({
      name: formData.name,
      frequency,
      subCategories: []
    });
    
    setFormData({ 
      name: '', 
      cadence: 'weekly', 
      timesPerWeek: 1, 
      daysOfWeek: [], 
      daysOfMonth: [], 
      time: '09:00' 
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">New Deal</h2>
          <p className="text-gray-600 text-sm mt-1">Create a new deal with posting schedule</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Deal Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent"
              placeholder="Enter deal name"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Frequency</label>
            <select
              value={formData.cadence}
              onChange={(e) => setFormData({ ...formData, cadence: e.target.value as 'daily' | 'weekly' | 'monthly' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          
          {formData.cadence === 'weekly' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Times Per Week</label>
              <select
                value={formData.timesPerWeek}
                onChange={(e) => setFormData({ ...formData, timesPerWeek: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent"
              >
                {[1, 2, 3, 4, 5, 6, 7].map(num => (
                  <option key={num} value={num}>{num} time{num > 1 ? 's' : ''} per week</option>
                ))}
              </select>
            </div>
          )}
          
          {formData.cadence === 'weekly' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Days of Week</label>
              <div className="grid grid-cols-2 gap-2">
                {daysOfWeekOptions.map(day => (
                  <label key={day} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.daysOfWeek.includes(day)}
                      disabled={!formData.daysOfWeek.includes(day) && formData.daysOfWeek.length >= formData.timesPerWeek}
                      onChange={(e) => handleDaysOfWeekChange(day, e.target.checked)}
                      className="rounded border-gray-300 text-[#6366F1] focus:ring-[#6366F1] disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <span className="text-sm text-gray-700">{day}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Select up to {formData.timesPerWeek} day{formData.timesPerWeek > 1 ? 's' : ''} (currently selected: {formData.daysOfWeek.length})
              </p>
            </div>
          )}
          
          
          {formData.cadence === 'monthly' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">On the following days</label>
              <input
                type="text"
                value={formData.daysOfMonth.map(d => d.toString()).join(', ')}
                onChange={(e) => {
                  const days = e.target.value.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n) && n >= 1 && n <= 31);
                  setFormData({ ...formData, daysOfMonth: days });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent"
                placeholder="1, 5, 10, 15"
              />
              <p className="text-xs text-gray-500 mt-1">Enter day numbers separated by commas (e.g., 1, 5, 10, 15 for 1st, 5th, 10th, 15th of month)</p>
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
            <input
              type="time"
              value={formData.time}
              onChange={(e) => setFormData({ ...formData, time: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent"
            />
          </div>
          
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-gradient-to-r from-[#6366F1] to-[#4F46E5] text-white rounded-lg hover:from-[#4F46E5] hover:to-[#4338CA] transition-all"
            >
              Create Deal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const NewOfferingModal = ({ isOpen, onClose, onSave }: { isOpen: boolean; onClose: () => void; onSave: (offering: Omit<Offering, 'id'>) => void }) => {
  const [formData, setFormData] = useState({
    name: '',
    cadence: 'weekly' as 'daily' | 'weekly' | 'monthly',
    timesPerWeek: 1,
    daysOfWeek: [] as string[],
    daysOfMonth: [] as number[],
    time: '09:00'
  });

  const daysOfWeekOptions = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const handleDaysOfWeekChange = (day: string, checked: boolean) => {
    if (checked) {
      setFormData(prev => ({ ...prev, daysOfWeek: [...prev.daysOfWeek, day] }));
    } else {
      setFormData(prev => ({ ...prev, daysOfWeek: prev.daysOfWeek.filter(d => d !== day) }));
    }
  };


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    
    const frequency: {
      cadence: 'daily' | 'weekly' | 'monthly';
      timesPerWeek?: number;
      daysOfWeek?: string[];
      timesPerMonth?: number;
      daysOfMonth?: number[];
      time: string;
    } = {
      cadence: formData.cadence,
      time: formData.time
    };

    if (formData.cadence === 'weekly') {
      frequency.timesPerWeek = formData.timesPerWeek;
      frequency.daysOfWeek = formData.daysOfWeek;
    } else if (formData.cadence === 'monthly') {
      frequency.daysOfMonth = formData.daysOfMonth;
    }
    
    onSave({
      name: formData.name,
      frequency,
      subCategories: []
    });
    
    setFormData({ 
      name: '', 
      cadence: 'weekly', 
      timesPerWeek: 1, 
      daysOfWeek: [], 
      daysOfMonth: [], 
      time: '09:00' 
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">New Offering</h2>
          <p className="text-gray-600 text-sm mt-1">Create a new offering with posting schedule</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Offering Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent"
              placeholder="Enter offering name"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Frequency</label>
            <select
              value={formData.cadence}
              onChange={(e) => setFormData({ ...formData, cadence: e.target.value as 'daily' | 'weekly' | 'monthly' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          
          {formData.cadence === 'weekly' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Times Per Week</label>
              <select
                value={formData.timesPerWeek}
                onChange={(e) => setFormData({ ...formData, timesPerWeek: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent"
              >
                {[1, 2, 3, 4, 5, 6, 7].map(num => (
                  <option key={num} value={num}>{num} time{num > 1 ? 's' : ''} per week</option>
                ))}
              </select>
            </div>
          )}
          
          {formData.cadence === 'weekly' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Days of Week</label>
              <div className="grid grid-cols-2 gap-2">
                {daysOfWeekOptions.map(day => (
                  <label key={day} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.daysOfWeek.includes(day)}
                      disabled={!formData.daysOfWeek.includes(day) && formData.daysOfWeek.length >= formData.timesPerWeek}
                      onChange={(e) => handleDaysOfWeekChange(day, e.target.checked)}
                      className="rounded border-gray-300 text-[#6366F1] focus:ring-[#6366F1] disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <span className="text-sm text-gray-700">{day}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Select up to {formData.timesPerWeek} day{formData.timesPerWeek > 1 ? 's' : ''} (currently selected: {formData.daysOfWeek.length})
              </p>
            </div>
          )}
          
          
          {formData.cadence === 'monthly' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">On the following days</label>
              <input
                type="text"
                value={formData.daysOfMonth.map(d => d.toString()).join(', ')}
                onChange={(e) => {
                  const days = e.target.value.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n) && n >= 1 && n <= 31);
                  setFormData({ ...formData, daysOfMonth: days });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent"
                placeholder="1, 5, 10, 15"
              />
              <p className="text-xs text-gray-500 mt-1">Enter day numbers separated by commas (e.g., 1, 5, 10, 15 for 1st, 5th, 10th, 15th of month)</p>
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
            <input
              type="time"
              value={formData.time}
              onChange={(e) => setFormData({ ...formData, time: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent"
            />
          </div>
          
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-gradient-to-r from-[#6366F1] to-[#4F46E5] text-white rounded-lg hover:from-[#4F46E5] hover:to-[#4338CA] transition-all"
            >
              Create Offering
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const NewSeasonalEventModal = ({ isOpen, onClose, onSave }: { isOpen: boolean; onClose: () => void; onSave: (event: Omit<SeasonalEvent, 'id'>) => void }) => {
  const [formData, setFormData] = useState({
    name: '',
    dateType: 'single' as 'single' | 'range',
    eventDate: '',
    startDate: '',
    endDate: '',
    postDays: '1, 3, 5',
    offsets: '10, 5, 2'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    
    const offsets = formData.offsets.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
    const postDays = formData.postDays.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
    
    const eventData: Omit<SeasonalEvent, 'id'> = {
      name: formData.name,
      detail: '',
      postPlan: {
        numberOfPosts: offsets.length,
        offsets
      },
      subCategories: []
    };

    if (formData.dateType === 'single') {
      eventData.eventDate = formData.eventDate;
    } else {
      eventData.eventDateRange = {
        startDate: formData.startDate,
        endDate: formData.endDate,
        postDays
      };
    }
    
    onSave(eventData);
    
    setFormData({ 
      name: '', 
      dateType: 'single',
      eventDate: '',
      startDate: '',
      endDate: '',
      postDays: '1, 3, 5',
      offsets: '10, 5, 2' 
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">New Seasonal Event</h2>
          <p className="text-gray-600 text-sm mt-1">Create a seasonal event with post scheduling</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Event Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent"
              placeholder="e.g., Black Friday"
            />
          </div>
          
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Event Date Type</label>
            <select
              value={formData.dateType}
              onChange={(e) => setFormData({ ...formData, dateType: e.target.value as 'single' | 'range' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent"
            >
              <option value="single">Single Date</option>
              <option value="range">Date Range</option>
            </select>
          </div>
          
          {formData.dateType === 'single' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Event Date</label>
              <input
                type="date"
                value={formData.eventDate}
                onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent"
              />
            </div>
          )}
          
          {formData.dateType === 'range' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Days Within Range to Post</label>
                <input
                  type="text"
                  value={formData.postDays}
                  onChange={(e) => setFormData({ ...formData, postDays: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent"
                  placeholder="1, 3, 5"
                />
                <p className="text-xs text-gray-500 mt-1">Days from start of range (e.g., 1, 3, 5 = 1st, 3rd, 5th day of range)</p>
              </div>
            </>
          )}
          
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Days Before Event</label>
            <input
              type="text"
              value={formData.offsets}
              onChange={(e) => setFormData({ ...formData, offsets: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent"
              placeholder="10, 5, 2"
            />
            <p className="text-xs text-gray-500 mt-1">Comma-separated days before the event (e.g., 10, 5, 2)</p>
          </div>
          
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-gradient-to-r from-[#6366F1] to-[#4F46E5] text-white rounded-lg hover:from-[#4F46E5] hover:to-[#4338CA] transition-all"
            >
              Create Event
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default function CategoriesPage() {
  const router = useRouter();
  
  // Modal states
  const [isNewDealModalOpen, setIsNewDealModalOpen] = useState(false);
  const [isNewOfferingModalOpen, setIsNewOfferingModalOpen] = useState(false);
  const [isNewSeasonalModalOpen, setIsNewSeasonalModalOpen] = useState(false);
  
  // Data states
  const [deals, setDeals] = useState<Deal[]>([
    {
      id: '1',
      name: 'Happy Hour Special',
      frequency: { cadence: 'weekly', timesPerWeek: 1, daysOfWeek: ['Friday'], time: '15:00' },
      subCategories: []
    }
  ]);
  const [offerings, setOfferings] = useState<Offering[]>([
    {
      id: '1',
      name: 'VR Experience Packages',
      frequency: { cadence: 'weekly', timesPerWeek: 1, daysOfWeek: ['Wednesday'], time: '14:00' },
      subCategories: []
    }
  ]);
  const [seasonalEvents, setSeasonalEvents] = useState<SeasonalEvent[]>([
    {
      id: '1',
      name: 'Summer Gaming Tournament',
      detail: 'Annual summer arcade tournament with prizes',
      postPlan: { numberOfPosts: 4, offsets: [14, 7, 3, 1] },
      subCategories: []
    }
  ]);

  // Sub-category states
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());


  const handleNewDeal = (deal: Omit<Deal, 'id'>) => {
    setDeals(prev => [...prev, { ...deal, id: Date.now().toString() }]);
  };

  const handleNewOffering = (offering: Omit<Offering, 'id'>) => {
    setOfferings(prev => [...prev, { ...offering, id: Date.now().toString() }]);
  };

  const handleNewSeasonalEvent = (event: Omit<SeasonalEvent, 'id'>) => {
    setSeasonalEvents(prev => [...prev, { ...event, id: Date.now().toString() }]);
  };

  const toggleRowExpansion = (id: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const formatFrequency = (frequency: { cadence: string; timesPerWeek?: number; daysOfWeek?: string[]; timesPerMonth?: number; daysOfMonth?: number[]; time: string }) => {
    const time = new Date(`2000-01-01T${frequency.time}`).toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
    
    if (frequency.cadence === 'weekly' && frequency.daysOfWeek && frequency.daysOfWeek.length > 0) {
      const days = frequency.daysOfWeek.join(', ');
      return `Weekly, ${days}, ${time}`;
    }
    
    if (frequency.cadence === 'monthly' && frequency.daysOfMonth && frequency.daysOfMonth.length > 0) {
      const days = frequency.daysOfMonth.join(', ');
      return `Monthly, days ${days}, ${time}`;
    }
    
    return `${frequency.cadence.charAt(0).toUpperCase() + frequency.cadence.slice(1)}, ${time}`;
  };

  const formatPostPlan = (postPlan: { numberOfPosts: number; offsets: number[] }) => {
    const offsets = postPlan.offsets.map(o => `${o}d`).join(', ');
    return `${postPlan.numberOfPosts} posts: ${offsets} before`;
  };

  return (
    <AppLayout>
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-10 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-[32px] font-bold text-gray-950 leading-[1.2]">Categories & Post Framework</h1>
              <p className="text-gray-600 mt-1 text-sm">Organize your content with structured categories and posting schedules</p>
            </div>
            <div className="flex space-x-3">
              <button 
                onClick={() => router.back()}
                className="bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 px-4 py-2 w-full sm:w-auto"
              >
                ← Back to Settings
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 lg:p-10 space-y-8">
          {/* Deals Section */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Deals</h2>
                  <p className="text-gray-600 text-sm mt-1">Manage promotional deals and special offers</p>
                </div>
                <button
                  onClick={() => setIsNewDealModalOpen(true)}
                  className="bg-transparent text-gray-700 text-sm font-medium px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-gray-100 transition-all duration-200"
                >
                  <PlusIcon className="w-4 h-4" />
                  <span>Add Deal</span>
                </button>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deal Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Post Frequency</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {deals.map((deal) => (
                    <React.Fragment key={deal.id}>
                      <tr className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <button
                              onClick={() => toggleRowExpansion(deal.id)}
                              className="mr-2 text-gray-400 hover:text-gray-600"
                            >
                              {expandedRows.has(deal.id) ? 
                                <ChevronDownIcon className="w-4 h-4" /> : 
                                <ChevronRightIcon className="w-4 h-4" />
                              }
                            </button>
                            <div className="text-sm font-medium text-gray-900">{deal.name}</div>
                            {deal.subCategories.length > 0 && (
                              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {deal.subCategories.length}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{formatFrequency(deal.frequency)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <button className="text-gray-400 hover:text-gray-600">
                              <EditIcon className="w-4 h-4" />
                            </button>
                            <button className="text-gray-400 hover:text-red-600">
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expandedRows.has(deal.id) && (
                        <tr>
                          <td colSpan={3} className="px-6 py-4 bg-gray-50">
                            <div className="space-y-3">
                              <div className="text-sm font-medium text-gray-700 mb-2">Sub-categories</div>
                              {deal.subCategories.map((sub) => (
                                <div key={sub.id} className="ml-6 p-3 bg-white rounded-lg border border-gray-200">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <div className="font-medium text-gray-900">{sub.name}</div>
                                      <div className="text-sm text-gray-600">{sub.detail}</div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <button className="text-gray-400 hover:text-gray-600">
                                        <EditIcon className="w-4 h-4" />
                                      </button>
                                      <button className="text-gray-400 hover:text-red-600">
                                        <TrashIcon className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                              <button className="ml-6 text-sm text-[#6366F1] hover:text-[#4F46E5] font-medium">
                                + Add sub-category
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Offerings Section */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Offerings</h2>
                  <p className="text-gray-600 text-sm mt-1">Manage service offerings and packages</p>
                </div>
                <button
                  onClick={() => setIsNewOfferingModalOpen(true)}
                  className="bg-transparent text-gray-700 text-sm font-medium px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-gray-100 transition-all duration-200"
                >
                  <PlusIcon className="w-4 h-4" />
                  <span>Add Offering</span>
                </button>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Offering Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Post Frequency</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {offerings.map((offering) => (
                    <React.Fragment key={offering.id}>
                      <tr className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <button
                              onClick={() => toggleRowExpansion(offering.id)}
                              className="mr-2 text-gray-400 hover:text-gray-600"
                            >
                              {expandedRows.has(offering.id) ? 
                                <ChevronDownIcon className="w-4 h-4" /> : 
                                <ChevronRightIcon className="w-4 h-4" />
                              }
                            </button>
                            <div className="text-sm font-medium text-gray-900">{offering.name}</div>
                            {offering.subCategories.length > 0 && (
                              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {offering.subCategories.length}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{formatFrequency(offering.frequency)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <button className="text-gray-400 hover:text-gray-600">
                              <EditIcon className="w-4 h-4" />
                            </button>
                            <button className="text-gray-400 hover:text-red-600">
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expandedRows.has(offering.id) && (
                        <tr>
                          <td colSpan={3} className="px-6 py-4 bg-gray-50">
                            <div className="space-y-3">
                              <div className="text-sm font-medium text-gray-700 mb-2">Sub-categories</div>
                              {offering.subCategories.map((sub) => (
                                <div key={sub.id} className="ml-6 p-3 bg-white rounded-lg border border-gray-200">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <div className="font-medium text-gray-900">{sub.name}</div>
                                      <div className="text-sm text-gray-600">{sub.detail}</div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <button className="text-gray-400 hover:text-gray-600">
                                        <EditIcon className="w-4 h-4" />
                                      </button>
                                      <button className="text-gray-400 hover:text-red-600">
                                        <TrashIcon className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                              <button className="ml-6 text-sm text-[#6366F1] hover:text-[#4F46E5] font-medium">
                                + Add sub-category
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Seasonal Events Section */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Seasonal Events</h2>
                  <p className="text-gray-600 text-sm mt-1">Manage seasonal campaigns and event-based content</p>
                </div>
                <button
                  onClick={() => setIsNewSeasonalModalOpen(true)}
                  className="bg-transparent text-gray-700 text-sm font-medium px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-gray-100 transition-all duration-200"
                >
                  <PlusIcon className="w-4 h-4" />
                  <span>Add Seasonal Event</span>
                </button>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event Detail</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Post Schedule Plan</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {seasonalEvents.map((event) => (
                    <React.Fragment key={event.id}>
                      <tr className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <button
                              onClick={() => toggleRowExpansion(event.id)}
                              className="mr-2 text-gray-400 hover:text-gray-600"
                            >
                              {expandedRows.has(event.id) ? 
                                <ChevronDownIcon className="w-4 h-4" /> : 
                                <ChevronRightIcon className="w-4 h-4" />
                              }
                            </button>
                            <div className="text-sm font-medium text-gray-900">{event.name}</div>
                            {event.subCategories.length > 0 && (
                              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {event.subCategories.length}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">{event.detail}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{formatPostPlan(event.postPlan)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <button className="text-gray-400 hover:text-gray-600">
                              <EditIcon className="w-4 h-4" />
                            </button>
                            <button className="text-gray-400 hover:text-red-600">
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expandedRows.has(event.id) && (
                        <tr>
                          <td colSpan={4} className="px-6 py-4 bg-gray-50">
                            <div className="space-y-3">
                              <div className="text-sm font-medium text-gray-700 mb-2">Sub-events</div>
                              {event.subCategories.map((sub) => (
                                <div key={sub.id} className="ml-6 p-3 bg-white rounded-lg border border-gray-200">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <div className="font-medium text-gray-900">{sub.name}</div>
                                      <div className="text-sm text-gray-600">{sub.detail}</div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <button className="text-gray-400 hover:text-gray-600">
                                        <EditIcon className="w-4 h-4" />
                                      </button>
                                      <button className="text-gray-400 hover:text-red-600">
                                        <TrashIcon className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                              <button className="ml-6 text-sm text-[#6366F1] hover:text-[#4F46E5] font-medium">
                                + Add sub-event
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modals */}
        <NewDealModal 
          isOpen={isNewDealModalOpen} 
          onClose={() => setIsNewDealModalOpen(false)} 
          onSave={handleNewDeal} 
        />
        <NewOfferingModal 
          isOpen={isNewOfferingModalOpen} 
          onClose={() => setIsNewOfferingModalOpen(false)} 
          onSave={handleNewOffering} 
        />
        <NewSeasonalEventModal 
          isOpen={isNewSeasonalModalOpen} 
          onClose={() => setIsNewSeasonalModalOpen(false)} 
          onSave={handleNewSeasonalEvent} 
        />
      </div>
    </AppLayout>
  );
}
