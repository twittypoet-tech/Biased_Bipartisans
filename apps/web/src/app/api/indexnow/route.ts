import { NextResponse } from 'next/server'
import { notifyIndexNow } from '@/lib/indexnow'

/**
 * POST /api/indexnow
 * Body: { slugs: string[] }
 *
 * Pings IndexNow for the given news report slugs.
 * Call this after publishing news reports to get instant Bing/Yandex indexing.
 */
export async function POST(request: Request) {
  const apiKey = request.headers.get('x-api-key')
  if (apiKey !== process.env.INTERNAL_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { slugs?: string[] }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const slugs = body.slugs
  if (!slugs?.length) {
    return NextResponse.json({ error: 'No slugs provided' }, { status: 400 })
  }

  const urls = slugs.map(slug => `/news/${slug}`)
  await notifyIndexNow(urls)

  return NextResponse.json({ ok: true, pinged: urls.length })
}
