'use client';
import { useRef, useEffect } from 'react';

// ─── BARCODE GENERATOR ───────────────────────────────────────────────────────
function generateBarcodeSvg(code: string): string {
    const bars: string[] = [];
    let x = 2;
    const paddedCode = code.padEnd(20, '0');
    for (let i = 0; i < paddedCode.length; i++) {
        const charCode = paddedCode.charCodeAt(i);
        const width = (charCode % 3) + 1;
        const height = i % 4 === 0 ? 28 : i % 3 === 0 ? 24 : 20;
        const y = 30 - height;
        if (i % 2 === 0) {
            bars.push(`<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="#111827" rx="0.3"/>`);
        }
        x += width + 0.8;
    }
    // Guard bars
    const guardBar = `<rect x="0" y="0" width="1.5" height="30" fill="#111827"/>`;
    const guardBar2 = `<rect x="${x + 1}" y="0" width="1.5" height="30" fill="#111827"/>`;
    const allSvg = guardBar + bars.join('') + guardBar2;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${x + 4} 30" width="${Math.min((x + 4) * 1.2, 130)}" height="24">${allSvg}</svg>`;
}

// ─── QR CODE PLACEHOLDER (pixel pattern) ─────────────────────────────────────
function MiniQR({ value, size = 36, color = '#111827' }: { value: string; size?: number; color?: string }) {
    const seed = value.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const cells = Array.from({ length: 49 }, (_, i) => {
        const row = Math.floor(i / 7); const col = i % 7;
        // finder patterns
        if ((row < 3 && col < 3) || (row < 3 && col > 3) || (row > 3 && col < 3)) return true;
        return (seed * (i + 1) * 31) % 17 < 9;
    });
    const cellSize = size / 7;
    return (
        <svg width={size} height={size} viewBox="0 0 7 7" style={{ flexShrink: 0 }}>
            <rect width="7" height="7" fill="white" />
            {cells.map((filled, i) => filled ? (
                <rect key={i} x={i % 7} y={Math.floor(i / 7)} width="1" height="1" fill={color} />
            ) : null)}
        </svg>
    );
}

// ─── HOLOGRAPHIC SHIMMER OVERLAY ─────────────────────────────────────────────
function HoloShimmer({ opacity = 0.06 }: { opacity?: number }) {
    return (
        <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 2,
            backgroundImage: `repeating-linear-gradient(105deg,
                transparent 0%, transparent 8%,
                rgba(255,255,255,${opacity}) 8%, rgba(255,255,255,${opacity}) 9%,
                transparent 9%, transparent 17%,
                rgba(255,220,100,${opacity * 0.6}) 17%, rgba(255,220,100,${opacity * 0.6}) 18%
            )`,
        }} />
    );
}

// ─── STUDENT CARD FRONT ───────────────────────────────────────────────────────
export function StudentCardFront({ student, school, template, getFormName, getStreamName, qrDataUrl }: any) {
    const d = template?.front_design || {
        header_bg: 'linear-gradient(135deg,#1e3a8a 0%,#1d4ed8 50%,#2563eb 100%)',
        header_text: '#ffffff',
        body_bg: '#ffffff',
        accent: '#1d4ed8',
        photo_border: '#1d4ed8',
    };
    const accent = d.accent || '#1d4ed8';
    const barcodeSvg = student.card_number ? generateBarcodeSvg(student.card_number) : '';
    const admNo = student.admission_no || student.admission_number || '—';
    const formName = getFormName(student.form_id) || '—';
    const streamName = getStreamName(student.stream_id) || '';
    const initials = `${student.first_name?.charAt(0) || '?'}${student.last_name?.charAt(0) || '?'}`;
    const year = student.card_expiry_date ? new Date(student.card_expiry_date).getFullYear() : new Date().getFullYear();

    return (
        <div style={{ position: 'relative', width: 340, height: 214, borderRadius: 14, overflow: 'hidden', background: d.body_bg || '#fff', boxShadow: '0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.10)', fontFamily: "'Segoe UI',system-ui,sans-serif" }}>
            <HoloShimmer opacity={0.05} />

            {/* ── HEADER ── */}
            <div style={{ background: d.header_bg, padding: '9px 12px 7px', position: 'relative', overflow: 'hidden' }}>
                {/* Corner shine */}
                <div style={{ position: 'absolute', top: -20, right: -20, width: 70, height: 70, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {/* School emblem placeholder */}
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.2)', border: '1.5px solid rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 16 }}>
                        {school?.logo_url ? <img src={school.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 6 }} /> : '🏫'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 10, fontWeight: 900, color: d.header_text || '#fff', textTransform: 'uppercase', letterSpacing: '0.06em', lineHeight: 1.2 }}>{school?.school_name || 'AlphaSchool'}</p>
                        {school?.motto && <p style={{ margin: 0, fontSize: 6.5, color: 'rgba(255,255,255,0.75)', fontStyle: 'italic' }}>"{school.motto}"</p>}
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.35)', borderRadius: 5, padding: '2px 7px', flexShrink: 0 }}>
                        <p style={{ margin: 0, fontSize: 6.5, fontWeight: 900, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Student ID</p>
                    </div>
                </div>
            </div>

            {/* ── BODY ── */}
            <div style={{ display: 'flex', gap: 10, padding: '9px 12px 0' }}>
                {/* Photo box */}
                <div style={{ flexShrink: 0 }}>
                    <div style={{
                        width: 66, height: 82, borderRadius: 10,
                        border: `2.5px solid ${accent}`,
                        overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: student.photo_url ? 'transparent' : `linear-gradient(135deg,${accent}22,${accent}44)`,
                        boxShadow: `0 0 0 3px ${accent}18`,
                    }}>
                        {student.photo_url
                            ? <img src={student.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <span style={{ fontSize: 22, fontWeight: 900, color: accent, letterSpacing: -1 }}>{initials}</span>
                        }
                    </div>
                    {/* Card number under photo */}
                    <p style={{ margin: '3px 0 0', fontSize: 6, color: '#9ca3af', textAlign: 'center', fontFamily: 'monospace', letterSpacing: '0.05em' }}>{student.card_number || admNo}</p>
                </div>

                {/* Info grid */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {/* Name */}
                    <div>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 900, color: '#111827', lineHeight: 1.15 }}>{student.first_name} {student.middle_name ? student.middle_name + ' ' : ''}{student.last_name}</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 1 }}>
                            <span style={{ fontSize: 8, background: accent, color: '#fff', borderRadius: 4, padding: '1px 6px', fontWeight: 700 }}>{formName}{streamName ? ` · ${streamName}` : ''}</span>
                            {student.gender && <span style={{ fontSize: 8, color: '#6b7280' }}>{student.gender}</span>}
                        </div>
                    </div>

                    {/* Data rows */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 10px', marginTop: 2 }}>
                        {[
                            { l: 'Adm No', v: admNo, bold: true, color: accent },
                            { l: 'Blood Grp', v: student.blood_group || '—', bold: true, color: '#dc2626' },
                            { l: 'D.O.B', v: student.date_of_birth ? new Date(student.date_of_birth).toLocaleDateString('en-GB') : '—', bold: false, color: '#374151' },
                            { l: 'Valid Until', v: String(year), bold: true, color: '#059669' },
                        ].map(f => (
                            <div key={f.l}>
                                <p style={{ margin: 0, fontSize: 6.5, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{f.l}</p>
                                <p style={{ margin: 0, fontSize: f.bold ? 9.5 : 9, fontWeight: f.bold ? 800 : 500, color: f.color }}>{f.v}</p>
                            </div>
                        ))}
                    </div>

                    {/* Guardian mini */}
                    <div style={{ borderTop: `1px solid ${accent}22`, paddingTop: 4, marginTop: 1 }}>
                        <p style={{ margin: 0, fontSize: 7, color: '#6b7280', lineHeight: 1.3 }}>
                            <span style={{ fontWeight: 700 }}>Guardian: </span>{student.guardian_name || '—'} · <span style={{ fontFamily: 'monospace' }}>{student.guardian_phone || '—'}</span>
                        </p>
                    </div>
                </div>

                {/* QR / Barcode column */}
                <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, justifyContent: 'center' }}>
                    {qrDataUrl
                        ? <img src={qrDataUrl} alt="QR" width={40} height={40} style={{ borderRadius: 4, border: `1px solid ${accent}33` }} />
                        : <MiniQR value={admNo} size={40} color={accent} />
                    }
                    <p style={{ margin: 0, fontSize: 5.5, color: '#9ca3af', textAlign: 'center' }}>SCAN</p>
                </div>
            </div>

            {/* ── FOOTER BAR ── */}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 28, background: `linear-gradient(90deg,${accent}ee,${accent}bb)`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {/* Kenya flag strip */}
                    {['#000000', '#cc0001', '#006600'].map((c, i) => <div key={i} style={{ width: 14, height: 8, background: c, borderRadius: 1 }} />)}
                    <p style={{ margin: 0, fontSize: 6.5, color: 'rgba(255,255,255,0.8)', marginLeft: 4 }}>🇰🇪 Kenya</p>
                </div>
                {barcodeSvg && <div dangerouslySetInnerHTML={{ __html: barcodeSvg }} style={{ opacity: 0.85 }} />}
                <p style={{ margin: 0, fontSize: 6.5, color: 'rgba(255,255,255,0.7)' }}>apsims.co.ke</p>
            </div>
        </div>
    );
}

// ─── STUDENT CARD BACK ────────────────────────────────────────────────────────
export function StudentCardBack({ student, school, template }: any) {
    const d = template?.back_design || template?.front_design || { header_bg: 'linear-gradient(135deg,#1e3a8a,#1d4ed8)', accent: '#1d4ed8' };
    const accent = d.accent || '#1d4ed8';
    const admNo = student.card_number || student.admission_no || student.admission_number || '—';
    const barcodeSvg = admNo !== '—' ? generateBarcodeSvg(admNo) : '';
    const year = new Date().getFullYear();

    return (
        <div style={{ position: 'relative', width: 340, height: 214, borderRadius: 14, overflow: 'hidden', background: '#f8fafc', boxShadow: '0 8px 32px rgba(0,0,0,0.18)', fontFamily: "'Segoe UI',system-ui,sans-serif" }}>
            <HoloShimmer opacity={0.04} />
            {/* Top band */}
            <div style={{ height: 8, background: d.header_bg }} />

            {/* Main content */}
            <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6, height: 'calc(100% - 36px)' }}>
                {/* School header */}
                <div style={{ textAlign: 'center', borderBottom: `1px solid ${accent}22`, paddingBottom: 5 }}>
                    <p style={{ margin: 0, fontSize: 9.5, fontWeight: 900, color: '#111827', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{school?.school_name || 'AlphaSchool'}</p>
                    <p style={{ margin: 0, fontSize: 7, color: '#6b7280' }}>STUDENT IDENTITY CARD · BACK</p>
                </div>

                {/* Two-column info */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    {/* Emergency contact */}
                    <div style={{ background: '#fff', borderRadius: 8, border: `1.5px solid ${accent}33`, padding: '6px 8px' }}>
                        <p style={{ margin: '0 0 3px', fontSize: 7.5, fontWeight: 900, color: accent, textTransform: 'uppercase', letterSpacing: '0.05em' }}>🆘 Emergency Contact</p>
                        <p style={{ margin: 0, fontSize: 8, fontWeight: 700, color: '#111827' }}>{student.emergency_contact_name || student.guardian_name || '—'}</p>
                        <p style={{ margin: 0, fontSize: 7.5, color: '#374151', fontFamily: 'monospace' }}>{student.emergency_contact_phone || student.guardian_phone || '—'}</p>
                        {student.guardian_relationship && <p style={{ margin: '2px 0 0', fontSize: 7, color: '#6b7280' }}>({student.guardian_relationship})</p>}
                    </div>

                    {/* Medical info */}
                    <div style={{ background: '#fff4f4', borderRadius: 8, border: '1.5px solid #fca5a5', padding: '6px 8px' }}>
                        <p style={{ margin: '0 0 3px', fontSize: 7.5, fontWeight: 900, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.05em' }}>🩸 Medical Info</p>
                        <p style={{ margin: 0, fontSize: 8.5, fontWeight: 900, color: '#dc2626' }}>Blood: {student.blood_group || '—'}</p>
                        <p style={{ margin: '2px 0 0', fontSize: 7, color: '#374151', lineHeight: 1.3 }}>{student.medical_conditions || student.medical_info || 'No known conditions'}</p>
                    </div>
                </div>

                {/* Terms */}
                <div style={{ background: '#fff', borderRadius: 6, border: '1px solid #e5e7eb', padding: '5px 8px' }}>
                    <p style={{ margin: '0 0 2px', fontSize: 7, fontWeight: 800, color: '#374151' }}>TERMS OF USE</p>
                    <p style={{ margin: 0, fontSize: 6.5, color: '#6b7280', lineHeight: 1.5 }}>
                        This card is the property of {school?.school_name || 'AlphaSchool'} and must be carried at all times while on school premises. Not transferable. If found, please return to the school office. Misuse of this card will lead to disciplinary action.
                    </p>
                </div>
            </div>

            {/* Footer */}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 28, background: `linear-gradient(90deg,${accent}dd,${accent}99)`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 10px' }}>
                <div style={{ fontSize: 6.5, color: 'rgba(255,255,255,0.8)' }}>
                    <p style={{ margin: 0 }}>{school?.phone1 || '+254-000-000'} · {school?.email || 'info@school.ac.ke'}</p>
                </div>
                {barcodeSvg && <div dangerouslySetInnerHTML={{ __html: barcodeSvg }} style={{ opacity: 0.8 }} />}
                <div style={{ fontSize: 6.5, color: 'rgba(255,255,255,0.7)', textAlign: 'right' }}>
                    <p style={{ margin: 0 }}>No: {admNo}</p>
                    <p style={{ margin: 0 }}>Issued: {year}</p>
                </div>
            </div>
        </div>
    );
}

// ─── STAFF CARD FRONT ─────────────────────────────────────────────────────────
export function StaffCardFront({ staff, school, template, qrDataUrl }: any) {
    const d = template?.front_design || { header_bg: 'linear-gradient(135deg,#7f1d1d,#991b1b,#dc2626)', header_text: '#ffffff', body_bg: '#ffffff', accent: '#dc2626', photo_border: '#dc2626' };
    const accent = d.accent || '#dc2626';
    const barcodeSvg = staff.card_number ? generateBarcodeSvg(staff.card_number) : '';
    const initials = `${staff.first_name?.charAt(0) || '?'}${staff.last_name?.charAt(0) || '?'}`;
    const year = staff.card_expiry_date ? new Date(staff.card_expiry_date).getFullYear() : new Date().getFullYear();

    return (
        <div style={{ position: 'relative', width: 340, height: 214, borderRadius: 14, overflow: 'hidden', background: d.body_bg || '#fff', boxShadow: '0 8px 32px rgba(0,0,0,0.18)', fontFamily: "'Segoe UI',system-ui,sans-serif" }}>
            <HoloShimmer opacity={0.05} />

            {/* HEADER */}
            <div style={{ background: d.header_bg, padding: '9px 12px 7px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: -15, right: -15, width: 60, height: 60, borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.2)', border: '1.5px solid rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 16 }}>
                        {school?.logo_url ? <img src={school.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 6 }} /> : '🏫'}
                    </div>
                    <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontSize: 10, fontWeight: 900, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{school?.school_name || 'AlphaSchool'}</p>
                        {school?.motto && <p style={{ margin: 0, fontSize: 6.5, color: 'rgba(255,255,255,0.75)', fontStyle: 'italic' }}>"{school.motto}"</p>}
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.4)', borderRadius: 5, padding: '2px 7px', flexShrink: 0 }}>
                        <p style={{ margin: 0, fontSize: 6.5, fontWeight: 900, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Staff ID</p>
                    </div>
                </div>
            </div>

            {/* BODY */}
            <div style={{ display: 'flex', gap: 10, padding: '9px 12px 0' }}>
                <div style={{ flexShrink: 0 }}>
                    <div style={{ width: 66, height: 82, borderRadius: 10, border: `2.5px solid ${accent}`, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: staff.photo_url ? 'transparent' : `linear-gradient(135deg,${accent}22,${accent}44)`, boxShadow: `0 0 0 3px ${accent}18` }}>
                        {staff.photo_url
                            ? <img src={staff.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <span style={{ fontSize: 22, fontWeight: 900, color: accent }}>{initials}</span>
                        }
                    </div>
                    <p style={{ margin: '3px 0 0', fontSize: 6, color: '#9ca3af', textAlign: 'center', fontFamily: 'monospace' }}>{staff.card_number || staff.staff_number || ''}</p>
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <div>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 900, color: '#111827', lineHeight: 1.15 }}>{staff.first_name} {staff.last_name}</p>
                        <div style={{ display: 'flex', gap: 5, marginTop: 2 }}>
                            <span style={{ fontSize: 8, background: accent, color: '#fff', borderRadius: 4, padding: '1px 6px', fontWeight: 700 }}>{staff.role || staff.designation || 'Staff'}</span>
                            {staff.department && <span style={{ fontSize: 8, color: '#6b7280' }}>{staff.department}</span>}
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 10px', marginTop: 2 }}>
                        {[
                            { l: 'Staff No', v: staff.staff_number || staff.employee_id || '—', bold: true, color: accent },
                            { l: 'Valid Until', v: String(year), bold: true, color: '#059669' },
                            { l: 'TSC No', v: staff.tsc_number || '—', bold: false, color: '#374151' },
                            { l: 'Gender', v: staff.gender || '—', bold: false, color: '#374151' },
                        ].map(f => (
                            <div key={f.l}>
                                <p style={{ margin: 0, fontSize: 6.5, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{f.l}</p>
                                <p style={{ margin: 0, fontSize: f.bold ? 9.5 : 9, fontWeight: f.bold ? 800 : 500, color: f.color }}>{f.v}</p>
                            </div>
                        ))}
                    </div>
                    <div style={{ borderTop: `1px solid ${accent}22`, paddingTop: 4, marginTop: 1 }}>
                        <p style={{ margin: 0, fontSize: 7, color: '#6b7280' }}>
                            <span style={{ fontWeight: 700 }}>Contact: </span><span style={{ fontFamily: 'monospace' }}>{staff.phone || staff.phone_number || '—'}</span>
                        </p>
                    </div>
                </div>

                <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, justifyContent: 'center' }}>
                    {qrDataUrl
                        ? <img src={qrDataUrl} alt="QR" width={40} height={40} style={{ borderRadius: 4, border: `1px solid ${accent}33` }} />
                        : <MiniQR value={staff.staff_number || staff.id?.toString() || 'STAFF'} size={40} color={accent} />
                    }
                    <p style={{ margin: 0, fontSize: 5.5, color: '#9ca3af', textAlign: 'center' }}>SCAN</p>
                </div>
            </div>

            {/* FOOTER */}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 28, background: `linear-gradient(90deg,${accent}ee,${accent}bb)`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {['#000000', '#cc0001', '#006600'].map((c, i) => <div key={i} style={{ width: 14, height: 8, background: c, borderRadius: 1 }} />)}
                    <p style={{ margin: 0, fontSize: 6.5, color: 'rgba(255,255,255,0.8)', marginLeft: 4 }}>🇰🇪 Kenya</p>
                </div>
                {barcodeSvg && <div dangerouslySetInnerHTML={{ __html: barcodeSvg }} style={{ opacity: 0.85 }} />}
                <p style={{ margin: 0, fontSize: 6.5, color: 'rgba(255,255,255,0.7)' }}>apsims.co.ke</p>
            </div>
        </div>
    );
}

// ─── STAFF CARD BACK ──────────────────────────────────────────────────────────
export function StaffCardBack({ staff, school, template }: any) {
    const d = template?.back_design || template?.front_design || { header_bg: 'linear-gradient(135deg,#7f1d1d,#dc2626)', accent: '#dc2626' };
    const accent = d.accent || '#dc2626';
    const barcodeSvg = (staff.card_number || staff.staff_number) ? generateBarcodeSvg(staff.card_number || staff.staff_number || '') : '';
    const year = new Date().getFullYear();

    return (
        <div style={{ position: 'relative', width: 340, height: 214, borderRadius: 14, overflow: 'hidden', background: '#f8fafc', boxShadow: '0 8px 32px rgba(0,0,0,0.18)', fontFamily: "'Segoe UI',system-ui,sans-serif" }}>
            <HoloShimmer opacity={0.04} />
            <div style={{ height: 8, background: d.header_bg }} />
            <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6, height: 'calc(100% - 36px)' }}>
                <div style={{ textAlign: 'center', borderBottom: `1px solid ${accent}22`, paddingBottom: 5 }}>
                    <p style={{ margin: 0, fontSize: 9.5, fontWeight: 900, color: '#111827', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{school?.school_name || 'AlphaSchool'}</p>
                    <p style={{ margin: 0, fontSize: 7, color: '#6b7280' }}>STAFF IDENTITY CARD · BACK</p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    <div style={{ background: '#fff', borderRadius: 8, border: `1.5px solid ${accent}33`, padding: '6px 8px' }}>
                        <p style={{ margin: '0 0 3px', fontSize: 7.5, fontWeight: 900, color: accent, textTransform: 'uppercase' }}>🆘 Emergency Contact</p>
                        <p style={{ margin: 0, fontSize: 8, fontWeight: 700, color: '#111827' }}>{staff.emergency_contact_name || staff.next_of_kin || '—'}</p>
                        <p style={{ margin: 0, fontSize: 7.5, color: '#374151', fontFamily: 'monospace' }}>{staff.emergency_contact_phone || '—'}</p>
                    </div>
                    <div style={{ background: '#fff4f4', borderRadius: 8, border: '1.5px solid #fca5a5', padding: '6px 8px' }}>
                        <p style={{ margin: '0 0 3px', fontSize: 7.5, fontWeight: 900, color: '#dc2626', textTransform: 'uppercase' }}>🩸 Medical</p>
                        <p style={{ margin: 0, fontSize: 8.5, fontWeight: 900, color: '#dc2626' }}>Blood: {staff.blood_group || '—'}</p>
                        <p style={{ margin: '2px 0 0', fontSize: 7, color: '#374151' }}>{staff.medical_conditions || 'None known'}</p>
                    </div>
                </div>
                <div style={{ background: '#fff', borderRadius: 6, border: '1px solid #e5e7eb', padding: '5px 8px' }}>
                    <p style={{ margin: '0 0 2px', fontSize: 7, fontWeight: 800, color: '#374151' }}>TERMS OF USE</p>
                    <p style={{ margin: 0, fontSize: 6.5, color: '#6b7280', lineHeight: 1.5 }}>
                        This card is the property of {school?.school_name || 'AlphaSchool'}. It must be worn visibly at all times on school premises. If found, please return to the school office. Misuse will result in disciplinary action.
                    </p>
                </div>
            </div>
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 28, background: `linear-gradient(90deg,${accent}dd,${accent}99)`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 10px' }}>
                <p style={{ margin: 0, fontSize: 6.5, color: 'rgba(255,255,255,0.8)' }}>{school?.phone1 || '+254-000-000'}</p>
                {barcodeSvg && <div dangerouslySetInnerHTML={{ __html: barcodeSvg }} style={{ opacity: 0.8 }} />}
                <p style={{ margin: 0, fontSize: 6.5, color: 'rgba(255,255,255,0.7)' }}>Issued: {year}</p>
            </div>
        </div>
    );
}

// ── BusPassCardPreview ────────────────────────────────────────────────────────
export function BusPassCardPreview({ busPass, student, school, getFormName }: any) {
    return (
        <div style={{ width: 320, borderRadius: 16, overflow: 'hidden', fontFamily: 'sans-serif', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', border: '1px solid #e5e7eb' }}>
            <div style={{ background: 'linear-gradient(135deg,#1d4ed8,#7c3aed)', padding: '16px 20px', color: '#fff' }}>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, opacity: 0.85, marginBottom: 4 }}>
                    {school?.school_name || 'SCHOOL NAME'} · BUS PASS
                </div>
                <div style={{ fontSize: 20, fontWeight: 900 }}>
                    {student?.first_name} {student?.last_name}
                </div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>{getFormName ? getFormName() : ''}</div>
            </div>
            <div style={{ background: '#f8fafc', padding: '12px 20px', fontSize: 12, color: '#374151' }}>
                <div><b>Route:</b> {busPass?.route_name}</div>
                <div><b>Driver:</b> {busPass?.driver_name} · {busPass?.driver_phone}</div>
                <div><b>Pickup:</b> {busPass?.pickup_point}</div>
                <div><b>Drop-off:</b> {busPass?.dropoff_point}</div>
                <div style={{ marginTop: 8, fontSize: 10, color: '#9ca3af' }}>
                    Card No: {busPass?.card_number} · Expires: {busPass?.expiry_date}
                </div>
            </div>
        </div>
    );
}

// ── VisitorCardPreview ────────────────────────────────────────────────────────
export function VisitorCardPreview({ visitor, school }: any) {
    return (
        <div style={{ width: 300, borderRadius: 16, overflow: 'hidden', fontFamily: 'sans-serif', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', border: '1px solid #e5e7eb' }}>
            <div style={{ background: 'linear-gradient(135deg,#059669,#0d9488)', padding: '16px 20px', color: '#fff' }}>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, opacity: 0.85, marginBottom: 4 }}>
                    {school?.school_name || 'SCHOOL NAME'} · VISITOR PASS
                </div>
                <div style={{ fontSize: 18, fontWeight: 900 }}>
                    {visitor?.visitor_name || 'Visitor Name'}
                </div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>{visitor?.purpose}</div>
            </div>
            <div style={{ background: '#f8fafc', padding: '12px 20px', fontSize: 12, color: '#374151' }}>
                <div><b>Host:</b> {visitor?.host_name}</div>
                <div><b>Phone:</b> {visitor?.visitor_phone}</div>
                <div><b>ID No:</b> {visitor?.id_number}</div>
                <div style={{ marginTop: 8, fontSize: 10, color: '#9ca3af' }}>
                    Badge: {visitor?.badge_number} · Date: {visitor?.visit_date}
                </div>
            </div>
        </div>
    );
}
