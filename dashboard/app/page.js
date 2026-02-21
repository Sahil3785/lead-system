'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  RefreshCw,
  Download,
  MoreHorizontal,
  Plus,
  LayoutDashboard,
  Users,
  Settings,
  Bell,
  Trash2,
  ChevronRight,
  ShieldCheck,
  Moon,
  Sun,
  Database,
  Key,
  Globe,
  Copy,
  Eye,
  EyeOff,
  ChevronLeft,
  Check,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Lock,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

const SECURITY_PASSWORD = '1234';
const STORAGE_SECURITY_UNLOCKED = 'leadflow_security_unlocked';
const STORAGE_API_KEY_OVERRIDE = 'leadflow_api_key_override';

function getStatusReason(lead) {
  const status = lead?.status;
  const retries = lead?.retries ?? 0;
  if (status === 'completed') return 'Lead was validated, qualified, and successfully dispatched to the external API.';
  if (status === 'validation_failed') return 'Validation failed: invalid email, message too short, or source not allowed (facebook, google, website).';
  if (status === 'api_failed') return `Dispatch to external API failed after ${retries} retry attempt(s).`;
  if (status === 'received') return 'Lead received and passed validation. Awaiting qualification and dispatch.';
  if (status === 'qualified') return 'Lead qualified. Awaiting dispatch.';
  return 'Unknown status.';
}

function maskKey(key) {
  if (!key || key.length < 8) return '••••••••';
  return key.slice(0, 7) + '••••••••••••' + key.slice(-4);
}

function mapRowToLead(row) {
  return {
    id: row.id,
    name: row.name ?? '',
    email: row.email ?? '',
    priority: row.priority || 'normal',
    status: row.status || 'received',
    apiCode: row.api_response_code != null ? String(row.api_response_code) : '—',
    retries: row.retry_count ?? 0,
    created: row.created_at ? new Date(row.created_at).toLocaleString() : '—',
  };
}

const Badge = ({ variant, children, isDarkMode }) => {
  const variants = {
    completed: isDarkMode ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200',
    api_failed: isDarkMode ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-rose-50 text-rose-700 border-rose-200',
    validation_failed: isDarkMode ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 'bg-orange-50 text-orange-700 border-orange-200',
    high: isDarkMode ? 'bg-red-500/10 text-red-400 border-red-500/20 font-bold' : 'bg-red-50 text-red-700 border-red-200 font-bold',
    normal: isDarkMode ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-blue-50 text-blue-700 border-blue-200',
    low: isDarkMode ? 'bg-slate-500/10 text-slate-400 border-slate-500/20' : 'bg-slate-50 text-slate-600 border-slate-200',
    received: isDarkMode ? 'bg-slate-500/10 text-slate-400 border-slate-500/20' : 'bg-slate-50 text-slate-600 border-slate-200',
    qualified: isDarkMode ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'bg-indigo-50 text-indigo-700 border-indigo-200',
    default: isDarkMode ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-slate-50 text-slate-500 border-slate-200',
  };
  const icons = {
    completed: <CheckCircle2 size={12} />,
    api_failed: <XCircle size={12} />,
    validation_failed: <AlertCircle size={12} />,
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[11px] border font-medium inline-flex items-center gap-1.5 shadow-sm transition-colors ${variants[variant] || variants.default}`}>
      {icons[variant]}
      {children}
    </span>
  );
};

const Button = ({ variant = 'primary', size = 'md', children, onClick, className = '', isLoading = false, icon: Icon, isDarkMode, disabled }) => {
  const baseStyles = 'inline-flex items-center justify-center rounded-md font-medium transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:pointer-events-none disabled:opacity-50 select-none';
  const variants = {
    primary: isDarkMode ? 'bg-slate-50 text-slate-900 shadow hover:bg-slate-200' : 'bg-slate-900 text-slate-50 shadow hover:bg-slate-800',
    outline: isDarkMode ? 'border border-slate-700 bg-slate-900 text-slate-300 shadow-sm hover:bg-slate-800 hover:text-slate-50' : 'border border-slate-200 bg-white shadow-sm hover:bg-slate-50 hover:text-slate-900',
    ghost: isDarkMode ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-50' : 'hover:bg-slate-100 hover:text-slate-900 text-slate-500',
    secondary: isDarkMode ? 'bg-slate-800 text-slate-100 shadow-sm hover:bg-slate-700' : 'bg-slate-100 text-slate-900 shadow-sm hover:bg-slate-200',
    danger: 'bg-rose-50 text-rose-600 hover:bg-rose-100',
  };
  const sizes = {
    sm: 'h-8 px-3 text-xs',
    md: 'h-9 px-4 py-2 text-sm',
    lg: 'h-10 px-8 text-sm',
    icon: 'h-9 w-9',
    none: '',
  };
  return (
    <button onClick={onClick} className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`} disabled={isLoading || disabled}>
      {isLoading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : Icon && <Icon className={`${children ? 'mr-2' : ''} h-4 w-4`} />}
      {children}
    </button>
  );
};

function SidebarItem({ icon: Icon, label, active, onClick, hasDot, isDarkMode }) {
  const activeStyles = isDarkMode ? 'bg-slate-800 text-white shadow-lg shadow-slate-950/50' : 'bg-slate-900 text-white shadow-md shadow-slate-200';
  const inactiveStyles = isDarkMode ? 'text-slate-500 hover:bg-slate-800/50 hover:text-slate-300' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900';
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all group ${active ? activeStyles : inactiveStyles}`}
    >
      <div className="flex items-center gap-3">
        <Icon size={18} className={active ? 'text-white' : isDarkMode ? 'text-slate-600 group-hover:text-slate-300' : 'text-slate-400 group-hover:text-slate-900'} />
        {label}
      </div>
      {hasDot && <div className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-pulse ring-4 ring-rose-500/20" />}
    </button>
  );
}

function StatCard({ title, value, color, isDarkMode }) {
  const colors = {
    slate: isDarkMode ? 'text-slate-200 border-slate-700' : 'text-slate-900 border-slate-100',
    emerald: 'text-emerald-500 border-emerald-500/10',
    rose: 'text-rose-500 border-rose-500/10',
    indigo: 'text-indigo-500 border-indigo-500/10',
  };
  return (
    <div className={`p-5 rounded-2xl border transition-all duration-300 ${isDarkMode ? 'bg-slate-900 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 shadow-sm hover:shadow-md'}`}>
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{title}</p>
      <p className={`text-2xl font-black ${colors[color]}`}>{value}</p>
      <div className="mt-3 flex items-center gap-1.5">
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isDarkMode ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-500'}`}>+12%</span>
        <span className="text-[10px] text-slate-500">vs last hour</span>
      </div>
    </div>
  );
}

function SettingsCard({ icon: Icon, title, desc, action, isDarkMode, onClick }) {
  return (
    <div onClick={onClick} className={`p-4 border rounded-2xl flex items-center justify-between transition-all group cursor-pointer ${isDarkMode ? 'bg-slate-900 border-slate-800 hover:border-indigo-500/30' : 'bg-white border-slate-200 shadow-sm hover:border-indigo-200'}`}>
      <div className="flex items-center gap-4">
        <div className={`p-2.5 rounded-xl transition-colors ${isDarkMode ? 'bg-slate-800 text-slate-500 group-hover:text-indigo-400' : 'bg-slate-50 text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600'}`}>
          <Icon size={20} />
        </div>
        <div>
          <h4 className={`text-sm font-bold transition-colors ${isDarkMode ? 'text-slate-200' : 'text-slate-900'}`}>{title}</h4>
          <p className="text-xs text-slate-500">{desc}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {action ? action : <ChevronRight size={18} className="text-slate-400 group-hover:text-slate-300 transition-colors" />}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('leads');
  const [notifications, setNotifications] = useState([]);
  const [showNotificationDot, setShowNotificationDot] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const router = useRouter();
  const [securityUnlocked, setSecurityUnlocked] = useState(false);
  const [securityPasswordInput, setSecurityPasswordInput] = useState('');
  const [securityPasswordError, setSecurityPasswordError] = useState('');
  const [customApiKey, setCustomApiKey] = useState('');
  const [apiKeyOverride, setApiKeyOverride] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('https://hooks.yourdomain.com/v1/leads');
  const [copyStatus, setCopyStatus] = useState(null);
  const [dismissedNotificationIds, setDismissedNotificationIds] = useState(() => {
    if (typeof window === 'undefined') return [];
    try {
      const s = sessionStorage.getItem('leadflow_dismissed_notifications');
      return s ? JSON.parse(s) : [];
    } catch { return []; }
  });

  const fetchLeads = useCallback(async () => {
    if (!supabase) {
      setFetchError('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
      setLoading(false);
      return;
    }
    try {
      setFetchError(null);
      const { data, error } = await supabase
        .from('leads')
        .select('id, name, email, priority, status, api_response_code, retry_count, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setLeads((data ?? []).map(mapRowToLead));
    } catch (e) {
      setFetchError(e.message || 'Failed to load leads');
      setLeads([]);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  useEffect(() => {
    try {
      const un = sessionStorage.getItem(STORAGE_SECURITY_UNLOCKED);
      if (un === 'true') setSecurityUnlocked(true);
      const override = localStorage.getItem(STORAGE_API_KEY_OVERRIDE);
      if (override) setApiKeyOverride(override);
    } catch (_) {}
  }, []);

  useEffect(() => {
    const failedOnes = leads
      .filter((l) => l.status && (l.status.includes('failed') || l.status === 'completed'))
      .filter((l) => !dismissedNotificationIds.includes(l.id))
      .map((l) => ({
        id: l.id,
        leadId: l.id,
        title: l.status === 'completed' ? 'Lead completed' : 'Request failed',
        message: l.status === 'completed' ? `${l.name} was processed successfully.` : `Lead ${l.name} failed with code ${l.apiCode}`,
        reason: getStatusReason(l),
        time: l.created && l.created !== '—' ? l.created : 'Just now',
        type: l.status === 'api_failed' ? 'error' : l.status === 'validation_failed' ? 'warning' : 'success',
        unread: true,
      }));
    setNotifications(failedOnes);
    if (failedOnes.some((n) => n.type === 'error' || n.type === 'warning')) setShowNotificationDot(true);
  }, [leads, dismissedNotificationIds]);

  const handleCopy = (text) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
    } else {
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopyStatus(text);
    setTimeout(() => setCopyStatus(null), 2000);
  };

  const handleSecurityUnlock = () => {
    if (securityPasswordInput === SECURITY_PASSWORD) {
      setSecurityPasswordError('');
      setSecurityUnlocked(true);
      try {
        sessionStorage.setItem(STORAGE_SECURITY_UNLOCKED, 'true');
      } catch (_) {}
    } else {
      setSecurityPasswordError('Incorrect password.');
    }
  };

  const handleSaveApiKeyOverride = () => {
    const val = customApiKey.trim();
    if (val) {
      try {
        localStorage.setItem(STORAGE_API_KEY_OVERRIDE, val);
        setApiKeyOverride(val);
        setCustomApiKey('');
      } catch (_) {}
    }
  };

  const handleClearApiKeyOverride = () => {
    try {
      localStorage.removeItem(STORAGE_API_KEY_OVERRIDE);
      setApiKeyOverride('');
      setCustomApiKey('');
    } catch (_) {}
  };

  const handleDismissNotification = (leadId) => {
    setDismissedNotificationIds((prev) => {
      const next = prev.includes(leadId) ? prev : [...prev, leadId];
      try {
        sessionStorage.setItem('leadflow_dismissed_notifications', JSON.stringify(next));
      } catch (_) {}
      return next;
    });
    setNotifications((n) => n.filter((x) => x.id !== leadId));
  };

  const originalApiKey = typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    : '';
  const currentKeyDisplay = apiKeyOverride || originalApiKey;
  const isUsingOverride = !!apiKeyOverride;

  const exportToCSV = () => {
    const headers = ['Name,Email,Priority,Status,API Code,Retries,Created'];
    const rows = filteredLeads.map((l) => `${l.name},${l.email},${l.priority},${l.status},${l.apiCode},${l.retries},"${l.created}"`);
    const csvContent = 'data:text/csv;charset=utf-8,' + headers.concat(rows).join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `leads_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchLeads();
  };

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const matchesSearch =
        lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [leads, searchTerm, statusFilter]);

  const getApiStyle = (code) => {
    if (code === '201') return isDarkMode ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/40' : 'bg-emerald-50 text-emerald-700 border-emerald-400';
    if (String(code).startsWith('4')) return isDarkMode ? 'bg-orange-500/10 text-orange-400 border-orange-500/40' : 'bg-orange-50 text-orange-700 border-orange-400';
    if (String(code).startsWith('5')) return isDarkMode ? 'bg-rose-500/10 text-rose-400 border-rose-500/40' : 'bg-rose-50 text-rose-700 border-rose-400';
    return isDarkMode ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-slate-50 text-slate-600 border-slate-300';
  };

  if (loading && leads.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8fafc]">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="h-10 w-10 animate-spin text-slate-400" />
          <p className="text-sm font-medium text-slate-600">Loading leads…</p>
        </div>
      </div>
    );
  }

  if (fetchError && leads.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8fafc] p-6">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center max-w-md">
          <XCircle className="mx-auto h-12 w-12 text-rose-500 mb-4" />
          <h2 className="text-lg font-bold text-rose-900 mb-2">Could not load leads</h2>
          <p className="text-sm text-rose-700 mb-4">{fetchError}</p>
          <p className="text-xs text-slate-500">Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex min-h-screen w-full transition-colors duration-300 antialiased font-sans ${isDarkMode ? 'bg-slate-950 text-slate-50' : 'bg-[#f8fafc] text-slate-950'}`}>
      <aside className={`hidden md:flex w-64 flex-col border-r shadow-sm z-20 transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className={`p-6 border-b flex items-center gap-3 ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
          <div className={`${isDarkMode ? 'bg-indigo-600' : 'bg-slate-900'} text-white p-1.5 rounded-lg shadow-lg rotate-3`}>
            <LayoutDashboard size={22} />
          </div>
          <span className={`font-bold tracking-tight text-xl ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>LeadFlow</span>
        </div>
        <nav className="flex-1 p-4 space-y-2 mt-2">
          <SidebarItem icon={Users} label="Lead Management" active={activeTab === 'leads'} isDarkMode={isDarkMode} onClick={() => setActiveTab('leads')} />
          <SidebarItem
            icon={Bell}
            label="Notifications"
            active={activeTab === 'notifications'}
            isDarkMode={isDarkMode}
            onClick={() => {
              setActiveTab('notifications');
              setShowNotificationDot(false);
            }}
            hasDot={showNotificationDot}
          />
          <SidebarItem icon={Settings} label="Settings" active={activeTab === 'settings' || activeTab === 'security'} isDarkMode={isDarkMode} onClick={() => setActiveTab('settings')} />
        </nav>
        <div className={`p-4 border-t ${isDarkMode ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-slate-50/50'}`}>
          <div className={`flex items-center gap-3 p-2 rounded-xl border transition-colors ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
            <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white text-sm">AS</div>
            <div className="flex flex-col min-w-0">
              <span className={`text-xs font-bold truncate ${isDarkMode ? 'text-slate-200' : 'text-slate-900'}`}>Admin System</span>
              <span className="text-[10px] text-slate-400 truncate tracking-wide">Pro Plan Active</span>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className={`h-16 border-b flex items-center justify-between px-6 shrink-0 z-10 shadow-sm transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800 shadow-slate-950/20' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold tracking-tight capitalize">{activeTab.replace('_', ' ')}</h1>
            <div className={`h-4 w-px hidden sm:block ${isDarkMode ? 'bg-slate-700' : 'bg-slate-200'}`} />
            <span className="text-xs font-medium text-slate-400 hidden sm:block">Overview / Dashboard</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" icon={Download} isDarkMode={isDarkMode} onClick={exportToCSV}>
              Export CSV
            </Button>
            <Button size="sm" icon={Plus} isDarkMode={isDarkMode} className="bg-indigo-600 hover:bg-indigo-700 text-white border-none">
              Add Lead
            </Button>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-8">
          {activeTab === 'leads' && (
            <div className="space-y-6 max-w-7xl mx-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Total Volume" value={leads.length} color="slate" isDarkMode={isDarkMode} />
                <StatCard title="Success Rate" value={leads.length ? `${((leads.filter((l) => l.status === 'completed').length / leads.length) * 100).toFixed(0)}%` : '0%'} color="emerald" isDarkMode={isDarkMode} />
                <StatCard title="API Failures" value={leads.filter((l) => l.status === 'api_failed').length} color="rose" isDarkMode={isDarkMode} />
                <StatCard title="Sync Latency" value="24ms" color="indigo" isDarkMode={isDarkMode} />
              </div>

              <div className={`border rounded-2xl shadow-sm overflow-hidden flex flex-col transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                <div className={`p-4 border-b flex flex-col md:flex-row md:items-center justify-between gap-4 ${isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50/30'}`}>
                  <div className="relative flex-1 max-w-md">
                    <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} size={16} />
                    <input
                      type="text"
                      placeholder="Filter by name, email..."
                      className={`w-full pl-10 pr-4 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-200 placeholder:text-slate-600' : 'bg-white border-slate-200 text-slate-950'}`}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
                    <select
                      className={`text-sm border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-950'}`}
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option value="all">All Status</option>
                      <option value="completed">Completed</option>
                      <option value="api_failed">API Failed</option>
                      <option value="validation_failed">Validation Failed</option>
                      <option value="received">Received</option>
                      <option value="qualified">Qualified</option>
                    </select>
                    <div className={`w-px h-6 ${isDarkMode ? 'bg-slate-700' : 'bg-slate-200'}`} />
                    <Button variant="outline" size="sm" icon={RefreshCw} isDarkMode={isDarkMode} isLoading={isRefreshing} onClick={handleRefresh}>
                      Refresh
                    </Button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className={`border-b transition-colors ${isDarkMode ? 'bg-slate-900/80 text-slate-400 border-slate-800' : 'bg-slate-50/50 text-slate-500 border-slate-100'}`}>
                        <th className="px-6 py-4 font-semibold">Lead Info</th>
                        <th className="px-6 py-4 font-semibold">Priority</th>
                        <th className="px-6 py-4 font-semibold">Status</th>
                        <th className="px-6 py-4 font-semibold">API Code</th>
                        <th className="px-6 py-4 font-semibold text-center">Retries</th>
                        <th className="px-6 py-4 font-semibold text-right">Activity</th>
                        <th className="px-6 py-4" />
                      </tr>
                    </thead>
                    <tbody className={`divide-y transition-colors ${isDarkMode ? 'divide-slate-800' : 'divide-slate-100'}`}>
                      {filteredLeads.map((lead) => (
                        <tr
                          key={lead.id}
                          onClick={() => router.push(`/leads/${lead.id}`)}
                          className={`transition-colors cursor-pointer ${isDarkMode ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50/80'}`}
                        >
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className={`font-bold leading-tight ${isDarkMode ? 'text-slate-200' : 'text-slate-900'}`}>{lead.name}</span>
                              <span className="text-xs text-slate-500">{lead.email}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <Badge variant={lead.priority} isDarkMode={isDarkMode}>{String(lead.priority).toUpperCase()}</Badge>
                          </td>
                          <td className="px-6 py-4">
                            <Badge variant={lead.status} isDarkMode={isDarkMode}>{String(lead.status).replace('_', ' ')}</Badge>
                          </td>
                          <td className="px-6 py-4">
                            <div className={`inline-block px-2 py-0.5 rounded font-mono text-xs font-bold border-l-2 transition-colors ${getApiStyle(lead.apiCode)}`}>
                              {lead.apiCode}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`px-2 py-0.5 rounded-md text-xs font-medium transition-colors ${lead.retries > 0 ? (isDarkMode ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-100 text-amber-700') : (isDarkMode ? 'text-slate-600 bg-slate-800' : 'text-slate-400 bg-slate-50')}`}>
                              {lead.retries}x
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="text-xs font-medium text-slate-500">{lead.created.split(',')[0]}</span>
                          </td>
                          <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <button className={`p-2 rounded-lg transition-all ${isDarkMode ? 'text-slate-600 hover:text-slate-300 hover:bg-slate-800' : 'text-slate-300 hover:text-slate-600 hover:bg-slate-100'}`}>
                              <MoreHorizontal size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="max-w-3xl mx-auto space-y-4">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className={`text-xl font-bold ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>Lead notifications</h2>
                  <p className="text-sm text-slate-500">Real-time lead request outcomes (success and failures)</p>
                </div>
                <Button variant="ghost" size="sm" icon={Trash2} isDarkMode={isDarkMode} onClick={() => { setDismissedNotificationIds([]); try { sessionStorage.removeItem('leadflow_dismissed_notifications'); } catch (_) {} }}>Reset all</Button>
              </div>
              {notifications.length > 0 ? (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`p-4 rounded-2xl border-l-4 border shadow-sm flex items-start gap-4 transition-colors cursor-pointer ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} ${notif.type === 'error' ? 'border-l-rose-500' : notif.type === 'warning' ? 'border-l-amber-500' : 'border-l-emerald-500'}`}
                    onClick={() => router.push(`/leads/${notif.leadId || notif.id}`)}
                  >
                    <div className={`p-2 rounded-full shrink-0 ${notif.type === 'error' ? (isDarkMode ? 'bg-rose-500/10 text-rose-500' : 'bg-rose-50 text-rose-600') : notif.type === 'success' ? (isDarkMode ? 'bg-emerald-500/10 text-emerald-500' : 'bg-emerald-50 text-emerald-600') : (isDarkMode ? 'bg-amber-500/10 text-amber-500' : 'bg-amber-50 text-amber-600')}`}>
                      {notif.type === 'error' ? <XCircle size={18} /> : notif.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className={`font-bold text-sm ${isDarkMode ? 'text-slate-200' : 'text-slate-900'}`}>{notif.title}</h4>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest shrink-0">{notif.time}</span>
                      </div>
                      <p className="text-sm text-slate-500 mt-1">{notif.message}</p>
                      {notif.reason && <p className="text-xs text-slate-500 mt-2 italic">{notif.reason}</p>}
                      <div className="mt-3 flex gap-2" onClick={(e) => e.stopPropagation()}>
                        <Button variant="secondary" size="sm" isDarkMode={isDarkMode} className="h-7 text-[11px]" onClick={() => router.push(`/leads/${notif.leadId || notif.id}`)}>View full details</Button>
                        <Button variant="ghost" size="sm" isDarkMode={isDarkMode} className="h-7 text-[11px]" onClick={() => handleDismissNotification(notif.leadId || notif.id)}>Dismiss</Button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${isDarkMode ? 'bg-slate-900' : 'bg-slate-100'}`}>
                    <Bell className="opacity-20" size={32} />
                  </div>
                  <p className="font-medium">No notifications</p>
                  <p className="text-xs">Lead request alerts will appear here</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="max-w-4xl mx-auto space-y-8">
              <div>
                <h2 className={`text-xl font-bold ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>Platform Settings</h2>
                <p className="text-sm text-slate-500">Configure your data pipelines and security</p>
              </div>
              <div className="grid gap-6">
                <SettingsCard icon={ShieldCheck} title="Security & API" desc="Manage keys, webhooks and IP whitelisting" isDarkMode={isDarkMode} onClick={() => setActiveTab('security')} />
                <SettingsCard icon={Database} title="Data Sync" desc="Frequency: Real-time (Active)" isDarkMode={isDarkMode} action={<Badge variant="completed" isDarkMode={isDarkMode}>Connected</Badge>} />
                <SettingsCard
                  icon={isDarkMode ? Sun : Moon}
                  title="Interface Theme"
                  desc={`Current mode: ${isDarkMode ? 'Dark' : 'Light'}`}
                  isDarkMode={isDarkMode}
                  action={
                    <div
                      className={`w-12 h-6 rounded-full relative p-1 cursor-pointer transition-all duration-300 ${isDarkMode ? 'bg-indigo-600' : 'bg-slate-300'}`}
                      onClick={() => setIsDarkMode(!isDarkMode)}
                      onKeyDown={(e) => e.key === 'Enter' && setIsDarkMode(!isDarkMode)}
                      role="switch"
                      aria-checked={isDarkMode}
                      tabIndex={0}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full shadow-lg transition-transform duration-300 ${isDarkMode ? 'translate-x-6' : 'translate-x-0'}`} />
                    </div>
                  }
                />
              </div>
              <div className={`pt-8 border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                <Button variant="danger" icon={Trash2} isDarkMode={isDarkMode}>Delete All Database Logs</Button>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="max-w-4xl mx-auto space-y-8">
              <div className="flex items-center gap-4 mb-6">
                <button
                  onClick={() => setActiveTab('settings')}
                  className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
                  type="button"
                >
                  <ChevronLeft size={20} />
                </button>
                <div>
                  <h2 className={`text-xl font-bold ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>Security & API Keys</h2>
                  <p className="text-sm text-slate-500">Password required to view and manage API keys</p>
                </div>
              </div>

              {!securityUnlocked ? (
                <div className={`border rounded-2xl shadow-sm p-8 max-w-md ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                  <div className="flex items-center gap-3 mb-6">
                    <Lock size={24} className="text-indigo-500 shrink-0" />
                    <h3 className="font-bold">Enter admin password</h3>
                  </div>
                  <p className="text-sm text-slate-500 mb-4">This page is protected. Enter the admin password to view and update API keys.</p>
                  <input
                    type="password"
                    value={securityPasswordInput}
                    onChange={(e) => { setSecurityPasswordInput(e.target.value); setSecurityPasswordError(''); }}
                    onKeyDown={(e) => e.key === 'Enter' && handleSecurityUnlock()}
                    placeholder="Password"
                    className={`w-full px-4 py-2.5 text-sm border rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:outline-none mb-3 ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-900'}`}
                  />
                  {securityPasswordError && <p className="text-sm text-rose-600 mb-3">{securityPasswordError}</p>}
                  <Button variant="primary" isDarkMode={isDarkMode} onClick={handleSecurityUnlock}>Unlock</Button>
                </div>
              ) : (
                <>
                  <div className={`border rounded-2xl shadow-sm overflow-hidden transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                    <div className={`p-5 border-b flex items-center gap-3 ${isDarkMode ? 'border-slate-800 bg-slate-900/50' : 'border-slate-50 bg-slate-50/50'}`}>
                      <Key size={18} className="text-indigo-500" />
                      <h3 className="font-bold">API Key (from code / environment)</h3>
                    </div>
                    <div className="p-5 space-y-4">
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Original key (read-only)</label>
                        <p className="mt-1 font-mono text-sm text-slate-600 break-all">{originalApiKey ? maskKey(originalApiKey) : 'Not set (check .env)'}</p>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Current key in use</label>
                        <p className="mt-1 font-mono text-sm text-slate-600 break-all">{isUsingOverride ? maskKey(apiKeyOverride) : 'Same as original'}</p>
                        {isUsingOverride && (
                          <Button variant="ghost" size="sm" isDarkMode={isDarkMode} className="mt-2 text-rose-500 hover:bg-rose-500/10" onClick={handleClearApiKeyOverride}>Clear override</Button>
                        )}
                      </div>
                      <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Update API key (override)</label>
                        <p className="text-xs text-slate-500 mt-0.5 mb-2">Set a custom key to use instead of the original. Stored in this browser only.</p>
                        <div className="flex gap-2">
                          <input
                            type="password"
                            value={customApiKey}
                            onChange={(e) => setCustomApiKey(e.target.value)}
                            placeholder="New API key"
                            className={`flex-1 px-4 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:outline-none ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-200'}`}
                          />
                          <Button variant="secondary" isDarkMode={isDarkMode} onClick={handleSaveApiKeyOverride}>Save</Button>
                        </div>
                        {copyStatus && <p className="text-xs text-emerald-600 mt-1">Copied to clipboard</p>}
                        <div className="flex gap-2 mt-2">
                          <Button variant="outline" size="sm" icon={copyStatus === currentKeyDisplay ? Check : Copy} isDarkMode={isDarkMode} className={copyStatus === currentKeyDisplay ? 'text-emerald-500' : ''} onClick={() => { handleCopy(currentKeyDisplay); }} disabled={!currentKeyDisplay}>
                            {copyStatus === currentKeyDisplay ? 'Copied' : 'Copy current key'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className={`border rounded-2xl shadow-sm overflow-hidden transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                <div className={`p-5 border-b flex items-center justify-between ${isDarkMode ? 'border-slate-800 bg-slate-900/50' : 'border-slate-50 bg-slate-50/50'}`}>
                  <div className="flex items-center gap-3">
                    <Globe size={18} className="text-indigo-500" />
                    <h3 className="font-bold">Webhook Configuration</h3>
                  </div>
                  <Badge variant="completed" isDarkMode={isDarkMode}>Active</Badge>
                </div>
                <div className="p-6 space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Endpoint URL</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={webhookUrl}
                        onChange={(e) => setWebhookUrl(e.target.value)}
                        className={`flex-1 px-4 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-200'}`}
                      />
                      <Button variant="secondary" isDarkMode={isDarkMode}>Update</Button>
                    </div>
                    <p className="text-[10px] text-slate-500">We'll send POST requests to this URL for every lead status update.</p>
                  </div>
                  <div className={`pt-4 border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-200'} flex items-center justify-between`}>
                    <div>
                      <h4 className="text-sm font-bold">Signing Secret</h4>
                      <p className="text-xs text-slate-500 font-mono mt-1 opacity-50">whsec_029kLzP...</p>
                    </div>
                    <Button variant="outline" size="sm" isDarkMode={isDarkMode}>Reveal Secret</Button>
                  </div>
                </div>
              </div>

              <div className={`p-6 border rounded-2xl border-dashed transition-colors ${isDarkMode ? 'border-slate-800 bg-slate-900/20' : 'border-slate-200 bg-slate-50/50'}`}>
                <div className="flex flex-col items-center text-center space-y-2">
                  <ShieldCheck size={32} className="text-slate-600 mb-2 opacity-30" />
                  <h3 className="font-bold">IP Access Control</h3>
                  <p className="text-xs text-slate-500 max-w-sm">Restrict API access to specific IP addresses. Currently, access is allowed from all IPs (Global Access).</p>
                  <Button variant="outline" size="sm" isDarkMode={isDarkMode} className="mt-4">Enable Restrictions</Button>
                </div>
              </div>
                </>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
