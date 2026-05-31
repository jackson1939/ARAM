import { NextRequest } from 'next/server';
import { handleTelegramUpdate } from '@/lib/bot-engine';

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-telegram-bot-api-secret-token');
  if (secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return new Response('ok');
  }
  const update = await req.json();
  handleTelegramUpdate(update).catch(console.error);
  return new Response('ok');
}
