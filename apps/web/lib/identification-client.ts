const BASE_URL = 'https://um5iwhzmob.execute-api.us-east-1.amazonaws.com/api/v1';

export interface ExtractionResult {
  sessionId: string;
  inputType: 'text' | 'image' | 'video';
  confidence: 'high' | 'medium' | 'low';
  extracted: {
    company: string | null;
    date: string | null;
    materials: { type: string; quantity: number | null; unit: 'kg' | 'unit' | null }[];
    notes: string | null;
  } | null;
  rejectedReasons?: string[];
  usage?: { inputTokens: number; outputTokens: number; costUsd: number; modelId: string };
  description?: string;
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  // 422 is a valid rejection response — treat it as success
  if (!res.ok && res.status !== 422) {
    const text = await res.text();
    throw new Error(`Identification API ${path} failed ${res.status}: ${text}`);
  }

  const json = (await res.json()) as { data: T; error?: { code: string; message: string } };
  if (json.error && !json.data) {
    throw new Error(`Identification API error: ${json.error.code} — ${json.error.message}`);
  }
  return json.data;
}

export async function identifyText(message: string): Promise<ExtractionResult> {
  return postJson<ExtractionResult>('/extract/text', { message });
}

export async function identifyBuffer(
  buffer: Buffer,
  mimeType: string,
  notes?: string,
): Promise<ExtractionResult> {
  const { sessionId, uploadUrl } = await postJson<{
    sessionId: string;
    uploadUrl: string;
    expiresIn: number;
  }>('/extract/presign', { mimeType });

  const putRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': mimeType },
    body: buffer as unknown as BodyInit,
  });
  if (!putRes.ok) {
    throw new Error(`Failed to upload media to presigned URL: ${putRes.status}`);
  }

  const type: 'image' | 'video' = mimeType.startsWith('video/') ? 'video' : 'image';
  return postJson<ExtractionResult>('/extract/media', {
    sessionId,
    type,
    ...(notes ? { notes } : {}),
  });
}
