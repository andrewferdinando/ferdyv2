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
        // Try to get user from auth.users table first
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

        // For other users, we might need to fetch from a profiles table
        // For now, we'll create a basic user object
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

  // Generate initials from full_name or email
  const getInitials = () => {
    if (user.full_name) {
      return user.full_name
        .split(' ')
        .map(name => name.charAt(0))
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    if (user.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'U';
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
