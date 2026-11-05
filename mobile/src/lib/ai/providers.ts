// Appels directs aux API Claude (Anthropic), ChatGPT (OpenAI) et Gemini (Google)
// avec la clé de l'utilisateur. Une seule fonction commune : generateJson(), qui
// renvoie un objet JSON conforme au schéma demandé (sorties structurées de chaque fournisseur).
// HTTP brut (fetch) : un même code pour les trois fournisseurs, sans SDK Node à faire tourner dans React Native.

import { getAiSettings, PROVIDERS, type AiProvider, type AiSettings } from './settings';

export class AiError extends Error {
  constructor(message: string, public code: 'not_configured' | 'auth' | 'quota' | 'refused' | 'network' | 'other' = 'other') {
    super(message);
  }
}

export interface JsonRequest {
  system: string;
  prompt: string;
  imageBase64?: string; // JPEG
  schema: Record<string, unknown>;
  /** Profondeur de réflexion (utilisée par Claude) */
  effort?: 'low' | 'medium' | 'high';
}

const TIMEOUT_MS = 120000;

async function post(url: string, headers: Record<string, string>, body: unknown, provider: AiProvider) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch {
    throw new AiError(
      controller.signal.aborted ? "L'IA a mis trop de temps à répondre. Réessaie." : `Impossible de joindre ${PROVIDERS[provider].name}. Vérifie ta connexion.`,
      'network',
    );
  } finally {
    clearTimeout(timer);
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw httpError(res.status, json, provider);
  return json;
}

function httpError(status: number, json: any, provider: AiProvider) {
  const name = PROVIDERS[provider].name;
  const detail: string = json?.error?.message ?? '';
  if (status === 401 || status === 403 || /api key/i.test(detail)) {
    return new AiError(`Clé ${name} refusée. Vérifie-la dans Réglages IA.`, 'auth');
  }
  if (status === 429 || status === 402 || /quota|credit|billing|balance/i.test(detail)) {
    return new AiError(`Limite ou crédit épuisé sur ton compte ${name}. Vérifie ta facturation chez ${PROVIDERS[provider].company}.`, 'quota');
  }
  if (status === 404 || /model/i.test(detail)) {
    return new AiError(`Modèle introuvable chez ${name}. Choisis-en un autre dans Réglages IA.${detail ? ` (${detail})` : ''}`);
  }
  if (status >= 500 || status === 529) return new AiError(`${name} est surchargé pour le moment. Réessaie dans un instant.`);
  return new AiError(`Erreur ${name} (${status})${detail ? ` : ${detail}` : ''}`);
}

function parseJson(text: string | undefined, provider: AiProvider) {
  try {
    const data = JSON.parse(text ?? '');
    if (data && typeof data === 'object') return data;
  } catch {}
  throw new AiError(`Réponse de ${PROVIDERS[provider].name} illisible. Réessaie.`);
}

// ---------------------------------------------------------------------------
// Claude (Anthropic Messages API)
// ---------------------------------------------------------------------------

async function claude(s: AiSettings, r: JsonRequest) {
  const content: unknown[] = [];
  if (r.imageBase64) content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: r.imageBase64 } });
  content.push({ type: 'text', text: r.prompt });

  // "effort" n'existe que sur les modèles récents ; le repli automatique ("fallbacks") sur Opus 5+/Sonnet 5.5/Fable.
  const modern = /^claude-(opus|sonnet|haiku|fable|mythos)-[5-9]/.test(s.model);
  const fallback = /^claude-(opus-5|sonnet-5-5|fable-5-1)/.test(s.model);

  const body: Record<string, unknown> = {
    model: s.model,
    max_tokens: 16000,
    system: r.system,
    messages: [{ role: 'user', content }],
    output_config: {
      ...(modern ? { effort: r.effort ?? 'medium' } : {}),
      format: { type: 'json_schema', schema: r.schema },
    },
  };
  const headers: Record<string, string> = { 'x-api-key': s.apiKey, 'anthropic-version': '2026-10-21' };
  if (fallback) {
    body.fallbacks = 'default';
    headers['anthropic-beta'] = 'server-side-fallback-2026-07-01';
  }

  const res = await post('https://api.anthropic.com/v1/messages', headers, body, 'anthropic');
  if (res.stop_reason === 'refusal') throw new AiError("Claude n'a pas pu traiter cette demande.", 'refused');
  if (res.stop_reason === 'max_tokens') throw new AiError('Réponse de Claude incomplète. Réessaie.');
  const texts = (res.content ?? []).filter((b: any) => b.type === 'text');
  return parseJson(texts[texts.length - 1]?.text, 'anthropic');
}

// ---------------------------------------------------------------------------
// ChatGPT (OpenAI Chat Completions + Structured Outputs)
// ---------------------------------------------------------------------------

async function openai(s: AiSettings, r: JsonRequest) {
  const userContent: unknown[] = [{ type: 'text', text: r.prompt }];
  if (r.imageBase64) userContent.push({ type: 'image_url', image_url: { url: `data:image/jpeg;base64,${r.imageBase64}` } });

  const res = await post(
    'https://api.openai.com/v1/chat/completions',
    { Authorization: `Bearer ${s.apiKey}` },
    {
      model: s.model,
      messages: [
        { role: 'system', content: r.system },
        { role: 'user', content: userContent },
      ],
      response_format: { type: 'json_schema', json_schema: { name: 'result', strict: true, schema: r.schema } },
    },
    'openai',
  );
  const msg = res.choices?.[0]?.message;
  if (msg?.refusal) throw new AiError(`ChatGPT a refusé : ${msg.refusal}`, 'refused');
  if (res.choices?.[0]?.finish_reason === 'length') throw new AiError('Réponse de ChatGPT incomplète. Réessaie.');
  return parseJson(msg?.content, 'openai');
}

// ---------------------------------------------------------------------------
// Gemini (Google generateContent + responseJsonSchema)
// ---------------------------------------------------------------------------

async function gemini(s: AiSettings, r: JsonRequest) {
  const parts: unknown[] = [];
  if (r.imageBase64) parts.push({ inlineData: { mimeType: 'image/jpeg', data: r.imageBase64 } });
  parts.push({ text: r.prompt });

  const model = s.model.replace(/^models\//, '');
  const res = await post(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    { 'x-goog-api-key': s.apiKey },
    {
      systemInstruction: { parts: [{ text: r.system }] },
      contents: [{ role: 'user', parts }],
      generationConfig: { responseMimeType: 'application/json', responseJsonSchema: r.schema },
    },
    'gemini',
  );
  if (res.promptFeedback?.blockReason) throw new AiError("Gemini n'a pas pu traiter cette demande.", 'refused');
  const cand = res.candidates?.[0];
  if (cand?.finishReason === 'MAX_TOKENS') throw new AiError('Réponse de Gemini incomplète. Réessaie.');
  const text = (cand?.content?.parts ?? []).map((p: any) => p.text ?? '').join('');
  return parseJson(text, 'gemini');
}

// ---------------------------------------------------------------------------

export async function generateJson<T>(r: JsonRequest): Promise<T> {
  const s = getAiSettings();
  if (!s?.apiKey) throw new AiError("Choisis d'abord ton IA (Claude, ChatGPT ou Gemini) dans Réglages IA.", 'not_configured');
  if (s.provider === 'anthropic') return claude(s, r);
  if (s.provider === 'openai') return openai(s, r);
  return gemini(s, r);
}

/** Vérifie la clé et renvoie la liste des modèles disponibles sur le compte. */
export async function listModels(provider: AiProvider, apiKey: string): Promise<string[]> {
  let url: string;
  let headers: Record<string, string>;
  if (provider === 'anthropic') {
    url = 'https://api.anthropic.com/v1/models?limit=100';
    headers = { 'x-api-key': apiKey, 'anthropic-version': '2026-10-21' };
  } else if (provider === 'openai') {
    url = 'https://api.openai.com/v1/models';
    headers = { Authorization: `Bearer ${apiKey}` };
  } else {
    url = 'https://generativelanguage.googleapis.com/v1beta/models?pageSize=200';
    headers = { 'x-goog-api-key': apiKey };
  }

  let res: Response;
  try {
    res = await fetch(url, { headers });
  } catch {
    throw new AiError('Pas de connexion internet.', 'network');
  }
  const json: any = await res.json().catch(() => ({}));
  if (!res.ok) throw httpError(res.status, json, provider);

  if (provider === 'anthropic') return (json.data ?? []).map((m: any) => m.id as string);
  if (provider === 'openai') {
    return (json.data ?? [])
      .map((m: any) => m.id as string)
      .filter((id: string) => /^(gpt|o\d)/.test(id) && !/audio|realtime|tts|transcribe|image|search|embedding|instruct/.test(id))
      .sort()
      .reverse();
  }
  return (json.models ?? [])
    .filter((m: any) => (m.supportedGenerationMethods ?? []).includes('generateContent') && /gemini/.test(m.name))
    .map((m: any) => String(m.name).replace(/^models\//, ''));
}
