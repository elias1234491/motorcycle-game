// Supabase Edge Function: das "Gehirn" der KI-Anrufer (wie im Original ein Cloud-LLM).
// Secret setzen: supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
// Optional: ALLOWED_ORIGIN=https://deinname.github.io
import Anthropic from 'npm:@anthropic-ai/sdk@0.131.0';
import { buildParams, parseResponse } from './brain-core.js';

const client = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') });
const MODEL = Deno.env.get('CALLER_MODEL') ?? 'claude-opus-5-5';
const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') ?? '*';

const cors = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

  let input;
  try {
    input = await req.json();
  } catch {
    return json({ error: 'invalid json' }, 400);
  }
  if (input?.mode !== 'boss' && !input?.persona) return json({ error: 'persona missing' }, 400);

  try {
    const response = await client.beta.messages.create(buildParams(input, MODEL));
    return json(parseResponse(response));
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) return json({ error: 'rate_limited' }, 429);
    if (err instanceof Anthropic.APIError) return json({ error: err.message }, err.status ?? 502);
    return json({ error: String(err) }, 500);
  }
});
