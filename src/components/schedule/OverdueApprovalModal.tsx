'use client';

import React, { useState, useMemo } from 'react';
import Modal from '@/components/ui/Modal';
import { FormField } from '@/components/ui/Form';
import { Input } from '@/components/ui/Input';
import { formatDateTimeLocal, localToUtc, utcToLocalDate, utcToLocalTime } from '@/lib/utils/timezone';

interface OverdueApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  draft: { id: string; scheduled_for: string };
  brandTimezone: string;
  onPublishNow: () => Promise<void>;
  onReschedule: (newScheduledAtUtc: string) => Promise<void>;
}

/**
 * Rounds current time up to the next :00 or :30, then adds 1 hour.
 * Returns { date: 'YYYY-MM-DD', time: 'HH:mm' } in brand-local timezone.
 */
function getDefaultReschedule(brandTimezone: string): { date: string; time: string } {
  const now = new Date();
  // Add 1 hour
  const future = new Date(now.getTime() + 60 * 60 * 1000);
  // Round to next :00 or :30
  const mins = future.getMinutes();
  if (mins > 0 && mins <= 30) {
    future.setMinutes(30, 0, 0);
  } else if (mins > 30) {
    future.setHours(future.getHours() + 1, 0, 0, 0);
  } else {
    future.setSeconds(0, 0);
  }

  return {
    date: utcToLocalDate(future, brandTimezone),
    time: utcToLocalTime(future, brandTimezone),
  };
}

export default function OverdueApprovalModal({
  isOpen,
  onClose,
  draft,
  brandTimezone,
  onPublishNow,
  onReschedule,
}: OverdueApprovalModalProps) {
  const defaultSchedule = useMemo(() => getDefaultReschedule(brandTimezone), [brandTimezone]);
  const [rescheduleDate, setRescheduleDate] = useState(defaultSchedule.date);
  const [rescheduleTime, setRescheduleTime] = useState(defaultSchedule.time);
  const [isProcessing, setIsProcessing] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const originalTimeFormatted = formatDateTimeLocal(draft.scheduled_for, brandTimezone);

  const handlePublishNow = async () => {
    setIsProcessing(true);
    try {
      await onPublishNow();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReschedule = async () => {
    // Validate the new time is in the future
    const newUtc = localToUtc(rescheduleDate, rescheduleTime, brandTimezone);
    if (newUtc <= new Date()) {
      setValidationError('Please choose a time in the future.');
      return;
    }
    setValidationError(null);
    setIsProcessing(true);
    try {
      await onReschedule(newUtc.toISOString());
    } catch (err) {
      console.error('Failed to reschedule draft:', err);
      setValidationError('Failed to reschedule. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="This post is overdue"
      subtitle={`Originally scheduled for ${originalTimeFormatted}`}
      maxWidth="md"
    >
      <div className="space-y-6">
        {/* Option 1: Publish Now */}
        <div>
          <button
            onClick={handlePublishNow}
            disabled={isProcessing}
            className="w-full px-4 py-3 bg-gradient-to-r from-[#6366F1] to-[#4F46E5] text-white rounded-lg hover:from-[#4F46E5] hover:to-[#4338CA] transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing && (
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {isProcessing ? 'Publishing…' : 'Publish Now'}
          </button>
          <p className="text-xs text-gray-500 mt-1.5 text-center">
            Approve and publish immediately
          </p>
        </div>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-white px-3 text-gray-400">or</span>
          </div>
        </div>

        {/* Option 2: Reschedule */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-700">Reschedule for a new time</p>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Date">
              <Input
                type="date"
                value={rescheduleDate}
                onChange={(e) => {
                  setRescheduleDate(e.target.value);
                  setValidationError(null);
                }}
                disabled={isProcessing}
              />
            </FormField>
            <FormField label="Time">
              <Input
                type="time"
                value={rescheduleTime}
                onChange={(e) => {
                  setRescheduleTime(e.target.value);
                  setValidationError(null);
                }}
                disabled={isProcessing}
              />
            </FormField>
          </div>
          {validationError && (
            <p className="text-sm text-red-600">{validationError}</p>
          )}
          <button
            onClick={handleReschedule}
            disabled={isProcessing}
            className="w-full px-4 py-2.5 border border-gray-300 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing && (
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500 inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {isProcessing ? 'Saving…' : 'Reschedule & Approve'}
          </button>
        </div>

        {/* Cancel */}
        <button
          onClick={onClose}
          disabled={isProcessing}
          className="w-full px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </Modal>
  );
}
