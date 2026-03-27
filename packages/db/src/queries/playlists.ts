import type { SupabaseClient } from '@supabase/supabase-js'
import type { UUID } from '@bipi/shared'
import { listDebateParticipants } from './debates'

export interface Playlist {
  id: UUID
  title: string
  slug: string
  description: string
  theme: string
  cover_image_url: string | null
  display_order: number
  is_published: boolean
  created_at: string
  updated_at: string
}

export async function listPublishedPlaylists(db: SupabaseClient): Promise<Playlist[]> {
  const { data, error } = await db
    .from('playlists')
    .select('*')
    .eq('is_published', true)
    .order('display_order', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function getPlaylistBySlug(
  db: SupabaseClient,
  slug: string,
): Promise<Playlist | null> {
  const { data, error } = await db.from('playlists').select('*').eq('slug', slug).single()
  if (error && error.code !== 'PGRST116') throw error
  return data
}

export async function getPlaylistDebates(
  db: SupabaseClient,
  playlistId: UUID,
): Promise<Record<string, unknown>[]> {
  const { data, error } = await db
    .from('playlist_debates')
    .select('position, debates(*)')
    .eq('playlist_id', playlistId)
    .order('position', { ascending: true })
  if (error) throw error
  return (data ?? []).map((row) => ({
    ...(row.debates as unknown as Record<string, unknown>),
    playlist_position: row.position,
  }))
}

export interface PlaylistWithDebates {
  playlist: Playlist
  debates: Record<string, unknown>[]
  participantsMap: Record<UUID, unknown[]>
  debateCount: number
}

export async function getPlaylistWithDebates(
  db: SupabaseClient,
  slug: string,
): Promise<PlaylistWithDebates | null> {
  const playlist = await getPlaylistBySlug(db, slug)
  if (!playlist) return null

  const debates = await getPlaylistDebates(db, playlist.id)
  const debateIds = debates.map((d) => d.id as UUID)
  const participantsMap = debateIds.length > 0
    ? await listDebateParticipants(db, debateIds)
    : {}

  return {
    playlist,
    debates,
    participantsMap,
    debateCount: debates.length,
  }
}

export async function getPlaylistDebateCount(
  db: SupabaseClient,
  playlistId: UUID,
): Promise<number> {
  const { count, error } = await db
    .from('playlist_debates')
    .select('*', { count: 'exact', head: true })
    .eq('playlist_id', playlistId)
  if (error) throw error
  return count ?? 0
}
