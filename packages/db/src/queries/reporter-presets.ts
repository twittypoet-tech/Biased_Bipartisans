import type { SupabaseClient } from '@supabase/supabase-js'

export interface ReporterPreset {
  id: string
  title: string
  query_template: string
  category: string | null
  sort_order: number
}

export async function listActiveReporterPresets(
  db: SupabaseClient,
): Promise<ReporterPreset[]> {
  const { data, error } = await db
    .from('reporter_presets')
    .select('id, title, query_template, category, sort_order')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) throw error
  return (data ?? []) as ReporterPreset[]
}
