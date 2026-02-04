'use client';

import { useState } from 'react';
import type { ConnectedAccount, DisconnectedAccount, ExpiringAccount } from './useSystemHealth';
import ExpandableMetricCard from './ExpandableMetricCard';

interface SocialHealthSectionProps {
  connected: number;
  disconnected: number;
  expiringSoon: number;
  connectedAccounts: ConnectedAccount[];
  disconnectedAccounts: DisconnectedAccount[];
  expiringAccounts: ExpiringAccount[];
}

function formatDate(value: string | null) {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  } catch {
    return '—';
  }
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    expired: 'bg-amber-100 text-amber-700',
    revoked: 'bg-rose-100 text-rose-700',
    error: 'bg-rose-100 text-rose-700',
    disconnected: 'bg-rose-100 text-rose-700',
  };
  const cls = styles[status] || 'bg-gray-100 text-gray-700';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {status}
    </span>
  );
}

export default function SocialHealthSection({
  connected,
  disconnected,
  expiringSoon,
  connectedAccounts,
  disconnectedAccounts,
  expiringAccounts,
}: SocialHealthSectionProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  function toggle(key: string) {
    setExpanded(prev => prev === key ? null : key);
  }

  return (
    <section>
      <h2 className="mb-4 border-b border-gray-200 pb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
        Social Connections
      </h2>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <ExpandableMetricCard
          label="Connected"
          value={connected}
          color="text-emerald-600"
          expandable={connectedAccounts.length > 0}
          expanded={expanded === 'connected'}
          onClick={() => toggle('connected')}
        />
        <ExpandableMetricCard
          label="Disconnected"
          value={disconnected}
          color={disconnected > 0 ? 'text-rose-600' : 'text-gray-900'}
          expandable={disconnectedAccounts.length > 0}
          expanded={expanded === 'disconnected'}
          onClick={() => toggle('disconnected')}
        />
        <ExpandableMetricCard
          label="Expiring Soon"
          value={expiringSoon}
          color={expiringSoon > 0 ? 'text-amber-600' : 'text-gray-900'}
          expandable={expiringAccounts.length > 0}
          expanded={expanded === 'expiring'}
          onClick={() => toggle('expiring')}
        />
      </div>

      {/* Connected accounts table */}
      {expanded === 'connected' && connectedAccounts.length > 0 && (
        <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Brand</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Provider</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Handle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {connectedAccounts.map((account) => (
                <tr key={account.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">{account.brand_name}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500 capitalize">{account.provider}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">{account.handle || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Disconnected accounts table */}
      {expanded === 'disconnected' && disconnectedAccounts.length > 0 && (
        <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Brand</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Provider</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Handle</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Since</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {disconnectedAccounts.map((account) => (
                <tr key={account.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">{account.brand_name}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500 capitalize">{account.provider}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">{account.handle || '—'}</td>
                  <td className="whitespace-nowrap px-4 py-3"><StatusBadge status={account.error || 'disconnected'} /></td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">{formatDate(account.disconnected_since)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Expiring accounts table */}
      {expanded === 'expiring' && expiringAccounts.length > 0 && (
        <div className="mt-4 overflow-x-auto rounded-xl border border-amber-200">
          <div className="bg-amber-50 px-4 py-2 border-b border-amber-200">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-600">Expiring Soon</p>
          </div>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Brand</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Provider</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Handle</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Expires</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {expiringAccounts.map((account) => (
                <tr key={account.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">{account.brand_name}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500 capitalize">{account.provider}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">{account.handle || '—'}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-amber-600">{formatDate(account.token_expires_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
