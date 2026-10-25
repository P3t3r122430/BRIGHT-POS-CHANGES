import React, { useState, useEffect } from 'react';
import { AuditLog } from '../../types';
import { api } from '../../lib/api';
import { formatDate } from '../../lib/utils';
import {
  History,
  Search,
  RotateCcw,
  Shield,
  Activity,
  User,
  Clock
} from 'lucide-react';

export const AuditLogsScreen: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [actionFilter, setActionFilter] = useState<string>('all');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      let url = '/audit-logs?limit=150';
      if (actionFilter !== 'all') url += `&action=${actionFilter}`;

      const res = await api.get<{ logs: AuditLog[] }>(url);
      setLogs(res.logs || []);
    } catch (err: any) {
      if (err?.status === 401) return;
      console.warn('Failed to load audit logs:', err?.message || err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter]);

  const filteredLogs = logs.filter((log) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    return (
      log.username.toLowerCase().includes(q) ||
      log.action.toLowerCase().includes(q) ||
      log.description.toLowerCase().includes(q) ||
      log.entity_type.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#0A0A0A] text-[#E5E5E0] space-y-6 custom-scrollbar h-[calc(100vh-57px)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#222222]">
        <div>
          <h2 className="text-lg font-serif-luxury font-medium text-[#E5E5E0] tracking-[0.14em] uppercase flex items-center gap-2.5">
            <History className="w-4 h-4 text-[#C5A059]" /> Immutable Operations Audit Trail
          </h2>
          <p className="text-[11px] text-[#777777] uppercase tracking-[0.2em] mt-1">
            Chronological logging of sales, voids, refunds, catalog modifications, stock adjustments, and logins
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="p-2 bg-[#141414] hover:bg-[#1A1A1A] text-[#888888] hover:text-[#C5A059] rounded border border-[#262626] transition"
        >
          <RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin text-[#C5A059]' : ''}`} />
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-[#0D0D0D] p-3.5 rounded border border-[#222222] text-xs">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#666666] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search audit trail by description, operator, or target..."
              className="w-full pl-9 pr-3 py-1.5 bg-[#141414] border border-[#262626] rounded text-xs text-[#E5E5E0] placeholder-[#555555] focus:outline-none focus:border-[#C5A059]"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3 py-1.5 bg-[#141414] border border-[#262626] rounded text-xs text-[#E5E5E0] focus:outline-none focus:border-[#C5A059]"
          >
            <option value="all">All Operations</option>
            <option value="LOGIN">Operator Authentication</option>
            <option value="CREATE_SALE">Sales Checkout</option>
            <option value="VOID_SALE">Void Authorizations</option>
            <option value="REFUND_SALE">Refund Disbursements</option>
            <option value="ADJUST_STOCK">Stock Adjustments</option>
            <option value="CREATE_PRODUCT">Catalog Additions</option>
            <option value="CREATE_SERVICE">Services Configuration</option>
            <option value="UPDATE_SETTINGS">System Settings Adjustments</option>
          </select>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-[#0D0D0D] border border-[#222222] rounded overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#121212] text-[#777777] uppercase text-[10px] tracking-[0.18em] border-y border-[#1F1F1F]">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Operator</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Entity</th>
                <th className="py-3 px-4">Activity Particulars</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1A1A1A]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-[#555555]">
                    Loading audit trail records...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-[#555555]">
                    No audit records match your query.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#141414] transition">
                    <td className="py-2.5 px-4 font-mono text-[#888888] text-[11px] whitespace-nowrap">
                      {formatDate(log.created_at)}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-[#C5A059] text-[11px] whitespace-nowrap">
                      @{log.username}
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <span
                        className={`text-[9px] font-mono font-medium uppercase tracking-wider px-2 py-0.5 rounded border ${
                          log.action.includes('VOID') || log.action.includes('REFUND')
                            ? 'bg-rose-950/40 text-rose-300 border-rose-900/60'
                            : log.action.includes('SALE')
                            ? 'bg-[#4CAF50]/10 text-[#4CAF50] border-[#4CAF50]/30'
                            : log.action.includes('STOCK')
                            ? 'bg-[#C5A059]/10 text-[#C5A059] border-[#C5A059]/40'
                            : 'bg-[#181818] text-[#AAAAAA] border-[#282828]'
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-mono text-[#777777] whitespace-nowrap text-[11px]">
                      {log.entity_type} {log.entity_id ? `#${log.entity_id}` : ''}
                    </td>
                    <td className="py-2.5 px-4 text-[#E5E5E0]">{log.description}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
