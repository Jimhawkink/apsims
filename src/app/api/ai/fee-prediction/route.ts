import { streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/ai/fee-prediction
 * Analyzes student fee payment history and predicts default risk
 * Streams a detailed risk assessment report
 *
 * Body: { studentId, studentName, formName }
 */
export async function POST(req: NextRequest) {
    const body = await req.json();
    const { studentId, studentName, formName } = body;

    if (!studentId) return new Response('Missing studentId', { status: 400 });

    // Fetch payment history from Supabase
    const { data: payments } = await supabase
        .from('school_fee_payments')
        .select('amount, payment_date, payment_method')
        .eq('student_id', studentId)
        .order('payment_date', { ascending: true });

    const { data: feeStructure } = await supabase
        .from('school_fee_structures')
        .select('category, amount')
        .limit(10);

    const totalPaid = (payments || []).reduce((s, p) => s + Number(p.amount || 0), 0);
    const totalDue = (feeStructure || []).reduce((s, f) => s + Number(f.amount || 0), 0);
    const paymentCount = payments?.length || 0;
    const lastPaymentDate = payments?.[payments.length - 1]?.payment_date || 'Never';
    const daysSinceLastPayment = lastPaymentDate === 'Never' ? 999 :
        Math.floor((Date.now() - new Date(lastPaymentDate).getTime()) / (1000 * 60 * 60 * 24));

    // Analyze payment pattern
    const methods = (payments || []).reduce((acc: Record<string, number>, p) => {
        acc[p.payment_method] = (acc[p.payment_method] || 0) + 1;
        return acc;
    }, {});

    const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const result = streamText({
        model: openai('gpt-4o-mini'),
        system: `You are an AI financial risk analyst for a Kenyan secondary school. 
Analyze student fee payment patterns and provide a risk assessment. 
Use clear sections with emojis. Be practical and Kenya-focused (M-Pesa, bank, cash payments).
Format: Risk Level â†’ Risk Factors â†’ Recommendations â†’ Action Items`,
        prompt: `Analyze fee default risk for:
Student: ${studentName} (${formName})
Total Paid: KES ${totalPaid.toLocaleString()}
Estimated Total Due: KES ${totalDue.toLocaleString()}
Balance: KES ${Math.max(0, totalDue - totalPaid).toLocaleString()}
Collection Rate: ${totalDue > 0 ? Math.round((totalPaid / totalDue) * 100) : 0}%
Payment Count: ${paymentCount} payments
Last Payment: ${lastPaymentDate} (${daysSinceLastPayment} days ago)
Payment Methods Used: ${JSON.stringify(methods)}

Provide: Risk level (LOW/MEDIUM/HIGH/CRITICAL), key risk factors, 3 specific action recommendations for the school bursar.`,
        maxOutputTokens: 400,
        temperature: 0.4,
    });

    return result.toTextStreamResponse();
}
