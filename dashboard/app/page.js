'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function DashboardPage() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchLeads() {
      if (!supabase) {
        setError('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
        setLoading(false);
        return;
      }
      try {
        const { data, error: err } = await supabase
          .from('leads')
          .select('id, name, email, priority, status, api_response_code, retry_count, created_at')
          .order('created_at', { ascending: false });
        if (err) throw err;
        setLeads(data ?? []);
      } catch (e) {
        setError(e.message || 'Failed to load leads');
      } finally {
        setLoading(false);
      }
    }
    fetchLeads();
  }, []);

  if (loading) {
    return (
      <main style={mainStyle}>
        <h1 style={h1Style}>Lead System Admin</h1>
        <p style={pStyle}>Loading leads…</p>
      </main>
    );
  }

  if (error) {
    return (
      <main style={mainStyle}>
        <h1 style={h1Style}>Lead System Admin</h1>
        <p style={errorStyle}>{error}</p>
      </main>
    );
  }

  return (
    <main style={mainStyle}>
      <h1 style={h1Style}>Lead System Admin</h1>
      <p style={pStyle}>Live data from database. Total: {leads.length} leads.</p>
      <div style={tableWrapStyle}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Email</th>
              <th style={thStyle}>Priority</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>API Code</th>
              <th style={thStyle}>Retries</th>
              <th style={thStyle}>Created</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((row) => (
              <tr key={row.id} style={trStyle}>
                <td style={tdStyle}>{row.name}</td>
                <td style={tdStyle}>{row.email}</td>
                <td style={tdStyle}>{row.priority ?? '—'}</td>
                <td style={tdStyle}>{row.status ?? '—'}</td>
                <td style={tdStyle}>{row.api_response_code ?? '—'}</td>
                <td style={tdStyle}>{row.retry_count ?? 0}</td>
                <td style={tdStyle}>
                  {row.created_at
                    ? new Date(row.created_at).toLocaleString()
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

const mainStyle = { maxWidth: 1200, margin: '0 auto', padding: 24 };
const h1Style = { fontSize: '1.5rem', fontWeight: 600, marginBottom: 8 };
const pStyle = { color: '#555', marginBottom: 16 };
const errorStyle = { color: '#c00', marginBottom: 16 };
const tableWrapStyle = { overflowX: 'auto', background: '#fff', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' };
const tableStyle = { width: '100%', borderCollapse: 'collapse' };
const thStyle = { textAlign: 'left', padding: '12px 16px', borderBottom: '1px solid #eee', fontWeight: 600, fontSize: '0.875rem' };
const trStyle = { borderBottom: '1px solid #eee' };
const tdStyle = { padding: '12px 16px', fontSize: '0.875rem' };
