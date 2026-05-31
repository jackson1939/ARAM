import Anthropic from '@anthropic-ai/sdk';
import type { ExtraccionIA } from '@/types';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `Eres un asistente de extracción de datos de reciclaje para ARAM.
Dado un mensaje de un recolector de reciclaje, extrae los datos en JSON.
Responde SOLO con JSON válido, sin explicaciones ni markdown.

Schema:
{
  "empresa": string | null,
  "tipo_material": string | null,
  "cantidad_kg": number | null,
  "fecha": string | null,
  "notas": string | null,
  "confianza": number
}

- tipo_material debe ser uno de: plastico, papel, vidrio, metal, carton, electronico, organico
- fecha en formato YYYY-MM-DD. Si dice "hoy", usa la fecha actual.
- confianza entre 0 y 1 según cuánto puedes determinar los campos con certeza
- Si no puedes determinar un campo, usa null`;

export async function extraerDatosReciclaje(
  texto: string,
  textoOcr?: string,
): Promise<{ datos: ExtraccionIA; confianza: number }> {
  const contenido = textoOcr
    ? `Mensaje del recolector: "${texto}"\n\nTexto adicional extraído de imagen: "${textoOcr}"`
    : `Mensaje del recolector: "${texto}"`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 512,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: contenido }],
  });

  const raw = (message.content[0] as { type: string; text: string }).text.trim();
  const parsed = JSON.parse(raw) as ExtraccionIA & { confianza: number };
  const { confianza, ...datos } = parsed;

  return { datos, confianza: confianza ?? 0.5 };
}

export async function generarTipsPersonalizados(
  historial: { tipo_material: string; cantidad_kg: number }[],
  nombreEmpresa: string,
): Promise<string> {
  const resumen = historial
    .reduce<Record<string, number>>((acc, r) => {
      acc[r.tipo_material] = (acc[r.tipo_material] ?? 0) + r.cantidad_kg;
      return acc;
    }, {});

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 400,
    messages: [{
      role: 'user',
      content: `La empresa "${nombreEmpresa}" tiene el siguiente historial de reciclaje (kg por material): ${JSON.stringify(resumen)}.
Genera 3 tips concretos y motivadores para mejorar su gestión de reciclaje.
Responde en español, en formato de lista con viñetas. Sé específico con los materiales que más reciclan.`,
    }],
  });

  return (message.content[0] as { type: string; text: string }).text;
}
