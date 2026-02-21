'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ChevronLeft, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

function getStatusReason(lead) {
  const status = lead?.status;
  const code = lead?.api_response_code;
  const retries = lead?.retry_count ?? 0;
  if (status === 'completed') return 'Lead was validated, qualified, and successfully dispatched to the external API.';
  if (status === 'validation_failed') return 'Validation failed: invalid email format, message too short (min 15 characters), or source not allowed (must be facebook, google, or website).';
  if (status === 'api_failed') return `Dispatch to external API failed after ${retries} retry attempt(s). The lead was saved and qualified but the third-party endpoint did not respond successfully.`;
  if (status === 'received') return 'Lead was received and passed validation. Awaiting qualification and dispatch.';
  if (status === 'qualified') return 'Lead was qualified (priority set). Awaiting dispatch to external API.';
  return 'Unknown status.';
}

function Badge({ status, isDarkMode }) {
  const map = {
    completed: { label: 'Completed', icon: CheckCircle2, class: isDarkMode ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    api_failed: { label: 'API Failed', icon: XCircle, class: isDarkMode ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-rose-50 text-rose-700 border-rose-200' },
    validation_failed: { label: 'Validation Failed', icon: AlertCircle, class: isDarkMode ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 'bg-orange-50 text-orange-700 border-orange-200' },
    received: { label: 'Received', class: isDarkMode ? 'bg-slate-500/10 text-slate-400 border-slate-500/20' : 'bg-slate-50 text-slate-600 border-slate-200' },
    qualified: { label: 'Qualified', class: isDarkMode ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  };
  const c = map[status] || { label: status || '—', class: isDarkMode ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-slate-50 text-slate-500 border-slate-200' };
  const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs border font-medium ${c.class}`}>
      {Icon && <Icon size={12} />}
      {c.label}
    </span>
  );
}

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDarkMode] = useState(false);

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    async function fetchLead() {
      if (!supabase) {
        setError('Supabase not configured');
        setLoading(false);
        return;
      }
      try {
        const { data, err } = await supabase.from('leads').select('*').eq('id', id).single();
        if (err) throw err;
        if (mounted) setLead(data);
      } catch (e) {
        if (mounted) setError(e.message || 'Lead not found');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchLead();
    return () => { mounted = false; };
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <p className="text-slate-500">Loading lead…</p>
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center max-w-md">
          <p className="text-rose-600 font-medium mb-4">{error || 'Lead not found'}</p>
          <Link href="/" className="text-indigo-600 hover:underline text-sm">Back to dashboard</Link>
        </div>
      </div>
    );
  }

  const reason = getStatusReason(lead);
  const created = lead.created_at ? new Date(lead.created_at).toLocaleString() : '—';
  const updated = lead.updated_at ? new Date(lead.updated_at).toLocaleString() : '—';

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900">
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 md:px-8 py-4 flex items-center gap-4">
          <Link
            href="/"
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors inline-flex items-center gap-1 text-sm font-medium"
          >
            <ChevronLeft size={18} /> Back
          </Link>
          <h1 className="text-lg font-bold">Lead details</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 md:px-8 py-8">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-xl font-bold text-slate-900">{lead.name}</h2>
            <p className="text-sm text-slate-500 mt-0.5">{lead.email}</p>
            <div className="mt-3">
              <Badge status={lead.status} isDarkMode={isDarkMode} />
              <span className="ml-2 text-xs text-slate-500">Priority: {lead.priority || 'normal'}</span>
            </div>
          </div>

          <dl className="divide-y divide-slate-100">
            <div className="px-6 py-4">
              <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</dt>
              <dd className="mt-1 text-sm text-slate-900">{lead.email}</dd>
            </div>
            <div className="px-6 py-4">
              <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</dt>
              <dd className="mt-1 text-sm text-slate-900">{lead.name}</dd>
            </div>
            <div className="px-6 py-4">
              <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Message</dt>
              <dd className="mt-1 text-sm text-slate-900 whitespace-pre-wrap">{lead.message || '—'}</dd>
            </div>
            <div className="px-6 py-4">
              <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Source</dt>
              <dd className="mt-1 text-sm text-slate-900">{lead.source || '—'}</dd>
            </div>
            <div className="px-6 py-4">
              <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Priority</dt>
              <dd className="mt-1 text-sm text-slate-900">{lead.priority || 'normal'}</dd>
            </div>
            <div className="px-6 py-4">
              <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</dt>
              <dd className="mt-1"><Badge status={lead.status} isDarkMode={isDarkMode} /></dd>
            </div>
            <div className="px-6 py-4">
              <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wider">API response code</dt>
              <dd className="mt-1 text-sm font-mono text-slate-900">{lead.api_response_code ?? '—'}</dd>
            </div>
            <div className="px-6 py-4">
              <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Retry count</dt>
              <dd className="mt-1 text-sm text-slate-900">{lead.retry_count ?? 0}</dd>
            </div>
            <div className="px-6 py-4">
              <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Created</dt>
              <dd className="mt-1 text-sm text-slate-600">{created}</dd>
            </div>
            <div className="px-6 py-4">
              <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Updated</dt>
              <dd className="mt-1 text-sm text-slate-600">{updated}</dd>
            </div>
          </dl>

          <div className={`p-6 border-t ${lead.status === 'completed' ? 'bg-emerald-50 border-emerald-100' : lead.status === 'api_failed' || lead.status === 'validation_failed' ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 border-slate-100'}`}>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Why it {lead.status === 'completed' ? 'succeeded' : 'failed'}</h3>
            <p className="text-sm text-slate-700">{reason}</p>
          </div>
        </div>
      </main>
    </div>
  );
}
