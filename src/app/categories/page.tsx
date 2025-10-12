'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import Modal from '@/components/ui/Modal';
import { Form, FormField, FormActions } from '@/components/ui/Form';
import { Input } from '@/components/ui/Input';

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
    monthlyPattern?: {
      type: 'specificDates' | 'dayOfWeek';
      specificDates?: number[]; // e.g., [1, 15, 20] for 1st, 15th, 20th of month
      dayOfWeek?: {
        week: 'first' | 'second' | 'third' | 'fourth' | 'last';
        day: string; // Monday, Tuesday, etc.
      };
    };
    time: string;
  };
  postPlan?: {
    numberOfPosts: number;
    offsets: number[];
  };
}

interface Deal {
  id: string;
  name: string;
  detail: string;
  hashtags: string[];
  url: string;
  frequency: {
    cadence: 'daily' | 'weekly' | 'monthly';
    timesPerWeek?: number;
    daysOfWeek?: string[];
    timesPerMonth?: number;
    daysOfMonth?: number[];
    monthlyPattern?: {
      type: 'specificDates' | 'dayOfWeek';
      specificDates?: number[]; // e.g., [1, 15, 20] for 1st, 15th, 20th of month
      dayOfWeek?: {
        week: 'first' | 'second' | 'third' | 'fourth' | 'last';
        day: string; // Monday, Tuesday, etc.
      };
    };
    time: string;
  };
  subCategories: SubCategory[];
}


// Modal Components
const NewDealModal = ({ isOpen, onClose, onSave }: { isOpen: boolean; onClose: () => void; onSave: (deal: Omit<Deal, 'id'>) => void }) => {
  const [formData, setFormData] = useState({
    name: '',
    detail: '',
    hashtags: '',
    url: '',
    cadence: 'weekly' as 'daily' | 'weekly' | 'monthly',
    timesPerWeek: 1,
    daysOfWeek: [] as string[],
    daysOfMonth: [] as number[],
    monthlyPatternType: 'specificDates' as 'specificDates' | 'dayOfWeek',
    specificDates: [] as number[],
    dayOfWeekPattern: {
      week: 'first' as 'first' | 'second' | 'third' | 'fourth' | 'last',
      day: 'Monday'
    },
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
      monthlyPattern?: {
        type: 'specificDates' | 'dayOfWeek';
        specificDates?: number[];
        dayOfWeek?: {
          week: 'first' | 'second' | 'third' | 'fourth' | 'last';
          day: string;
        };
      };
      time: string;
    } = {
      cadence: formData.cadence,
      time: formData.time
    };

    if (formData.cadence === 'weekly') {
      frequency.timesPerWeek = formData.timesPerWeek;
      frequency.daysOfWeek = formData.daysOfWeek;
    } else if (formData.cadence === 'monthly') {
      frequency.monthlyPattern = {
        type: formData.monthlyPatternType
      };
      
      if (formData.monthlyPatternType === 'specificDates') {
        frequency.monthlyPattern.specificDates = formData.specificDates;
      } else if (formData.monthlyPatternType === 'dayOfWeek') {
        frequency.monthlyPattern.dayOfWeek = formData.dayOfWeekPattern;
      }
    }
    
    const hashtagsArray = formData.hashtags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
    
    onSave({
      name: formData.name,
      detail: formData.detail,
      hashtags: hashtagsArray,
      url: formData.url,
      frequency,
      subCategories: []
    });
    
    setFormData({ 
      name: '', 
      detail: '',
      hashtags: '',
      url: '',
      cadence: 'weekly', 
      timesPerWeek: 1, 
      daysOfWeek: [], 
      daysOfMonth: [], 
      monthlyPatternType: 'specificDates',
      specificDates: [],
      dayOfWeekPattern: {
        week: 'first',
        day: 'Monday'
      },
      time: '09:00' 
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="New Deal"
      subtitle="Create a new deal with posting schedule"
      maxWidth="md"
    >
      <Form onSubmit={handleSubmit}>
        <FormField label="Deal Name" required>
          <Input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Enter deal name"
          />
        </FormField>
          
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Deal Detail</label>
          <textarea
            value={formData.detail}
            onChange={(e) => setFormData({ ...formData, detail: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent"
            placeholder="Describe the deal"
          />
        </div>
          
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Hashtags</label>
          <input
            type="text"
            value={formData.hashtags}
            onChange={(e) => setFormData({ ...formData, hashtags: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent"
            placeholder="Enter hashtags separated by commas (e.g., #deal, #sale, #offer)"
          />
        </div>
          
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">URL</label>
          <input
            type="url"
            value={formData.url}
            onChange={(e) => setFormData({ ...formData, url: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent"
            placeholder="https://example.com/deal-page"
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
          <div className="space-y-4">
            {/* Monthly Pattern Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Monthly Pattern</label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="monthlyPattern"
                    checked={formData.monthlyPatternType === 'specificDates'}
                    onChange={() => setFormData(prev => ({ ...prev, monthlyPatternType: 'specificDates' }))}
                    className="mr-2 text-[#6366F1] focus:ring-[#6366F1]"
                  />
                  <span className="text-sm text-gray-700">On specific dates</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="monthlyPattern"
                    checked={formData.monthlyPatternType === 'dayOfWeek'}
                    onChange={() => setFormData(prev => ({ ...prev, monthlyPatternType: 'dayOfWeek' }))}
                    className="mr-2 text-[#6366F1] focus:ring-[#6366F1]"
                  />
                  <span className="text-sm text-gray-700">On specific day of week</span>
                </label>
              </div>
            </div>

            {/* Specific Dates Pattern */}
            {formData.monthlyPatternType === 'specificDates' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Dates</label>
                <div className="border border-gray-200 rounded-lg p-3">
                  {/* Days 1-28 in a 7x4 grid */}
                  <div className="grid grid-cols-7 gap-2 mb-2">
                    {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                      <label key={day} className="flex items-center justify-center space-x-1">
                        <input
                          type="checkbox"
                          checked={formData.specificDates.includes(day)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData(prev => ({ ...prev, specificDates: [...prev.specificDates, day] }));
                            } else {
                              setFormData(prev => ({ ...prev, specificDates: prev.specificDates.filter(d => d !== day) }));
                            }
                          }}
                          className="rounded border-gray-300 text-[#6366F1] focus:ring-[#6366F1]"
                        />
                        <span className="text-xs text-gray-700">{day}</span>
                      </label>
                    ))}
                  </div>
                  {/* Days 29-31 in a centered row */}
                  <div className="flex justify-start gap-2">
                    {Array.from({ length: 3 }, (_, i) => i + 29).map(day => (
                      <label key={day} className="flex items-center justify-center space-x-1">
                        <input
                          type="checkbox"
                          checked={formData.specificDates.includes(day)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData(prev => ({ ...prev, specificDates: [...prev.specificDates, day] }));
                            } else {
                              setFormData(prev => ({ ...prev, specificDates: prev.specificDates.filter(d => d !== day) }));
                            }
                          }}
                          className="rounded border-gray-300 text-[#6366F1] focus:ring-[#6366F1]"
                        />
                        <span className="text-xs text-gray-700">{day}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Select the days of the month when this should be posted (currently selected: {formData.specificDates.length} day{formData.specificDates.length !== 1 ? 's' : ''})
                  {formData.specificDates.some(day => day > 28) && (
                    <span className="block mt-1 text-amber-600">
                      ⚠️ Days 29-31 may not exist in some months (e.g., February has 28/29 days)
                    </span>
                  )}
                </p>
              </div>
            )}

            {/* Day of Week Pattern */}
            {formData.monthlyPatternType === 'dayOfWeek' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Which week?</label>
                  <select
                    value={formData.dayOfWeekPattern.week}
                     onChange={(e) => setFormData(prev => ({ 
                       ...prev, 
                       dayOfWeekPattern: { ...prev.dayOfWeekPattern, week: e.target.value as 'first' | 'second' | 'third' | 'fourth' | 'last' }
                     }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent"
                  >
                    <option value="first">First</option>
                    <option value="second">Second</option>
                    <option value="third">Third</option>
                    <option value="fourth">Fourth</option>
                    <option value="last">Last</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Which day?</label>
                  <select
                    value={formData.dayOfWeekPattern.day}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      dayOfWeekPattern: { ...prev.dayOfWeekPattern, day: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent"
                  >
                    <option value="Monday">Monday</option>
                    <option value="Tuesday">Tuesday</option>
                    <option value="Wednesday">Wednesday</option>
                    <option value="Thursday">Thursday</option>
                    <option value="Friday">Friday</option>
                    <option value="Saturday">Saturday</option>
                    <option value="Sunday">Sunday</option>
                  </select>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    Example: This will post on the <strong>{formData.dayOfWeekPattern.week}</strong> <strong>{formData.dayOfWeekPattern.day}</strong> of each month
                  </p>
                </div>
              </div>
            )}
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
          
        <FormActions
          onCancel={onClose}
          submitText="Create Deal"
        />
      </Form>
    </Modal>
  );
};

export default function CategoriesPage() {
  const router = useRouter();
  
  // Modal states
  const [isNewDealModalOpen, setIsNewDealModalOpen] = useState(false);
  
  // Data states
  const [deals, setDeals] = useState<Deal[]>([
    {
      id: '1',
      name: 'Happy Hour Special',
      detail: '50% off all drinks from 4-6 PM every Friday',
      hashtags: ['#happyhour', '#drinks', '#friday'],
      url: 'https://gameover.co.nz/happy-hour',
      frequency: { cadence: 'weekly', timesPerWeek: 1, daysOfWeek: ['Friday'], time: '15:00' },
      subCategories: []
    }
  ]);

  const handleNewDeal = (deal: Omit<Deal, 'id'>) => {
    setDeals(prev => [...prev, { ...deal, id: Date.now().toString() }]);
  };

  const formatFrequency = (frequency: { cadence: string; timesPerWeek?: number; daysOfWeek?: string[]; timesPerMonth?: number; daysOfMonth?: number[]; monthlyPattern?: { type: string; specificDates?: number[]; dayOfWeek?: { week: string; day: string } }; time: string }) => {
    const time = new Date(`2000-01-01T${frequency.time}`).toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
    
    if (frequency.cadence === 'weekly' && frequency.daysOfWeek && frequency.daysOfWeek.length > 0) {
      const days = frequency.daysOfWeek.join(', ');
      return `Weekly, ${days}, ${time}`;
    }
    
    if (frequency.cadence === 'monthly') {
      if (frequency.monthlyPattern) {
        if (frequency.monthlyPattern.type === 'specificDates' && frequency.monthlyPattern.specificDates) {
          const days = frequency.monthlyPattern.specificDates.join(', ');
          return `Monthly, days ${days}, ${time}`;
        } else if (frequency.monthlyPattern.type === 'dayOfWeek' && frequency.monthlyPattern.dayOfWeek) {
          const { week, day } = frequency.monthlyPattern.dayOfWeek;
          return `Monthly, ${week} ${day}, ${time}`;
        }
      }
      
      // Fallback to old format
      if (frequency.daysOfMonth && frequency.daysOfMonth.length > 0) {
        const days = frequency.daysOfMonth.join(', ');
        return `Monthly, days ${days}, ${time}`;
      }
    }
    
    return `${frequency.cadence.charAt(0).toUpperCase() + frequency.cadence.slice(1)}, ${time}`;
  };

  return (
    <AppLayout>
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-10 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-[32px] font-bold text-gray-950 leading-[1.2]">Categories & Post Frequency</h1>
              <p className="text-gray-600 mt-1 text-sm">Organize your content with structured categories and posting schedules</p>
            </div>
            <div className="flex space-x-3">
              <button 
                onClick={() => router.back()}
                className="bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 px-4 py-2 w-full sm:w-auto flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span>Back to Settings</span>
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
                  className="bg-gradient-to-r from-[#6366F1] to-[#4F46E5] text-white text-sm font-medium px-4 py-2 rounded-lg flex items-center space-x-2 hover:from-[#4F46E5] hover:to-[#4338CA] transition-all duration-200"
                >
                  <PlusIcon className="w-4 h-4" />
                  <span>Add Deal</span>
                </button>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full table-fixed">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="w-1/3 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deal Name</th>
                    <th className="w-1/2 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Post Frequency</th>
                    <th className="w-1/6 px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {deals.map((deal) => (
                    <tr key={deal.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-left">
                        <div className="text-sm font-medium text-gray-900">{deal.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-left">
                        <div className="text-sm text-gray-900">{formatFrequency(deal.frequency)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button className="text-gray-400 hover:text-gray-600">
                            <EditIcon className="w-4 h-4" />
                          </button>
                          <button className="text-gray-400 hover:text-red-600">
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
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
      </div>
    </AppLayout>
  );
}
