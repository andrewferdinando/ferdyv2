'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-browser';

interface UserLogin {
  id: string;
  user_name: string | null;
  email: string | null;
  brands: string[];
  last_login: string | null;
}

function formatDateTime(value: string | null) {
  if (!value) return 'Never';
  try {
    const date = new Date(value);
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  } catch {
    return 'Never';
  }
}

function getLastLoginBadge(lastLogin: string | null) {
  if (!lastLogin) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
        Never
      </span>
    );
  }
  
  const date = new Date(lastLogin);
  const now = new Date();
  const daysDiff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysDiff <= 7) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        Active
      </span>
    );
  } else if (daysDiff <= 30) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
        Recent
      </span>
    );
  } else {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
        Inactive
      </span>
    );
  }
}

export default function UsersLastLoginTab() {
  const [users, setUsers] = useState<UserLogin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 20;

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // First, get profiles with their brand memberships
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data: profiles, error: profilesError, count } = await supabase
        .from('profiles')
        .select(`
          user_id,
          full_name,
          email,
          last_sign_in_at,
          brand_memberships(
            brands(name)
          )
        `, { count: 'exact' })
        .order('last_sign_in_at', { ascending: false, nullsFirst: false })
        .range(from, to);

      if (profilesError) {
        throw profilesError;
      }

      const formattedUsers: UserLogin[] = (profiles || []).map((profile: any) => {
        const brandNames = profile.brand_memberships
          ?.map((m: any) => m.brands?.name)
          .filter(Boolean) || [];
        
        return {
          id: profile.user_id,
          user_name: profile.full_name || null,
          email: profile.email || null,
          brands: brandNames,
          last_login: profile.last_sign_in_at || null,
        };
      });

      setUsers(formattedUsers);
      setTotalCount(count || 0);
    } catch (err) {
      console.error('[UsersLastLoginTab] Failed to fetch users:', err);
      setError('Unable to load users. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-gray-900">Users – Last Login</h2>
        <p className="mt-1 text-sm text-gray-500">Identify active vs inactive users</p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        {error && (
          <div className="p-4 text-center text-red-600">{error}</div>
        )}
        
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No users found.</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Brand(s)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Login
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.user_name || '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.email || '—'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {user.brands.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {user.brands.map((brand, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700"
                          >
                            {brand}
                          </span>
                        ))}
                      </div>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDateTime(user.last_login)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getLastLoginBadge(user.last_login)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="border-t border-gray-200 px-4 py-3 flex items-center justify-between sm:px-6">
          <div className="text-sm text-gray-700">
            Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, totalCount)} of {totalCount} results
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
