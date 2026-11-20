// ─── Supabase REST client (sin SDK, consistente con statsService) ─────────────

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  'https://dwretdtwyqsltylvnvld.supabase.co';

const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  'sb_publishable_h-M2ogKLSXdkZNTnfe83ng_gUjNtKHq';

export const SB_HEADERS = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
};

export function sbUrl(table: string, query = '') {
  return `${SUPABASE_URL}/rest/v1/${table}${query ? `?${query}` : ''}`;
}
