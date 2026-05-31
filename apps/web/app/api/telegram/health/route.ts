import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get('secret') !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token   = process.env.TELEGRAM_BOT_TOKEN;
  const whSec   = process.env.TELEGRAM_WEBHOOK_SECRET;
  const dbUrl   = process.env.DATABASE_URL;

  const checks = {
    TELEGRAM_BOT_TOKEN:      token   ? '✅ set' : '❌ MISSING',
    TELEGRAM_WEBHOOK_SECRET: whSec   ? '✅ set' : '❌ MISSING',
    DATABASE_URL:            dbUrl   ? '✅ set' : '❌ MISSING',
  };

  // Test Telegram token
  let telegramOk = false;
  if (token) {
    try {
      const res  = await fetch(`https://api.telegram.org/bot${token}/getMe`);
      const data = await res.json() as { ok: boolean; result?: { username: string } };
      telegramOk = data.ok;
      Object.assign(checks, { telegram_bot: telegramOk ? `✅ @${data.result?.username}` : '❌ invalid token' });
    } catch {
      Object.assign(checks, { telegram_bot: '❌ request failed' });
    }
  }

  // Test DB connection
  if (dbUrl) {
    try {
      const { neon } = await import('@neondatabase/serverless');
      const sql = neon(dbUrl);
      await sql`SELECT 1`;
      Object.assign(checks, { database: '✅ connected' });
    } catch (e: unknown) {
      Object.assign(checks, { database: `❌ ${e instanceof Error ? e.message : 'error'}` });
    }
  }

  return NextResponse.json(checks);
}
