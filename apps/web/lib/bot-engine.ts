import { db, mensajesRecolector, extracciones, recolectores, conversaciones } from '@fundares/db';
import { eq, and } from 'drizzle-orm';
import {
  sendMessage,
  editMessageText,
  answerCallbackQuery,
  getFilePath,
  downloadTelegramFile,
  confirmKeyboard,
} from '@/lib/telegram';
import { identifyText, identifyBuffer, type ExtractionResult } from '@/lib/identification-client';
import type { ConversacionContexto } from '@fundares/db';

// ── Telegram types ────────────────────────────────────────────────────────────

interface TelegramUser {
  id: number;
  first_name: string;
  username?: string;
}
interface TelegramChat {
  id: number;
}
interface TelegramPhotoSize {
  file_id: string;
  width: number;
  height: number;
}
interface TelegramVideo {
  file_id: string;
  mime_type?: string;
  duration: number;
}
interface TelegramDocument {
  file_id: string;
  mime_type?: string;
}
interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  text?: string;
  caption?: string;
  photo?: TelegramPhotoSize[];
  video?: TelegramVideo;
  document?: TelegramDocument;
}
interface TelegramCallbackQuery {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  data?: string;
}
export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

// ── Pending extraction shape ───────────────────────────────────────────────────

interface PendingExtraction {
  empresa: string | null;
  fecha: string | null;
  materiales: { tipo: string; cantidad: number | null; unidad: string | null }[];
  notas: string | null;
  confianza: 'high' | 'medium' | 'low';
  textoOriginal: string;
  description?: string;
}

// ── HTML helpers ──────────────────────────────────────────────────────────────

function esc(str: string | null | undefined): string {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function mapConfianza(c: 'high' | 'medium' | 'low'): string {
  return c === 'high' ? '0.9' : c === 'medium' ? '0.6' : '0.3';
}

function confianzaBadge(c: 'high' | 'medium' | 'low'): string {
  return c === 'high' ? '🟢 Alta' : c === 'medium' ? '🟡 Media' : '🔴 Baja';
}

function formatSuccess(pending: PendingExtraction): string {
  const materialesLines = pending.materiales
    .map((m) => {
      const qty = m.cantidad !== null ? `${m.cantidad} ${m.unidad ?? ''}`.trim() : 'sin cantidad';
      return `  • ${esc(m.tipo)}: ${qty}`;
    })
    .join('\n');

  const empresa = pending.empresa ? esc(pending.empresa) : '<i>no detectada</i>';
  const fecha = pending.fecha ? esc(pending.fecha) : '<i>no detectada</i>';

  return [
    '📦 <b>Datos extraídos</b>\n',
    `<b>Empresa:</b> ${empresa}`,
    `<b>Fecha:</b> ${fecha}`,
    `<b>Materiales:</b>\n${materialesLines || '  (ninguno)'}`,
    pending.notas ? `<b>Notas:</b> ${esc(pending.notas)}` : '',
    `<b>Confianza IA:</b> ${confianzaBadge(pending.confianza)}`,
    '',
    '¿Confirmás esta recolección?',
  ]
    .filter((l) => l !== '')
    .join('\n');
}

function formatRejection(result: ExtractionResult): string {
  const reasons =
    result.rejectedReasons && result.rejectedReasons.length > 0
      ? result.rejectedReasons.map((r) => `  • ${esc(r)}`).join('\n')
      : '  • No se pudo interpretar el contenido.';

  const desc = result.description ? `\n\n${esc(result.description)}` : '';

  return [
    '❌ <b>No se pudo extraer la información</b>',
    '',
    '<b>Motivos:</b>',
    reasons,
    desc,
    '',
    '<i>Intentá enviar el mensaje de nuevo con más detalle, o una foto más clara.</i>',
  ].join('\n');
}

// ── DB helpers ────────────────────────────────────────────────────────────────

async function getOrCreateRecolector(telegramUserId: string, firstName: string) {
  const existing = await db()
    .select()
    .from(recolectores)
    .where(eq(recolectores.telegramChatId, telegramUserId))
    .limit(1);

  if (existing[0]) return existing[0];

  const [created] = await db()
    .insert(recolectores)
    .values({ nombre: firstName, telegramChatId: telegramUserId })
    .returning();

  return created!;
}

async function getOrCreateConversacion(recolectorId: string, canalUserId: string) {
  const existing = await db()
    .select()
    .from(conversaciones)
    .where(and(eq(conversaciones.canal, 'telegram'), eq(conversaciones.canalUserId, canalUserId)))
    .limit(1);

  if (existing[0]) return existing[0];

  const [created] = await db()
    .insert(conversaciones)
    .values({ recolectorId, canal: 'telegram', canalUserId, estado: 'idle', contexto: {} })
    .returning();

  return created!;
}

async function resetConversacion(conversacionId: string) {
  await db()
    .update(conversaciones)
    .set({ estado: 'idle', contexto: {}, ultimoMsgAt: new Date() })
    .where(eq(conversaciones.id, conversacionId));
}

async function setConfirming(conversacionId: string, pending: PendingExtraction) {
  const contexto: ConversacionContexto = { pendingExtraction: pending };
  await db()
    .update(conversaciones)
    .set({ estado: 'confirming', contexto, ultimoMsgAt: new Date() })
    .where(eq(conversaciones.id, conversacionId));
}

// ── Main handlers ─────────────────────────────────────────────────────────────

async function handleMessage(msg: TelegramMessage): Promise<void> {
  if (!msg.from) return;

  const chatId = msg.chat.id;
  const telegramUserId = String(msg.from.id);
  const canalUserId = String(chatId);

  const recolector = await getOrCreateRecolector(telegramUserId, msg.from.first_name);
  const conversacion = await getOrCreateConversacion(recolector.id, canalUserId);

  if (msg.text?.startsWith('/start')) {
    await resetConversacion(conversacion.id);
    await sendMessage(
      chatId,
      '🌿 <b>Bot de ARAM</b>\n\nSoy el asistente de registro de recolecciones.\n\nPodés enviarme:\n• Un <b>mensaje de texto</b> con los datos del retiro\n• Una <b>foto</b> del remito o comprobante\n• Un <b>video</b> corto (máx. 2 min)\n\n📝 <b>Ejemplo de texto:</b>\n<i>"Empresa Verdesur entregó 50 kg de papel y 30 kg de cartón el 15/03/2026. También dejaron 12 kg de plástico. Material limpio y seco, retiro en domicilio."</i>\n\n¡Empezá enviando los datos de tu próxima recolección!',
    );
    return;
  }

  if (msg.text?.startsWith('/cancelar')) {
    await resetConversacion(conversacion.id);
    await sendMessage(chatId, 'Cancelado.');
    return;
  }

  const thinkingMsg = await sendMessage(chatId, '🔍 Extrayendo datos...');

  let result: ExtractionResult;
  let textoOriginal: string;

  try {
    if (msg.text) {
      textoOriginal = msg.text;
      result = await identifyText(msg.text);
    } else if (msg.photo && msg.photo.length > 0) {
      textoOriginal = msg.caption ?? '[foto]';
      const lastPhoto = msg.photo[msg.photo.length - 1]!;
      const filePath = await getFilePath(lastPhoto.file_id);
      const buf = await downloadTelegramFile(filePath);
      result = await identifyBuffer(buf, 'image/jpeg', msg.caption);
    } else if (msg.video) {
      textoOriginal = msg.caption ?? '[video]';
      const filePath = await getFilePath(msg.video.file_id);
      const buf = await downloadTelegramFile(filePath);
      result = await identifyBuffer(buf, msg.video.mime_type ?? 'video/mp4', msg.caption);
    } else if (msg.document && msg.document.mime_type?.startsWith('image/')) {
      textoOriginal = msg.caption ?? '[documento]';
      const filePath = await getFilePath(msg.document.file_id);
      const buf = await downloadTelegramFile(filePath);
      result = await identifyBuffer(buf, msg.document.mime_type, msg.caption);
    } else {
      await editMessageText(
        chatId,
        thinkingMsg.message_id,
        '⚠️ Tipo de mensaje no soportado. Enviá texto, foto, video o imagen.',
      );
      return;
    }
  } catch (err) {
    console.error('Identification error:', err);
    await editMessageText(
      chatId,
      thinkingMsg.message_id,
      '⚠️ Ocurrió un error al procesar tu mensaje. Por favor intentá de nuevo.',
    );
    return;
  }

  const rejected = result.extracted === null || result.confidence === 'low';

  if (rejected) {
    await resetConversacion(conversacion.id);
    await editMessageText(chatId, thinkingMsg.message_id, formatRejection(result));
    return;
  }

  const pending: PendingExtraction = {
    empresa: result.extracted!.company,
    fecha: result.extracted!.date,
    materiales: result.extracted!.materials.map((m) => ({
      tipo: m.type,
      cantidad: m.quantity,
      unidad: m.unit,
    })),
    notas: result.extracted!.notes,
    confianza: result.confidence,
    textoOriginal,
    description: result.description,
  };

  await setConfirming(conversacion.id, pending);
  await editMessageText(chatId, thinkingMsg.message_id, formatSuccess(pending), {
    reply_markup: confirmKeyboard(),
  });
}

async function handleCallbackQuery(cbq: TelegramCallbackQuery): Promise<void> {
  if (!cbq.message) return;

  const chatId = cbq.message.chat.id;
  const canalUserId = String(chatId);

  await answerCallbackQuery(cbq.id);

  const rows = await db()
    .select()
    .from(conversaciones)
    .where(and(eq(conversaciones.canal, 'telegram'), eq(conversaciones.canalUserId, canalUserId)))
    .limit(1);

  const conversacion = rows[0];

  if (cbq.data === 'cancelar') {
    if (conversacion) await resetConversacion(conversacion.id);
    await editMessageText(
      chatId,
      cbq.message.message_id,
      '❌ Cancelado. Podés enviar otro mensaje cuando quieras.',
    );
    return;
  }

  if (cbq.data === 'confirmar') {
    if (!conversacion || conversacion.estado !== 'confirming') return;

    const contexto = conversacion.contexto as ConversacionContexto | null;
    const pending = contexto?.pendingExtraction;
    if (!pending) return;

    const today = new Date().toISOString().slice(0, 10);

    const [mensaje] = await db()
      .insert(mensajesRecolector)
      .values({
        contenidoTexto: pending.textoOriginal,
        estado: 'extraido',
        canal: 'telegram',
        canalUserId,
      })
      .returning({ id: mensajesRecolector.id });

    if (!mensaje) {
      await editMessageText(chatId, cbq.message.message_id, '⚠️ Error al guardar. Intentá de nuevo.');
      return;
    }

    const datosRaw: Record<string, unknown> = {
      empresa: pending.empresa,
      fecha: pending.fecha,
      materiales: pending.materiales,
      notas: pending.notas,
      confianza: pending.confianza,
      description: pending.description,
    };

    for (const material of pending.materiales) {
      await db().insert(extracciones).values({
        mensajeId: mensaje.id,
        tipoMaterial: material.tipo,
        cantidadKg: String(material.cantidad ?? 0),
        fechaRecoleccion: pending.fecha ?? today,
        confianzaIa: mapConfianza(pending.confianza),
        datosRaw,
        estado: 'pendiente',
      });
    }

    await resetConversacion(conversacion.id);
    await editMessageText(
      chatId,
      cbq.message.message_id,
      '✅ ¡Recolección guardada! Quedará visible en el panel de ARAM para su validación.',
    );
  }
}

// ── Public entry point ────────────────────────────────────────────────────────

export async function handleTelegramUpdate(update: TelegramUpdate): Promise<void> {
  if (update.message) {
    await handleMessage(update.message);
  } else if (update.callback_query) {
    await handleCallbackQuery(update.callback_query);
  }
}
