import { NextRequest, NextResponse } from 'next/server';

function getSupabase() {
  const { createClient } = require('@supabase/supabase-js');
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function POST(req: NextRequest) {
  try {
    // ─── Auth Check ───
    const { getSession } = await import('@/lib/auth');
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = getSupabase();
    const body = await req.json();
    const { subject_name, topic, form, question_type, difficulty, count, blooms_level, language } = body;

    if (!subject_name || !count) {
      return NextResponse.json({ error: 'Subject name and count are required' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'OpenAI API key not configured. Set OPENAI_API_KEY in .env.local' }, { status: 500 });
    }

    const qType = question_type || 'multiple_choice';
    const qDiff = difficulty || 'medium';
    const qCount = Math.min(count, 20); // Cap at 20
    const qLang = language || 'English';
    const qForm = form || 'Form 1-4';
    const qBlooms = blooms_level || '';

    const systemPrompt = `You are an expert Kenyan secondary school teacher creating exam questions following the Kenyan curriculum (8-4-4 and CBC). Generate questions that are curriculum-aligned, age-appropriate, and pedagogically sound.`;

    let userPrompt = '';
    if (qType === 'multiple_choice') {
      userPrompt = `Generate exactly ${qCount} multiple choice questions for ${qForm} ${subject_name}${topic ? ` on the topic: ${topic}` : ''}.
Difficulty: ${qDiff}${qBlooms ? `. Bloom's taxonomy level: ${qBlooms}` : ''}.
Language: ${qLang}.

Return a JSON array where each object has:
- "question_text": the question
- "options": array of 4 objects with "key" (A/B/C/D) and "value" (option text)
- "correct_answer": the correct key (e.g. "B")
- "explanation": brief explanation of why the answer is correct
- "marks": number (typically 1-2 for MCQ)
- "difficulty": "${qDiff}"
- "blooms_level": "${qBlooms || 'apply'}"

IMPORTANT: Return ONLY the JSON array, no other text.`;
    } else if (qType === 'essay') {
      userPrompt = `Generate exactly ${qCount} essay/long answer questions for ${qForm} ${subject_name}${topic ? ` on the topic: ${topic}` : ''}.
Difficulty: ${qDiff}${qBlooms ? `. Bloom's taxonomy level: ${qBlooms}` : ''}.
Language: ${qLang}.

Return a JSON array where each object has:
- "question_text": the essay question
- "correct_answer": a model answer outline (bullet points)
- "explanation": marking guide tips
- "marks": number (typically 10-20 for essay)
- "difficulty": "${qDiff}"
- "blooms_level": "${qBlooms || 'evaluate'}"

IMPORTANT: Return ONLY the JSON array, no other text.`;
    } else if (qType === 'short_answer') {
      userPrompt = `Generate exactly ${qCount} short answer questions for ${qForm} ${subject_name}${topic ? ` on the topic: ${topic}` : ''}.
Difficulty: ${qDiff}${qBlooms ? `. Bloom's taxonomy level: ${qBlooms}` : ''}.
Language: ${qLang}.

Return a JSON array where each object has:
- "question_text": the question
- "correct_answer": the expected short answer
- "explanation": brief explanation
- "marks": number (typically 2-5)
- "difficulty": "${qDiff}"
- "blooms_level": "${qBlooms || 'understand'}"

IMPORTANT: Return ONLY the JSON array, no other text.`;
    } else {
      userPrompt = `Generate exactly ${qCount} ${qType} questions for ${qForm} ${subject_name}${topic ? ` on the topic: ${topic}` : ''}.
Difficulty: ${qDiff}. Language: ${qLang}.

Return a JSON array where each object has:
- "question_text": the question
- "correct_answer": the answer
- "explanation": brief explanation
- "marks": number
- "difficulty": "${qDiff}"
- "blooms_level": "${qBlooms || 'apply'}"

IMPORTANT: Return ONLY the JSON array, no other text.`;
    }

    const startTime = Date.now();

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    const durationMs = Date.now() - startTime;

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      return NextResponse.json({
        error: `OpenAI API error: ${response.status} - ${errData?.error?.message || 'Unknown error'}`,
      }, { status: 502 });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    // Parse the JSON from the response
    let questions: any[];
    try {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error('No JSON array found in response');
      questions = JSON.parse(jsonMatch[0]);
    } catch (parseErr) {
      return NextResponse.json({
        error: 'Failed to parse AI response as JSON',
        raw: content.substring(0, 500),
      }, { status: 500 });
    }

    // Log the generation
    await supabase.from('school_ai_generation_logs').insert([{
      subject_name,
      topic: topic || null,
      form: qForm,
      ai_model: 'openai-gpt4o-mini',
      prompt_text: userPrompt.substring(0, 500),
      generation_params: { question_type: qType, difficulty: qDiff, count: qCount, blooms_level: qBlooms, language: qLang },
      questions_generated: questions.length,
      questions_saved: 0,
      raw_response: { questions },
      status: 'completed',
      duration_ms: durationMs,
      created_by: 'admin',
    }]);

    return NextResponse.json({
      success: true,
      questions,
      meta: {
        model: 'gpt-4o-mini',
        duration_ms: durationMs,
        count: questions.length,
      },
    });
  } catch (err: any) {
    console.error('AI generation error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
