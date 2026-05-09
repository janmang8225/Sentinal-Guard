// import { NextResponse } from 'next/server';
// import { getWatcherHttpUrl } from '@/lib/watcher';

// export async function GET() {
//   try {
//     const upstream = await fetch(`${getWatcherHttpUrl()}/config`, { cache: 'no-store' });
//     if (!upstream.ok) {
//       return NextResponse.json({ error: 'Watcher config request failed' }, { status: upstream.status });
//     }

//     return NextResponse.json(await upstream.json());
//   } catch {
//     return NextResponse.json({ error: 'Watcher unavailable' }, { status: 503 });
//   }
// }



import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    program_id: process.env.NEXT_PUBLIC_PROGRAM_ID,
    rpc_url: process.env.NEXT_PUBLIC_SOLANA_RPC,
    environment: 'devnet',
  });
}