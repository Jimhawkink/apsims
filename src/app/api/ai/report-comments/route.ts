import { streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/ai/report-comments
 * Streams AI-generated report card teacher comments in English + Kiswahili
 *
 * Body: { studentName, subject, marks, outOf, grade, term, className }
 */
export async function POST(req: NextRequest) {
    const body = await req.json();
    const { studentName, subject, marks, outOf, grade, term, className } = body;

    if (!studentName || !subject || marks == null) {
        return new Response('Missing required fields', { status: 400 });
    }

    const pct = outOf > 0 ? Math.round((marks / outOf) * 100) : marks;

    // Determine performance tier
    const tier =
        pct >= 75 ? 'excellent' :
        pct >= 60 ? 'good' :
        pct >= 50 ? 'average' :
        pct >= 40 ? 'below_average' : 'poor';

    const openai = createOpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });

    const result = streamText({
        model: openai('gpt-4o-mini'),
        system: `You are a professional Kenyan secondary school teacher writing report card comments.
Write concise, professional, encouraging comments. Kenya uses CBC and 8-4-4 curriculum systems.
Format your response EXACTLY as:
ENGLISH: [2-3 sentence professional comment in English]
KISWAHILI: [Same comment translated into natural Kiswahili]

Rules:
- Be specific to the subject and score
- Mention specific areas for improvement for lower scores
- Praise specific strengths for high scores  
- Keep each comment under 50 words
- Use formal but warm language
- For CBC grades use: Exceeding Expectations, Meeting Expectations, Approaching Expectations, Below Expectations`,
        prompt: `Write a report card comment for:
Student: ${studentName}
Subject: ${subject}
Score: ${marks}/${outOf} (${pct}%) — Grade: ${grade}
Term: ${term || 'Term 1'}
Class: ${className || 'Unknown'}
Performance Level: ${tier}`,
        maxTokens: 300,
        temperature: 0.7,
    });

    return result.toDataStreamResponse();
}
