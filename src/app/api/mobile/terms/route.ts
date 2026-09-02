export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const getSb = () => createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/* GET /api/mobile/terms?phone=07XX */
export async function GET(req: NextRequest) {
    const phone = req.nextUrl.searchParams.get('phone')?.replace(/\s/g,'').replace(/^\+?254/,'0');
    if (!phone) return NextResponse.json({ error:'Missing phone' }, { status:400 });

    const sb = getSb();
    // verify mobile user
    const { data: mu } = await sb.from('school_mobile_users').select('id,student_id').eq('guardian_phone', phone).eq('is_active', true).single();
    if (!mu) return NextResponse.json({ error:'Unauthorized' }, { status:403 });

    const { data: terms } = await sb.from('school_terms').select('*').order('id', { ascending:false });
    return NextResponse.json({ terms: terms || [] });
}
