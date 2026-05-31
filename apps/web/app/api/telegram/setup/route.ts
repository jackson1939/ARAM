import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get('secret') !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const token = process.env.TELEGRAM_BOT_TOKEN;

  const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: `${appUrl}/api/webhook/telegram`,
      secret_token: process.env.TELEGRAM_WEBHOOK_SECRET,
      allowed_updates: ['message', 'callback_query'],
    }),
  });

  const data = await res.json();
  return NextResponse.json(data);
}
