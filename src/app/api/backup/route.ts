import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// All school tables to backup
const BACKUP_TABLES = [
  'school_details', 'school_users', 'school_forms', 'school_streams', 'school_terms',
  'school_subjects', 'school_students', 'school_teachers', 'school_support_teachers',
  'school_subordinate_staff', 'school_classes', 'school_subject_teachers',
  'school_fee_structures', 'school_fee_payments', 'school_grading_system',
  'school_exam_types', 'school_exam_results', 'school_exam_marks',
  'school_attendance', 'school_daily_attendance',
  'school_expenses', 'school_expense_categories', 'school_income',
  'school_assets', 'school_payroll', 'school_timetable_entries', 'school_timetable_periods',
  'school_schemes_of_work', 'school_scheme_weeks', 'school_scheme_lessons',
  'school_topics', 'school_discipline_records', 'school_message_logs',
  'school_portal_users', 'school_parent_students', 'school_portal_notifications',
  'school_health_records', 'school_health_allergies',
  'school_question_bank', 'school_whatsapp_delivery',
  'school_mpesa_config', 'school_mpesa_transactions',
  'school_leave_out_records', 'school_visitor_log',
  'school_store_items', 'school_rim_paper_records',
  'school_clinic_visits', 'school_bus_passes', 'school_alumni',
  'school_backup_logs',
];

/**
 * GET /api/backup
 * Full database backup — exports all school tables as JSON
 * Only Admin and Principal can trigger backups
 */
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const allowedRoles = ['Admin', 'Principal'];
  if (!allowedRoles.map(r => r.toLowerCase()).includes(session.role?.toLowerCase())) {
    return NextResponse.json({ error: 'Forbidden: Admin or Principal role required' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const format = searchParams.get('format') || 'json'; // json or csv
  const tablesParam = searchParams.get('tables'); // comma-separated list or 'all'

  const supabase = getServiceClient();

  const tablesToBackup = tablesParam && tablesParam !== 'all'
    ? tablesParam.split(',').map(t => t.trim())
    : BACKUP_TABLES;

  const backup: Record<string, any> = {
    _meta: {
      version: '2.0',
      created_at: new Date().toISOString(),
      created_by: session.full_name || session.username,
      table_count: 0,
      total_records: 0,
      format: 'APSIMS Full Database Backup',
    },
  };

  let totalRecords = 0;
  let tableCount = 0;
  const errors: string[] = [];

  for (const table of tablesToBackup) {
    try {
      // Fetch all rows — Supabase limits to 1000 by default, we paginate
      let allRows: any[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .range(page * pageSize, (page + 1) * pageSize - 1)
          .order('id', { ascending: true });

        if (error) {
          // Table might not exist — skip silently
          errors.push(`${table}: ${error.message}`);
          hasMore = false;
          break;
        }

        if (data && data.length > 0) {
          allRows = allRows.concat(data);
          page++;
          hasMore = data.length === pageSize;
        } else {
          hasMore = false;
        }
      }

      if (allRows.length > 0 || !errors.find(e => e.startsWith(table))) {
        backup[table] = allRows;
        totalRecords += allRows.length;
        tableCount++;
      }
    } catch (err: any) {
      errors.push(`${table}: ${err.message}`);
    }
  }

  backup._meta.table_count = tableCount;
  backup._meta.total_records = totalRecords;
  backup._meta.errors = errors.length > 0 ? errors : undefined;

  // Log the backup
  try {
    await supabase.from('school_backup_logs').insert([{
      backup_type: 'full',
      table_count: tableCount,
      record_count: totalRecords,
      file_size_kb: Math.round(JSON.stringify(backup).length / 1024),
      status: errors.length === 0 ? 'Success' : 'Partial',
      created_by: session.full_name || session.username,
      errors: errors.length > 0 ? errors.join('; ') : null,
      created_at: new Date().toISOString(),
    }]);
  } catch { /* table may not exist */ }

  // Build filename
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
  const filename = `APSIMS_Backup_${dateStr}_${timeStr}.json`;

  const jsonStr = JSON.stringify(backup, null, 2);

  return new NextResponse(jsonStr, {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'X-Backup-Tables': String(tableCount),
      'X-Backup-Records': String(totalRecords),
    },
  });
}

/**
 * POST /api/backup
 * Restore from a backup JSON file
 * DANGEROUS — only Admin can restore
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (session.role?.toLowerCase() !== 'admin') {
    return NextResponse.json({ error: 'Forbidden: Only Admin can restore backups' }, { status: 403 });
  }

  let backupData: any;
  try {
    backupData = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid backup JSON file' }, { status: 400 });
  }

  if (!backupData._meta || !backupData._meta.format) {
    return NextResponse.json({ error: 'Invalid backup format. Not an APSIMS backup file.' }, { status: 400 });
  }

  const supabase = getServiceClient();
  const results: { table: string; inserted: number; error?: string }[] = [];

  // Restore order matters — reference tables first
  const restoreOrder = [
    'school_details', 'school_forms', 'school_streams', 'school_terms', 'school_subjects',
    'school_grading_system', 'school_expense_categories', 'school_users',
    'school_students', 'school_teachers', 'school_support_teachers', 'school_subordinate_staff',
    'school_classes', 'school_subject_teachers',
    'school_fee_structures', 'school_fee_payments',
    'school_exam_types', 'school_exam_results', 'school_exam_marks',
    'school_attendance', 'school_daily_attendance',
    'school_expenses', 'school_income', 'school_assets', 'school_payroll',
  ];

  // Add any tables in backup that aren't in restoreOrder
  const allTables = Object.keys(backupData).filter(k => k !== '_meta');
  for (const t of allTables) {
    if (!restoreOrder.includes(t)) restoreOrder.push(t);
  }

  for (const table of restoreOrder) {
    const rows = backupData[table];
    if (!rows || !Array.isArray(rows) || rows.length === 0) continue;

    try {
      // Remove id fields to avoid conflicts, upsert by natural keys
      const cleanRows = rows.map((row: any) => {
        const { id, ...rest } = row;
        return rest;
      });

      // Insert in batches of 500
      let inserted = 0;
      for (let i = 0; i < cleanRows.length; i += 500) {
        const batch = cleanRows.slice(i, i + 500);
        const { error } = await supabase.from(table).insert(batch);
        if (error) {
          results.push({ table, inserted, error: error.message });
          break;
        }
        inserted += batch.length;
      }
      if (!results.find(r => r.table === table)) {
        results.push({ table, inserted });
      }
    } catch (err: any) {
      results.push({ table, inserted: 0, error: err.message });
    }
  }

  // Log the restore
  try {
    await supabase.from('school_backup_logs').insert([{
      backup_type: 'restore',
      table_count: results.filter(r => !r.error).length,
      record_count: results.reduce((acc, r) => acc + r.inserted, 0),
      status: results.every(r => !r.error) ? 'Success' : 'Partial',
      created_by: session.full_name || session.username,
      errors: results.filter(r => r.error).map(r => `${r.table}: ${r.error}`).join('; ') || null,
      created_at: new Date().toISOString(),
    }]);
  } catch { /* ignore */ }

  return NextResponse.json({
    success: true,
    restored_tables: results.filter(r => !r.error).length,
    total_records: results.reduce((acc, r) => acc + r.inserted, 0),
    results,
  });
}
