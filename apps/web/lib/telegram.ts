const TOKEN = process.env.TELEGRAM_BOT_TOKEN;

function apiUrl(method: string): string {
  return `https://api.telegram.org/bot${TOKEN}/${method}`;
}

async function call(method: string, body: Record<string, unknown>): Promise<unknown> {
  const res = await fetch(apiUrl(method), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Telegram ${method} failed ${res.status}: ${text}`);
  }
  const json = (await res.json()) as { ok: boolean; result: unknown };
  return json.result;
}

export async function sendMessage(
  chatId: number,
  text: string,
  extra?: Record<string, unknown>,
): Promise<{ message_id: number }> {
  return call('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    ...extra,
  }) as Promise<{ message_id: number }>;
}

export async function editMessageText(
  chatId: number,
  messageId: number,
  text: string,
  extra?: Record<string, unknown>,
): Promise<void> {
  await call('editMessageText', {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: 'HTML',
    ...extra,
  });
}

export async function answerCallbackQuery(callbackQueryId: string, text?: string): Promise<void> {
  await call('answerCallbackQuery', {
    callback_query_id: callbackQueryId,
    ...(text ? { text } : {}),
  });
}

export async function getFilePath(fileId: string): Promise<string> {
  const result = (await call('getFile', { file_id: fileId })) as { file_path: string };
  return result.file_path;
}

export async function downloadTelegramFile(filePath: string): Promise<Buffer> {
  const url = `https://api.telegram.org/file/bot${TOKEN}/${filePath}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download Telegram file: ${res.status}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

export async function sendChatAction(
  chatId: number,
  action: 'typing' | 'upload_photo',
): Promise<void> {
  await call('sendChatAction', { chat_id: chatId, action });
}

export function confirmKeyboard(): {
  inline_keyboard: { text: string; callback_data: string }[][];
} {
  return {
    inline_keyboard: [
      [
        { text: 'Confirmar ✅', callback_data: 'confirmar' },
        { text: 'Cancelar ❌', callback_data: 'cancelar' },
      ],
    ],
  };
}
