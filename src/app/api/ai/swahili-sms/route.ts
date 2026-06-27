import { streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/ai/swahili-sms
 * Streams AI-generated SMS messages in English + Kiswahili
 * Body: { type, studentName, amount, dueDate, balance, schoolName, parentName }
 */
export async function POST(req: NextRequest) {
    const body = await req.json();
    const { type, studentName, amount, dueDate, balance, schoolName, parentName, customPrompt } = body;

    const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const templates: Record<string, string> = {
        fee_reminder: `Write an SMS fee reminder for a Kenyan school parent.
School: ${schoolName || 'Our School'}
Parent: ${parentName || 'Parent/Guardian'}
Student: ${studentName}
Amount Due: KES ${amount?.toLocaleString() || '0'}
Balance: KES ${balance?.toLocaleString() || '0'}
Due Date: ${dueDate || 'End of Term'}`,

        fee_receipt: `Write an SMS payment confirmation for a Kenyan school.
School: ${schoolName || 'Our School'}
Parent: ${parentName || 'Parent/Guardian'}
Student: ${studentName}
Amount Paid: KES ${amount?.toLocaleString() || '0'}
Remaining Balance: KES ${balance?.toLocaleString() || '0'}`,

        report_ready: `Write an SMS notifying a parent that their child's report card is ready.
School: ${schoolName || 'Our School'}
Student: ${studentName}`,

        leave_out: `Write an SMS notifying a parent that their child has left school premises.
School: ${schoolName || 'Our School'}
Student: ${studentName}
Time: ${new Date().toLocaleTimeString('en-KE')}`,

        custom: customPrompt || 'Write a school SMS message.',
    };

    const prompt = templates[type] || templates.custom;

    const result = streamText({
        model: openai('gpt-4o-mini'),
        system: `You are writing SMS messages for Kenyan secondary schools. 
Keep messages SHORT (max 160 characters each - one SMS). 
Be warm, professional, and use simple clear language.
Format EXACTLY as:
ENGLISH: [message under 160 chars]
KISWAHILI: [same message in Kiswahili under 160 chars]

Never exceed 160 characters per message. Count carefully.`,
        prompt,
        maxTokens: 200,
        temperature: 0.6,
    });

    return result.toDataStreamResponse();
}
