'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase-browser';

interface UserAvatarProps {
  userId: string;
  size?: 'sm' | 'md';
  className?: string;
}

export default function UserAvatar({ userId, size = 'sm', className = '' }: UserAvatarProps) {
  const [user, setUser] = useState<{ 
    id: string; 
    email?: string; 
    full_name?: string; 
    avatar_url?: string; 
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        // First try to get user from profiles table (has full_name field)
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .eq('user_id', userId)
          .single();

        if (!profileError && profileData) {
          console.log('UserAvatar: Found user in profiles:', profileData);
          
          setUser({
            id: profileData.user_id,
            email: undefined,
            full_name: profileData.full_name,
            avatar_url: undefined
          });
          setLoading(false);
          return;
        }

        // Fallback: try user_profiles table
        const { data: userProfileData, error: userProfileError } = await supabase
          .from('user_profiles')
          .select('id, name, profile_image_url')
          .eq('id', userId)
          .single();

        if (!userProfileError && userProfileData) {
          console.log('UserAvatar: Found user in user_profiles:', userProfileData);
          
          setUser({
            id: userProfileData.id,
            email: undefined,
            full_name: userProfileData.name,
            avatar_url: userProfileData.profile_image_url
          });
          setLoading(false);
          return;
        }

        console.log('UserAvatar: Not found in user_profiles, trying auth.users...');

        // Fallback to auth.users table if not found in user_profiles
        const { data: authUser, error: authError } = await supabase.auth.getUser();
        
        if (authError || !authUser.user) {
          console.log('No authenticated user found');
          setLoading(false);
          return;
        }

        // If we're looking for the current user, use their data
        if (authUser.user.id === userId) {
          setUser({
            id: authUser.user.id,
            email: authUser.user.email,
            full_name: authUser.user.user_metadata?.full_name,
            avatar_url: authUser.user.user_metadata?.avatar_url
          });
          setLoading(false);
          return;
        }

        // For other users, create a basic user object
        setUser({
          id: userId,
          email: 'user@example.com', // Placeholder
          full_name: 'User'
        });
        
      } catch (error) {
        console.error('Error fetching user:', error);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchUser();
    }
  }, [userId]);

  if (loading) {
    return (
      <div className={`${size === 'sm' ? 'w-6 h-6' : 'w-8 h-8'} rounded-full bg-gray-200 animate-pulse ${className}`} />
    );
  }

  if (!user) {
    return (
      <div className={`${size === 'sm' ? 'w-6 h-6' : 'w-8 h-8'} rounded-full bg-gray-200 flex items-center justify-center ${className}`}>
        <span className={`${size === 'sm' ? 'text-xs' : 'text-sm'} font-medium text-gray-500`}>?</span>
      </div>
    );
  }

  // Generate initials: first letter of first name + first letter of last name
  const getInitials = () => {
    console.log('UserAvatar: Generating initials for user:', user);
    
    if (user.full_name) {
      const nameParts = user.full_name.trim().split(/\s+/);
      if (nameParts.length >= 2) {
        // Multiple names: take first letter of first name and first letter of last name
        const initials = (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)).toUpperCase();
        console.log('UserAvatar: Generated initials from full_name (first + last):', initials);
        return initials;
      } else if (nameParts.length === 1) {
        // Single name: use first letter twice (no last name available)
        const initial = nameParts[0].charAt(0).toUpperCase();
        console.log('UserAvatar: Generated initials from single name (first letter repeated):', initial + initial);
        return initial + initial;
      }
    }
    if (user.email) {
      // For email, try to find first.last@ pattern
      const emailParts = user.email.split('@')[0].split('.');
      if (emailParts.length >= 2) {
        const initials = (emailParts[0].charAt(0) + emailParts[1].charAt(0)).toUpperCase();
        console.log('UserAvatar: Generated initials from email (first.last):', initials);
        return initials;
      }
      // If no dot, use first letter twice (no clear first/last separation)
      const username = user.email.split('@')[0];
      const initial = username.charAt(0).toUpperCase();
      console.log('UserAvatar: Generated initials from email (first letter repeated):', initial + initial);
      return initial + initial;
    }
    console.log('UserAvatar: Using fallback initials: UU');
    return 'UU';
  };

  const initials = getInitials();

  return (
    <div className={`${size === 'sm' ? 'w-6 h-6' : 'w-8 h-8'} rounded-full bg-indigo-100 flex items-center justify-center ${className}`}>
      {user.avatar_url ? (
        <img
          src={user.avatar_url}
          alt={user.full_name || user.email || 'User'}
          className={`${size === 'sm' ? 'w-6 h-6' : 'w-8 h-8'} rounded-full object-cover`}
          onError={(e) => {
            // Fallback to initials if image fails to load
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            const parent = target.parentElement;
            if (parent) {
              parent.innerHTML = `<span class="${size === 'sm' ? 'text-[10px]' : 'text-xs'} font-medium text-indigo-700">${initials}</span>`;
            }
          }}
        />
      ) : (
        <span className={`${size === 'sm' ? 'text-[10px]' : 'text-xs'} font-medium text-indigo-700`}>
          {initials}
        </span>
      )}
    </div>
  );
}
