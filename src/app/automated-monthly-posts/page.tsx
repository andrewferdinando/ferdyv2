'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';

export default function AutomatedMonthlyPostsPage() {
  const router = useRouter();
  const [daysPrior, setDaysPrior] = useState(15);

  const handleSave = () => {
    // Here you would typically save to a database or state management
    console.log(`Draft posts will be created ${daysPrior} days before each month`);
    // Show success message or redirect
  };

  const getNextExampleDate = () => {
    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const draftDate = new Date(nextMonth);
    draftDate.setDate(draftDate.getDate() - daysPrior);
    
    return {
      nextMonth: nextMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      draftDate: draftDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    };
  };

  const example = getNextExampleDate();

  return (
    <AppLayout>
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-10 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-[32px] font-bold text-gray-950 leading-[1.2]">Automated Monthly Posts</h1>
              <p className="text-gray-600 mt-1 text-sm">Configure when draft posts are created for your monthly content</p>
            </div>
            <div className="flex space-x-3">
              <button 
                onClick={() => router.back()}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Back to Settings
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 lg:p-10">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-xl border border-gray-200 p-6 sm:p-8">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Draft Creation Schedule</h2>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Choose how many days before each month you want your draft posts created for review and approval. 
                  This avoids confusion with months that have different numbers of days (28, 30, or 31).
                </p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Days before next month to create drafts
                  </label>
                  <div className="flex items-center space-x-4">
                    <input
                      type="number"
                      min="1"
                      max="28"
                      value={daysPrior}
                      onChange={(e) => setDaysPrior(parseInt(e.target.value) || 15)}
                      className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6366F1] focus:border-transparent text-center font-medium"
                    />
                    <span className="text-gray-600 text-sm">days before</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Minimum: 1 day, Maximum: 28 days (to ensure it falls in the current month)
                  </p>
                </div>

                {/* Example */}
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h3 className="font-medium text-gray-900 mb-2 text-sm">Example:</h3>
                  <p className="text-sm text-gray-600">
                    If you choose <span className="font-medium text-gray-900">{daysPrior} days</span> before each month:
                  </p>
                  <div className="mt-2 text-sm">
                    <p className="text-gray-600">
                      • For <span className="font-medium text-gray-900">{example.nextMonth}</span> posts, 
                      drafts will be created on <span className="font-medium text-gray-900">{example.draftDate}</span>
                    </p>
                  </div>
                </div>

                {/* Save Button */}
                <div className="pt-4">
                  <button
                    onClick={handleSave}
                    className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-[#6366F1] to-[#4F46E5] text-white rounded-lg hover:from-[#4F46E5] hover:to-[#4338CA] transition-all font-medium"
                  >
                    Save Settings
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
