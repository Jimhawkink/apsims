export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const getSb = () => createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/* GET /api/mobile/notifications?student_id=X&phone=07XX */
export async function GET(req: NextRequest) {
    const student_id = req.nextUrl.searchParams.get('student_id');
    const phone = req.nextUrl.searchParams.get('phone')?.replace(/\s/g,'').replace(/^\+?254/,'0');
    if (!student_id || !phone) return NextResponse.json({ error:'Missing params' }, { status:400 });

    const sb = getSb();
    const { data: mu } = await sb.from('school_mobile_users').select('student_id').eq('guardian_phone', phone).eq('is_active', true).single();
    if (!mu || String(mu.student_id) !== String(student_id)) return NextResponse.json({ error:'Unauthorized' }, { status:403 });

    const { data } = await sb.from('school_mobile_notifications').select('*').eq('student_id', Number(student_id)).order('sent_at', { ascending:false }).limit(50);
    // Mark as read
    await sb.from('school_mobile_notifications').update({ is_read:true }).eq('student_id', Number(student_id)).eq('is_read', false);

    return NextResponse.json({ notifications: data || [] });
}
