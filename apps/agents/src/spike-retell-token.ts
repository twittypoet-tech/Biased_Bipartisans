/**
 * Spike: validate that Retell's access_token is a LiveKit JWT
 * and that we can connect server-side as a participant.
 *
 * Run locally:
 *   RETELL_API_KEY=key_xxx RETELL_AGENT_ID=agent_xxx npx tsx src/spike-retell-token.ts
 */

import Retell from 'retell-sdk';
import { Room } from '@livekit/rtc-node';

const RETELL_API_KEY = process.env.RETELL_API_KEY;
const AGENT_ID = process.env.RETELL_AGENT_ID;

if (!RETELL_API_KEY || !AGENT_ID) {
  console.error('Usage: RETELL_API_KEY=key_xxx RETELL_AGENT_ID=agent_xxx npx tsx src/spike-retell-token.ts');
  process.exit(1);
}

function decodeJwt(token: string) {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'));
}

async function main() {
  const retell = new Retell({ apiKey: RETELL_API_KEY! });

  // ── 1. Create web call ─────────────────────────────────────────────────────
  console.log('\n[1] Creating Retell web call...');
  const call = await retell.call.createWebCall({ agent_id: AGENT_ID! });
  console.log('    call_id    :', call.call_id);
  console.log('    call_status:', call.call_status);

  // ── 2. Decode JWT ──────────────────────────────────────────────────────────
  console.log('\n[2] Decoding access_token JWT...');
  const payload = decodeJwt(call.access_token);
  console.log('    Full payload:\n', JSON.stringify(payload, null, 4));

  // LiveKit tokens have: { video: { room, roomJoin }, sub, iss }
  const lkRoom = payload?.video?.room ?? null;
  const lkUrl  = payload?.video?.roomUrl ?? null;  // some LK tokens embed the URL
  const isLiveKit = !!(payload?.video || payload?.sub);

  console.log('\n    LiveKit token?', isLiveKit ? '✅ YES' : '❌ NO');
  console.log('    Room name    :', lkRoom ?? '(not in token)');
  console.log('    Room URL hint:', lkUrl  ?? '(not in token — try wss://retell-ai.livekit.cloud)');

  if (!isLiveKit) {
    console.log('\n❌ Not a LiveKit token. Architecture needs a different audio-capture approach.');
    process.exit(1);
  }

  // ── 3. Try server-side LiveKit connection ──────────────────────────────────
  // The room URL may be embedded in the token or we try known Retell endpoints.
  const candidates = [
    lkUrl,
    'wss://retell-ai.livekit.cloud',
    'wss://retellai.livekit.cloud',
  ].filter(Boolean) as string[];

  console.log('\n[3] Attempting server-side LiveKit connection...');
  for (const url of candidates) {
    console.log(`    Trying ${url} ...`);
    const room = new Room();
    const result = await Promise.race([
      room.connect(url, call.access_token)
        .then(() => ({ ok: true as const }))
        .catch((e: Error) => ({ ok: false as const, err: e.message })),
      new Promise<{ ok: false; err: string }>(res =>
        setTimeout(() => res({ ok: false, err: 'timeout 5s' }), 5000)
      ),
    ]);

    if (result.ok) {
      console.log(`\n✅ CONNECTED to ${url}`);
      const participants = [...room.remoteParticipants.values()].map(p => p.identity);
      console.log('    Remote participants:', participants.length ? participants : '(none yet — agent joining)');
      await room.disconnect();
      console.log('\n✅ Architecture confirmed: server can join Retell call room as a LiveKit participant.');
      return;
    }
    console.log(`    ✗ ${result.err}`);
  }

  console.log('\n⚠️  JWT is LiveKit format but could not connect to any candidate URL.');
  console.log('    Check Retell docs or dashboard for the LiveKit server URL they use.');
  console.log('    The architecture is still viable once the URL is known.');
}

main().catch(console.error);
