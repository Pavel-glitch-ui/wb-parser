import { NextResponse } from 'next/server';
import { executeSerpCollection } from '@/features/trigger-collection/model/collect-serp.server';

export async function handleCollectRequest(): Promise<NextResponse> {
  try {
    const summary = await executeSerpCollection();
    return NextResponse.json({ ok: true, summary });
  } catch (error: any) {
    console.error('API /api/collect error:', error);
    return NextResponse.json(
      { ok: false, error: error?.message || 'Internal collection error' },
      { status: 500 }
    );
  }
}
