const INDEXNOW_KEY = 'b996c386d7414b6c853eeeace5933ce0'
const HOST = 'bipinews.com'

/**
 * Ping IndexNow (Bing, Yandex, Seznam, Naver) to instantly index a URL.
 * Call this after publishing a news report.
 */
export async function notifyIndexNow(urls: string | string[]): Promise<void> {
  const urlList = Array.isArray(urls) ? urls : [urls]

  try {
    await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        host: HOST,
        key: INDEXNOW_KEY,
        keyLocation: `https://${HOST}/${INDEXNOW_KEY}.txt`,
        urlList: urlList.map(u => u.startsWith('http') ? u : `https://${HOST}${u}`),
      }),
    })
  } catch {
    // IndexNow is best-effort — don't let failures break publishing
  }
}
