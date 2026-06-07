export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const student_id = searchParams.get('student_id');
  const status = searchParams.get('status');
  const term_id = searchParams.get('term_id');
  const limit = Math.min(parseInt(searchParams.get('limit') || '500'), 2000);

  let query = supabase
    .from('school_whatsapp_logs')
    .select(`
      *,
      student:school_students(
        id, first_name, last_name, admission_number, form_id, stream_id,
        guardian_name, guardian_phone
      )
    `)
    .order('sent_at', { ascending: false })
    .limit(limit);

  if (student_id) query = query.eq('student_id', student_id);
  if (status) query = query.eq('status', status);
  if (term_id) query = query.eq('term_id', term_id);

  const { data: logs, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Compute stats
  const allLogs = logs || [];
  const stats = {
    queued: allLogs.filter(l => l.status === 'queued').length,
    sent: allLogs.filter(l => l.status === 'sent').length,
    delivered: allLogs.filter(l => l.status === 'delivered').length,
    read: allLogs.filter(l => l.status === 'read').length,
    failed: allLogs.filter(l => l.status === 'failed').length,
    total: allLogs.length,
  };

  return NextResponse.json({ logs: allLogs, stats });
}
