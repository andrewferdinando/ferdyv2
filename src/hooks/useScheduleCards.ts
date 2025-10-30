'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-browser';

export interface ScheduleCardRow {
  brand_id: string;
  subcategory_id: string;
  scheduled_for: string; // UTC timestamp
  channels: string[] | null;
  channel_count: number;
  representative_status?: string | null;
  any_draft_id?: string | null;
}

export function useScheduleCards(brandId: string) {
  const [cards, setCards] = useState<ScheduleCardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!brandId) return;
    let cancelled = false;
    const fetchCards = async () => {
      try {
        setLoading(true);
        setError(null);
        const { data, error } = await supabase
          .from('schedule_cards')
          .select('brand_id, subcategory_id, scheduled_for, channels, channel_count')
          .eq('brand_id', brandId)
          .order('scheduled_for', { ascending: true });
        if (error) throw error;
        if (!cancelled) setCards((data as ScheduleCardRow[]) || []);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to fetch schedule cards');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchCards();
    return () => { cancelled = true; };
  }, [brandId]);

  const refetch = async () => {
    if (!brandId) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('schedule_cards')
        .select('brand_id, subcategory_id, scheduled_for, channels, channel_count')
        .eq('brand_id', brandId)
        .order('scheduled_for', { ascending: true });
      if (error) throw error;
      setCards((data as ScheduleCardRow[]) || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch schedule cards');
    } finally {
      setLoading(false);
    }
  };

  return { cards, loading, error, refetch };
}


