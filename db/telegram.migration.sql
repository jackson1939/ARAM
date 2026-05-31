-- Telegram bot migration: add canal columns to mensajes_recolector,
-- and create recolectores and conversaciones tables.

ALTER TABLE mensajes_recolector
  ADD COLUMN IF NOT EXISTS canal TEXT DEFAULT 'whatsapp',
  ADD COLUMN IF NOT EXISTS canal_user_id TEXT;

CREATE TABLE IF NOT EXISTS recolectores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT,
  telegram_chat_id TEXT UNIQUE,
  whatsapp_number TEXT UNIQUE,
  empresa_id UUID REFERENCES empresas(id) ON DELETE SET NULL,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conversaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recolector_id UUID REFERENCES recolectores(id) ON DELETE CASCADE,
  canal TEXT NOT NULL,
  canal_user_id TEXT NOT NULL,
  estado TEXT DEFAULT 'idle',
  contexto JSONB,
  ultimo_msg_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS conversaciones_canal_user_idx
  ON conversaciones (canal, canal_user_id);
