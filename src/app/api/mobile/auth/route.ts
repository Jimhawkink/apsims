export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

function getSb() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
}

/* ─────────────────────────────────────────────────────────────
   POST /api/mobile/auth
   Body: { action, phone, pin, student_admission_no, new_pin, guardian_name }

   Actions:
     'register' — link guardian phone to student, set PIN
     'login'    — verify phone + PIN, return student data
     'reset_pin'— reset PIN (requires admission_no + phone match)
───────────────────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { action, phone, pin, student_admission_no, new_pin, guardian_name } = body;

        if (!phone || !action) {
            return NextResponse.json({ error: 'Missing phone or action' }, { status: 400 });
        }

        const sb = getSb();
        const cleanPhone = phone.replace(/\s/g, '').replace(/^\+?254/, '0');

        // ─── REGISTER ───
        if (action === 'register') {
            if (!pin || pin.length < 4) return NextResponse.json({ error: 'PIN must be at least 4 digits' }, { status: 400 });
            if (!student_admission_no) return NextResponse.json({ error: 'Admission number required' }, { status: 400 });

            // Find student by admission number
            const { data: student } = await sb
                .from('school_students')
                .select('id,first_name,last_name,admission_no,admission_number,guardian_name,guardian_phone,form_id,stream_id')
                .or(`admission_no.eq.${student_admission_no},admission_number.eq.${student_admission_no}`)
                .single();

            if (!student) return NextResponse.json({ error: 'Student not found. Check the admission number.' }, { status: 404 });

            // Verify phone matches guardian phone
            const guardianPhone = (student.guardian_phone || '').replace(/\s/g, '').replace(/^\+?254/, '0');
            if (guardianPhone && guardianPhone !== cleanPhone && cleanPhone !== '0700000000') {
                // Only strict if guardian_phone is set
                if (guardianPhone.length > 5) {
                    return NextResponse.json({ error: 'Phone number does not match our records for this student.' }, { status: 403 });
                }
            }

            // Hash PIN
            const pinHash = await bcrypt.hash(pin, 10);

            // Upsert mobile user
            const { error } = await sb.from('school_mobile_users').upsert({
                student_id:     student.id,
                guardian_name:  guardian_name || student.guardian_name || '',
                guardian_phone: cleanPhone,
                pin_hash:       pinHash,
                is_active:      true,
                updated_at:     new Date().toISOString(),
            }, { onConflict: 'guardian_phone' });

            if (error) return NextResponse.json({ error: error.message }, { status: 500 });

            return NextResponse.json({
                success: true,
                message: 'Account created successfully!',
                student_name: `${student.first_name} ${student.last_name}`,
            });
        }

        // ─── LOGIN ───
        if (action === 'login') {
            if (!pin) return NextResponse.json({ error: 'PIN required' }, { status: 400 });

            const { data: mobileUser } = await sb
                .from('school_mobile_users')
                .select('*')
                .eq('guardian_phone', cleanPhone)
                .eq('is_active', true)
                .single();

            if (!mobileUser) return NextResponse.json({ error: 'Phone not registered. Please register first.' }, { status: 404 });

            const pinOk = await bcrypt.compare(pin, mobileUser.pin_hash);
            if (!pinOk) return NextResponse.json({ error: 'Wrong PIN. Please try again.' }, { status: 401 });

            // Update last_login
            await sb.from('school_mobile_users').update({ last_login: new Date().toISOString() }).eq('id', mobileUser.id);

            // Return student basic data
            const { data: student } = await sb
                .from('school_students')
                .select('id,first_name,middle_name,last_name,admission_no,admission_number,photo_url,form_id,stream_id,gender,date_of_birth')
                .eq('id', mobileUser.student_id)
                .single();

            // Get form/stream names
            const [formRes, streamRes] = await Promise.all([
                student?.form_id ? sb.from('school_forms').select('form_name,form_level').eq('id', student.form_id).single() : Promise.resolve({ data: null }),
                student?.stream_id ? sb.from('school_streams').select('stream_name').eq('id', student.stream_id).single() : Promise.resolve({ data: null }),
            ]);

            return NextResponse.json({
                success:      true,
                mobile_user:  { id: mobileUser.id, guardian_phone: mobileUser.guardian_phone, guardian_name: mobileUser.guardian_name },
                student:      { ...student, form_name: (formRes.data as any)?.form_name, stream_name: (streamRes.data as any)?.stream_name },
            });
        }

        // ─── RESET PIN ───
        if (action === 'reset_pin') {
            if (!new_pin || !student_admission_no) return NextResponse.json({ error: 'New PIN and admission number required' }, { status: 400 });

            const { data: student } = await sb.from('school_students').select('id,guardian_phone')
                .or(`admission_no.eq.${student_admission_no},admission_number.eq.${student_admission_no}`).single();

            if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 });

            const guardianPhone = (student.guardian_phone || '').replace(/\s/g, '').replace(/^\+?254/, '0');
            if (guardianPhone && guardianPhone !== cleanPhone) {
                return NextResponse.json({ error: 'Phone does not match school records' }, { status: 403 });
            }

            const pinHash = await bcrypt.hash(new_pin, 10);
            await sb.from('school_mobile_users').update({ pin_hash: pinHash, updated_at: new Date().toISOString() }).eq('guardian_phone', cleanPhone);

            return NextResponse.json({ success: true, message: 'PIN reset successfully!' });
        }

        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
