'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-browser';

interface UserInvite {
  id: string;
  brand_name: string | null;
  user_name: string | null;
  email: string;
  invite_sent_date: string;
  status: string;
}

function formatDate(value: string | null) {
  if (!value) return '—';
  try {
    const date = new Date(value);
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  } catch {
    return '—';
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'accepted':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          Accepted
        </span>
      );
    case 'pending':
    case 'pending_existing':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          Invited
        </span>
      );
    case 'expired':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          Expired
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          {status}
        </span>
      );
  }
}

export default function NewUserInvitesTab() {
  const [invites, setInvites] = useState<UserInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 20;

  const fetchInvites = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error: queryError, count } = await supabase
        .from('brand_invites')
        .select(`
          id,
          email,
          invitee_name,
          status,
          created_at,
          last_invite_sent_at,
          brands(name)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (queryError) {
        throw queryError;
      }

      const formattedInvites: UserInvite[] = (data || []).map((invite: any) => ({
        id: invite.id,
        brand_name: invite.brands?.name || null,
        user_name: invite.invitee_name || null,
        email: invite.email,
        invite_sent_date: invite.last_invite_sent_at || invite.created_at,
        status: invite.status,
      }));

      setInvites(formattedInvites);
      setTotalCount(count || 0);
    } catch (err) {
      console.error('[NewUserInvitesTab] Failed to fetch invites:', err);
      setError('Unable to load invites. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchInvites();
  }, [fetchInvites]);

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-gray-900">New User Invites</h2>
        <p className="mt-1 text-sm text-gray-500">Track onboarding activity</p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        {error && (
          <div className="p-4 text-center text-red-600">{error}</div>
        )}
        
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : invites.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No invites found.</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Brand
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Invite Sent Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Invite Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {invites.map((invite) => (
                <tr key={invite.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {invite.brand_name || '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {invite.user_name || '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {invite.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(invite.invite_sent_date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(invite.status)}
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
