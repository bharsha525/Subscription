/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Upload,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  Download,
  RotateCcw,
  Check,
  ShieldCheck
} from 'lucide-react';
import { BankStatementRow, Invoice } from '../types/index.ts';
import { formatINR } from '../utils/finance.ts';
import { useAuth } from '../context/AuthContext.tsx';

interface ReconciliationViewProps {
  onNavigate: (view: string) => void;
}

export const ReconciliationView: React.FC<ReconciliationViewProps> = ({ onNavigate }) => {
  const { isStaff } = useAuth();
  const [rows, setRows] = useState<BankStatementRow[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvingRowId, setApprovingRowId] = useState<string | null>(null);
  const [lastRefreshTime, setLastRefreshTime] = useState<string>(new Date().toLocaleTimeString());
  const [refreshError, setRefreshError] = useState<string>('');

  const fetchReconciliationData = async () => {
    try {
      setLoading(true);
      setRefreshError('');
      const [resRows, resInvs] = await Promise.all([
        fetch('/api/reconciliation/statement'),
        fetch('/api/invoices'),
      ]);

      if (!resRows.ok || !resInvs.ok) {
        throw new Error('Failed to retrieve statement records from server.');
      }

      const dataRows = await resRows.json();
      const dataInvs = await resInvs.json();

      setRows(dataRows.rows || []);
      setInvoices(dataInvs.invoices || []);
      setLastRefreshTime(new Date().toLocaleTimeString());
    } catch (err: any) {
      console.error('Failed to load reconciliation rows', err);
      setRefreshError(err.message || 'Error occurred while refreshing reconciliation records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReconciliationData();
  }, []);

  const handleApproveMatch = async (row: BankStatementRow) => {
    if (!row.matchedInvoiceId) return;
    try {
      setApprovingRowId(row.id);
      const res = await fetch('/api/reconciliation/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rowId: row.id,
          invoiceId: row.matchedInvoiceId,
        }),
      });
      if (res.ok) {
        await fetchReconciliationData();
      }
    } catch (err) {
      console.error('Error approving match', err);
    } finally {
      setApprovingRowId(null);
    }
  };

  // Metric counts (Section 4E)
  const matchedCount = rows.filter(r => r.matchStatus === 'Matched' || r.matchedInvoiceId).length;
  const partiallyMatchedCount = rows.filter(r => r.matchStatus === 'Needs Review').length;
  const unmatchedCount = rows.filter(r => r.matchStatus === 'Unmatched' && !r.matchedInvoiceId).length;

  // Sample CSV Downloader
  const downloadSampleCSV = () => {
    const csvContent = "Date,Description,Reference,Amount,Type\n" +
      "2026-10-20,UPI/293847291039/ACME INFOTECH/HDFC,UPI/293847291039/HDFC,53100.00,Credit\n" +
      "2026-10-26,NEFT/ZENITH TECH/CMS82910283/AXIS,CMS82910283,53100.00,Credit\n" +
      "2026-10-29,IMPS/RET/REF9820192837/UNKNOWN,REF9820192837,12500.00,Credit\n";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'sample_hdfc_statement_oct2026.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            Bank Statement Reconciliation
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Automated three-way matching (Amount, Reference, Date). Segregated transactions until authorized.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
            Last refreshed: {lastRefreshTime}
          </span>
          <button
            onClick={downloadSampleCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Sample CSV</span>
          </button>
          <button
            onClick={fetchReconciliationData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh reconciliation records"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-teal-600' : ''}`} />
            <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Error message banner */}
      {refreshError && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs flex items-center justify-between">
          <span>{refreshError}</span>
          <button onClick={() => setRefreshError('')} className="text-rose-600 font-bold ml-2">✕</button>
        </div>
      )}

      {/* Summary KPI Strip (Section 4E) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium">Matched Transactions</span>
            <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
              {matchedCount}
            </div>
          </div>
          <span className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600">
            <CheckCircle className="w-4 h-4" />
          </span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium">Needs Review / Partial</span>
            <div className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-0.5">
              {partiallyMatchedCount}
            </div>
          </div>
          <span className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600">
            <AlertCircle className="w-4 h-4" />
          </span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium">Unmatched Transactions</span>
            <div className="text-xl font-bold font-mono text-slate-800 dark:text-slate-200 mt-0.5">
              {unmatchedCount}
            </div>
          </div>
          <span className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500">
            <HelpCircle className="w-4 h-4" />
          </span>
        </div>
      </div>

      {/* Statement Reconciliation Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-slate-500">
              <tr>
                <th className="py-3 px-4 font-semibold">Bank Date</th>
                <th className="py-3 px-4 font-semibold">Statement Description & Reference</th>
                <th className="py-3 px-4 font-semibold text-right">Credit (INR)</th>
                <th className="py-3 px-4 font-semibold">System Match Prediction</th>
                <th className="py-3 px-3 font-semibold text-center">Confidence</th>
                <th className="py-3 px-3 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {rows.map(row => (
                <tr key={row.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                  <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">{row.date}</td>
                  <td className="py-3 px-4">
                    <div className="font-medium text-slate-800 dark:text-slate-200 font-mono text-[11px]">{row.description}</div>
                    <div className="text-[11px] text-slate-400 font-mono">Ref: {row.reference}</div>
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    +{formatINR(row.amountPaise)}
                  </td>
                  <td className="py-3 px-4">
                    {row.matchedCustomerName ? (
                      <div>
                        <div className="font-semibold text-slate-800 dark:text-slate-200">{row.matchedCustomerName}</div>
                        <div className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400">Linked to {row.matchedInvoiceId}</div>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">No automated match found</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span
                      className={`font-mono font-semibold text-xs ${
                        (row.confidencePercent || 0) >= 90
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : (row.confidencePercent || 0) >= 70
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-slate-400'
                      }`}
                    >
                      {row.confidencePercent || 0}%
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded text-[11px] font-semibold ${
                        row.approved
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                          : row.matchStatus === 'Needs Review'
                          ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      {row.approved ? 'Reconciled ✓' : row.matchStatus}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    {!row.approved && row.matchedInvoiceId && isStaff && (
                      <button
                        onClick={() => handleApproveMatch(row)}
                        disabled={approvingRowId === row.id}
                        className="flex items-center gap-1 ml-auto px-3 py-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{approvingRowId === row.id ? 'Settling...' : 'Approve Match'}</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
