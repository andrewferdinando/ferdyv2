'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-browser';

interface NotificationRecord {
  id: string;
  sent_at: string;
  brand_name: string | null;
  notification_type: string;
  recipient: string | null;
}

function formatDateTime(value: string | null) {
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

function getNotificationTypeBadge(type: string) {
  const typeColors: Record<string, { bg: string; text: string }> = {
    'post_published': { bg: 'bg-green-100', text: 'text-green-800' },
    'drafts_ready': { bg: 'bg-blue-100', text: 'text-blue-800' },
    'social_disconnected': { bg: 'bg-red-100', text: 'text-red-800' },
    'brand_added': { bg: 'bg-purple-100', text: 'text-purple-800' },
    'brand_deleted': { bg: 'bg-orange-100', text: 'text-orange-800' },
    'team_invite': { bg: 'bg-indigo-100', text: 'text-indigo-800' },
    'password_reset': { bg: 'bg-gray-100', text: 'text-gray-800' },
    'invoice_paid': { bg: 'bg-emerald-100', text: 'text-emerald-800' },
  };

  const colors = typeColors[type] || { bg: 'bg-gray-100', text: 'text-gray-800' };
  const displayName = type.split('_').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}>
      {displayName}
    </span>
  );
}

export default function NotificationsSentTab() {
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tableExists, setTableExists] = useState(true);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 20;

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      // Try to fetch from notification_logs table
      const { data, error: queryError, count } = await supabase
        .from('notification_logs')
        .select(`
          id,
          created_at,
          notification_type,
          recipient_email,
          brand_id,
          brands(name)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (queryError) {
        // If table doesn't exist, show placeholder
        if (queryError.code === '42P01' || queryError.message.includes('does not exist')) {
          setTableExists(false);
          setNotifications([]);
          setTotalCount(0);
          return;
        }
        throw queryError;
      }

      const formattedNotifications: NotificationRecord[] = (data || []).map((notif: any) => ({
        id: notif.id,
        sent_at: notif.created_at,
        brand_name: notif.brands?.name || null,
        notification_type: notif.notification_type,
        recipient: notif.recipient_email || null,
      }));

      setNotifications(formattedNotifications);
      setTotalCount(count || 0);
    } catch (err) {
      console.error('[NotificationsSentTab] Failed to fetch notifications:', err);
      // Check if it's a table not found error
      if ((err as any)?.code === '42P01' || (err as any)?.message?.includes('does not exist')) {
        setTableExists(false);
        setNotifications([]);
        setTotalCount(0);
      } else {
        setError('Unable to load notifications. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const totalPages = Math.ceil(totalCount / pageSize);

  // If table doesn't exist, show placeholder
  if (!tableExists) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-200 p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-900">Notifications Sent</h2>
          <p className="mt-1 text-sm text-gray-500">Audit system notifications</p>
        </div>
        <div className="p-8 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <h3 className="text-sm font-medium text-gray-900 mb-2">Notification Logging Not Enabled</h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            The notification_logs table has not been created yet. To enable notification auditing, 
            create the table and update the email sending functions to log notifications.
          </p>
          <div className="mt-6 p-4 bg-gray-50 rounded-lg text-left max-w-lg mx-auto">
            <p className="text-xs font-medium text-gray-700 mb-2">Current notification types (not logged):</p>
            <ul className="text-xs text-gray-500 space-y-1">
              <li>• Post Published - When posts are published to social platforms</li>
              <li>• Drafts Ready - When monthly drafts are ready for approval</li>
              <li>• Social Disconnected - When social connections need reconnection</li>
              <li>• Brand Added/Deleted - Brand management notifications</li>
              <li>• Team Invite - New and existing user invitations</li>
              <li>• Invoice Paid - Payment confirmations</li>
              <li>• Password Reset - Account recovery emails</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-gray-900">Notifications Sent</h2>
        <p className="mt-1 text-sm text-gray-500">Audit system notifications</p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        {error && (
          <div className="p-4 text-center text-red-600">{error}</div>
        )}
        
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No notifications found.</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date/Time Sent
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Brand
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Notification Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Recipient
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {notifications.map((notif) => (
                <tr key={notif.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDateTime(notif.sent_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {notif.brand_name || '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getNotificationTypeBadge(notif.notification_type)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {notif.recipient || '—'}
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
