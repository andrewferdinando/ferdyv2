'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface PreviewSlot {
  date: string;
  time: string;
  channel: string;
  rule_name: string;
  subcategory: string;
  generated: boolean;
  post_job_id?: string;
}

interface PreviewData {
  slots: PreviewSlot[];
  totalSlots: number;
  generatedSlots: number;
  pendingSlots: number;
}

export function useNextMonthPreview(brandId: string) {
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPreview = async () => {
    if (!supabase) {
      console.log('useNextMonthPreview: Supabase client not available');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get next month
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      const targetMonth = `${nextMonth.getFullYear()}-${(nextMonth.getMonth() + 1).toString().padStart(2, '0')}-01`;

      // Call the edge function to generate preview (no writes)
      const { error } = await supabase.functions.invoke('generate-drafts-for-month', {
        body: {
          brand_id: brandId,
          target_month: targetMonth,
          preview_only: true // Custom parameter to prevent writes
        }
      });

      if (error) throw error;

      // Process the data to create preview slots
      const slots: PreviewSlot[] = [];
      
      // TODO: Process the response from the edge function
      // This would need to be implemented in the edge function to return preview data
      
      setPreview({
        slots,
        totalSlots: slots.length,
        generatedSlots: slots.filter(s => s.generated).length,
        pendingSlots: slots.filter(s => !s.generated).length
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch preview');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!brandId) return;
    fetchPreview();
  }, [brandId]);

  const generateForMonth = async (targetMonth: string, force: boolean = false) => {
    if (!supabase) {
      throw new Error('Supabase client not available');
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.functions.invoke('generate-drafts-for-month', {
        body: {
          brand_id: brandId,
          target_month: targetMonth,
          force
        }
      });

      if (error) throw error;

      // Refresh preview after generation
      await fetchPreview();

      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate drafts');
      throw err;
    }
  };

  const regenerateSlot = async (postJobId: string) => {
    if (!supabase) {
      throw new Error('Supabase client not available');
    }

    try {
      setError(null);

      const { data, error } = await supabase.functions.invoke('regenerate-slot', {
        body: {
          post_job_id: postJobId
        }
      });

      if (error) throw error;

      // Refresh preview after regeneration
      await fetchPreview();

      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to regenerate slot');
      throw err;
    }
  };

  return {
    preview,
    loading,
    error,
    generateForMonth,
    regenerateSlot,
    refetch: fetchPreview
  };
}
