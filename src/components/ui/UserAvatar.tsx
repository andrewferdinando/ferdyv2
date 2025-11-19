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
        // First try to get user from user_profiles table
        const { data: profileData, error: profileError } = await supabase
          .from('user_profiles')
          .select('id, name, profile_image_url')
          .eq('id', userId)
          .single();

        if (!profileError && profileData) {
          console.log('UserAvatar: Found user in user_profiles:', profileData);
          
          setUser({
            id: profileData.id,
            email: undefined, // user_profiles doesn't have email field
            full_name: profileData.name, // Use 'name' field as full_name
            avatar_url: profileData.profile_image_url // Already has full URL
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

  // Generate initials from full_name or email (always 2 initials when possible)
  const getInitials = () => {
    console.log('UserAvatar: Generating initials for user:', user);
    
    if (user.full_name) {
      const nameParts = user.full_name.trim().split(/\s+/);
      if (nameParts.length >= 2) {
        // Multiple names: take first letter of first name and first letter of last name
        const initials = (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)).toUpperCase();
        console.log('UserAvatar: Generated initials from full_name (first + last):', initials);
        return initials;
      } else if (nameParts.length === 1 && nameParts[0].length >= 2) {
        // Single name: take first two letters
        const initials = nameParts[0].substring(0, 2).toUpperCase();
        console.log('UserAvatar: Generated initials from single name (first 2 letters):', initials);
        return initials;
      } else if (nameParts.length === 1) {
        // Single letter name: repeat it
        const initial = nameParts[0].charAt(0).toUpperCase();
        console.log('UserAvatar: Generated initials from single letter name:', initial + initial);
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
      // If no dot, try taking first two letters of username
      const username = user.email.split('@')[0];
      if (username.length >= 2) {
        const initials = username.substring(0, 2).toUpperCase();
        console.log('UserAvatar: Generated initials from email (first 2 letters):', initials);
        return initials;
      }
      // Single letter username: repeat it
      const initial = username.charAt(0).toUpperCase();
      console.log('UserAvatar: Generated initials from single letter email:', initial + initial);
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
              parent.innerHTML = `<span class="${size === 'sm' ? 'text-xs' : 'text-sm'} font-medium text-indigo-700">${initials}</span>`;
            }
          }}
        />
      ) : (
        <span className={`${size === 'sm' ? 'text-xs' : 'text-sm'} font-medium text-indigo-700`}>
          {initials}
        </span>
      )}
    </div>
  );
}
