'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface ScheduleRule {
  id: string;
  brand_id: string;
  name: string;
  category_id: string;
  subcategory_id: string;
  tone: string;
  hashtag_rule: Record<string, unknown>;
  image_tag_rule: Record<string, unknown>;
  frequency: 'daily' | 'weekly' | 'monthly';
  times_per_week: number;
  days_of_week: number[];
  day_of_month: number;
  nth_week: number;
  weekday: number;
  time_of_day: string;
  channels: string[];
  timezone: string;
  is_active: boolean;
  first_run_month: string;
  last_run_month: string;
  created_at: string;
  updated_at: string;
  categories: {
    name: string;
  };
  subcategories: {
    name: string;
    detail: string;
    url: string;
    default_hashtags: string[];
  };
}

export function useScheduleRules(brandId: string) {
  const [rules, setRules] = useState<ScheduleRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!brandId) return;

    const fetchRules = async () => {
      if (!supabase) {
        console.log('useScheduleRules: Supabase client not available');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const { data, error } = await supabase
          .from('schedule_rules')
          .select(`
            *,
            categories(name),
            subcategories(name, detail, url, default_hashtags)
          `)
          .eq('brand_id', brandId)
          .order('created_at', { ascending: false });

        if (error) throw error;

        setRules(data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch schedule rules');
      } finally {
        setLoading(false);
      }
    };

    fetchRules();
  }, [brandId]);

  const upsertRule = async (ruleData: Partial<ScheduleRule>) => {
    if (!supabase) {
      throw new Error('Supabase client not available');
    }

    try {
      const { data, error } = await supabase.rpc('rpc_upsert_schedule_rule', {
        p_id: ruleData.id || null,
        p_brand_id: brandId,
        p_name: ruleData.name,
        p_category_id: ruleData.category_id,
        p_subcategory_id: ruleData.subcategory_id,
        p_tone: ruleData.tone,
        p_hashtag_rule: ruleData.hashtag_rule,
        p_image_tag_rule: ruleData.image_tag_rule,
        p_frequency: ruleData.frequency,
        p_times_per_week: ruleData.times_per_week,
        p_days_of_week: ruleData.days_of_week,
        p_day_of_month: ruleData.day_of_month,
        p_nth_week: ruleData.nth_week,
        p_weekday: ruleData.weekday,
        p_time_of_day: ruleData.time_of_day,
        p_channels: ruleData.channels,
        p_timezone: ruleData.timezone,
        p_is_active: ruleData.is_active,
        p_first_run_month: ruleData.first_run_month,
        p_last_run_month: ruleData.last_run_month
      });

      if (error) throw error;

      // Update local state
      if (ruleData.id) {
        setRules(prev => prev.map(rule => 
          rule.id === ruleData.id ? { ...rule, ...data } : rule
        ));
      } else {
        setRules(prev => [data, ...prev]);
      }

      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save schedule rule');
      throw err;
    }
  };

  const deleteRule = async (ruleId: string) => {
    if (!supabase) {
      throw new Error('Supabase client not available');
    }

    try {
      const { error } = await supabase
        .from('schedule_rules')
        .delete()
        .eq('id', ruleId);

      if (error) throw error;

      // Remove from local state
      setRules(prev => prev.filter(rule => rule.id !== ruleId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete schedule rule');
      throw err;
    }
  };

  return {
    rules,
    loading,
    error,
    upsertRule,
    deleteRule,
    refetch: () => {
      setLoading(true);
      setRules([]);
    }
  };
}
