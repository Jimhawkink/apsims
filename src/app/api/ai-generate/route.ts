export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';

const TIMEOUT_MS = 60000;

async function fetchWithTimeout(url: string, options: RequestInit, timeout = TIMEOUT_MS) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const resp = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return resp;
  } catch (e: any) {
    clearTimeout(id);
    if (e.name === 'AbortError') throw new Error('Request timed out — API server unreachable');
    throw e;
  }
}

async function callAnthropic(system: string, user: string): Promise<any> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');

  const resp = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data?.error?.message || 'Anthropic API error');
  return data;
}

async function callOpenAI(system: string, user: string): Promise<any> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not set');

  const resp = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      max_tokens: 8000,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data?.error?.message || 'OpenAI API error');
  // Convert OpenAI format to Anthropic-like format for consistent frontend parsing
  const content = data.choices?.[0]?.message?.content || '';
  return { content: [{ type: 'text', text: content }] };
}

export async function POST(req: NextRequest) {
  const { system, user, provider } = await req.json();

  try {
    // Try specified provider first, then fallback
    if (provider === 'openai' || (!process.env.ANTHROPIC_API_KEY && process.env.OPENAI_API_KEY)) {
      const data = await callOpenAI(system, user);
      return NextResponse.json(data);
    }

    // Default: try Anthropic, fallback to OpenAI
    try {
      const data = await callAnthropic(system, user);
      return NextResponse.json(data);
    } catch (anthropicErr: any) {
      if (process.env.OPENAI_API_KEY) {
        console.warn('Anthropic failed, falling back to OpenAI:', anthropicErr.message);
        const data = await callOpenAI(system, user);
        return NextResponse.json(data);
      }
      throw anthropicErr;
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
