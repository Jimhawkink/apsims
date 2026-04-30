'use client';
import { useRef, useEffect } from 'react';

function generateBarcodeSvg(code: string): string {
    const bars: string[] = [];
    let x = 0;
    for (let i = 0; i < code.length; i++) {
        const charCode = code.charCodeAt(i);
        const width = (charCode % 3) + 1;
        const isBar = i % 2 === 0;
        if (isBar) {
            bars.push(`<rect x="${x}" y="0" width="${width}" height="30" fill="#1a1a1a"/>`);
        }
        x += width + 0.5;
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${x} 30" width="${Math.min(x * 1.5, 120)}" height="25">${bars.join('')}</svg>`;
}

export function StudentCardFront({ student, school, template, getFormName, getStreamName, qrDataUrl }: any) {
    const design = template?.front_design || { header_bg: 'linear-gradient(135deg, #1e40af, #3b82f6)', header_text: '#ffffff', body_bg: '#ffffff', accent: '#3b82f6', photo_border: '#3b82f6' };
    const barcodeSvg = student.card_number ? generateBarcodeSvg(student.card_number) : '';

    return (
        <div className="relative rounded-xl overflow-hidden shadow-lg border border-gray-200" style={{ width: 340, height: 214, background: design.body_bg || '#fff' }}>
            {/* Header */}
            <div className="py-2 px-3 text-center" style={{ background: design.header_bg, color: design.header_text || '#fff' }}>
                <p className="text-[10px] font-bold uppercase tracking-wider leading-tight">{school?.school_name || 'Alpha School'}</p>
                {school?.motto && <p className="text-[7px] italic opacity-80">{`"${school.motto}"`}</p>}
                <p className="text-[6px] mt-0.5 font-bold uppercase tracking-widest bg-white/20 inline-block px-2 py-px rounded-full">Student Identity Card</p>
            </div>
            {/* Body */}
            <div className="px-3 py-2 flex gap-2.5">
                {/* Photo */}
                <div className="flex-shrink-0">
                    <div className="w-16 h-20 rounded-lg border-2 flex items-center justify-center text-white font-bold text-lg overflow-hidden"
                        style={{ borderColor: design.photo_border || design.accent, background: student.photo_url ? 'transparent' : `linear-gradient(135deg, ${design.accent}, ${design.header_bg?.includes('#') ? design.accent : '#3b82f6'})` }}>
                        {student.photo_url ? <img src={student.photo_url} alt="" className="w-full h-full object-cover" /> : `${student.first_name?.charAt(0)}${student.last_name?.charAt(0)}`}
                    </div>
                </div>
                {/* Info */}
                <div className="flex-1 space-y-0.5 text-[9px] leading-tight">
                    <div><span className="text-gray-400 font-semibold">Name:</span><p className="font-bold text-gray-800 text-[11px]">{student.first_name} {student.middle_name || ''} {student.last_name}</p></div>
                    <div><span className="text-gray-400 font-semibold">Adm No:</span><span className="font-bold ml-1" style={{ color: design.accent }}>{student.admission_no || student.admission_number}</span></div>
                    <div className="flex gap-3">
                        <div><span className="text-gray-400 font-semibold">Form:</span><span className="font-bold text-gray-700 ml-1">{getFormName(student.form_id)}</span></div>
                        <div><span className="text-gray-400 font-semibold">Stream:</span><span className="font-bold text-gray-700 ml-1">{getStreamName(student.stream_id)}</span></div>
                    </div>
                    <div className="flex gap-3">
                        <div><span className="text-gray-400 font-semibold">DOB:</span><span className="font-medium text-gray-700 ml-1">{student.date_of_birth ? new Date(student.date_of_birth).toLocaleDateString('en-GB') : '-'}</span></div>
                        <div><span className="text-gray-400 font-semibold">Gender:</span><span className="font-medium text-gray-700 ml-1">{student.gender}</span></div>
                    </div>
                    <div><span className="text-gray-400 font-semibold">Blood Group:</span><span className="font-bold text-red-600 ml-1">{student.blood_group || '-'}</span></div>
                </div>
            </div>
            {/* Footer with barcode */}
            <div className="absolute bottom-0 left-0 right-0 px-3 py-1.5 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between">
                <div className="text-[7px] text-gray-400 leading-tight">
                    <p>Guardian: {student.guardian_name || '-'}</p>
                    <p>Tel: {student.guardian_phone || '-'}</p>
                </div>
                <div className="flex items-center gap-1.5">
                    {barcodeSvg && <div dangerouslySetInnerHTML={{ __html: barcodeSvg }} />}
                    {qrDataUrl && <img src={qrDataUrl} alt="QR" width={22} height={22} className="rounded-sm" />}
                </div>
                <div className="text-right text-[7px] text-gray-400">
                    <p className="font-bold">ID: {student.card_number || student.admission_no || '-'}</p>
                    <p>Valid: {student.card_expiry_date ? new Date(student.card_expiry_date).getFullYear() : new Date().getFullYear()}</p>
                </div>
            </div>
        </div>
    );
}

export function StudentCardBack({ student, school, template }: any) {
    const design = template?.back_design || template?.front_design || { header_bg: 'linear-gradient(135deg, #1e40af, #3b82f6)', accent: '#3b82f6' };
    const barcodeSvg = student.card_number ? generateBarcodeSvg(student.card_number) : '';

    return (
        <div className="relative rounded-xl overflow-hidden shadow-lg border border-gray-200" style={{ width: 340, height: 214, background: '#ffffff' }}>
            {/* Top accent bar */}
            <div className="h-2" style={{ background: design.header_bg || design.accent || '#3b82f6' }} />
            <div className="px-4 py-3 text-[8px] space-y-2">
                <div className="text-center">
                    <p className="font-bold text-gray-800 text-[10px] uppercase tracking-wider">{school?.school_name || 'Alpha School'}</p>
                    <p className="text-gray-400">STUDENT IDENTITY CARD — BACK</p>
                </div>
                <div className="border border-gray-200 rounded-lg p-2 space-y-1">
                    <p className="font-bold text-gray-700 text-[9px]">Emergency Contact</p>
                    <p className="text-gray-600">Name: {student.emergency_contact_name || student.guardian_name || '-'}</p>
                    <p className="text-gray-600">Phone: {student.emergency_contact_phone || student.guardian_phone || '-'}</p>
                </div>
                <div className="border border-gray-200 rounded-lg p-2 space-y-1">
                    <p className="font-bold text-gray-700 text-[9px]">Medical Info</p>
                    <p className="text-gray-600">Blood Group: <span className="font-bold text-red-600">{student.blood_group || '-'}</span></p>
                    <p className="text-gray-600">Conditions: {student.medical_conditions || student.medical_info || 'None'}</p>
                </div>
                <div className="flex items-center justify-between mt-1">
                    <div className="text-[7px] text-gray-400">
                        <p>{school?.physical_address || ''}</p>
                        <p>Tel: {school?.phone1 || ''} | Email: {school?.email || ''}</p>
                    </div>
                    {barcodeSvg && <div dangerouslySetInnerHTML={{ __html: barcodeSvg }} />}
                </div>
                <div className="text-center mt-1">
                    <p className="text-[6px] text-gray-300">If found, please return to the school office. Card remains property of the school.</p>
                    <p className="text-[6px] text-gray-300 mt-0.5">Card No: {student.card_number || '-'} | Issued: {student.card_issued_date ? new Date(student.card_issued_date).toLocaleDateString('en-GB') : '-'}</p>
                </div>
            </div>
        </div>
    );
}

export function StaffCardFront({ staff, school, template, qrDataUrl }: any) {
    const design = template?.front_design || { header_bg: 'linear-gradient(135deg, #991b1b, #ef4444)', header_text: '#ffffff', body_bg: '#ffffff', accent: '#ef4444', photo_border: '#ef4444' };
    const barcodeSvg = staff.card_number ? generateBarcodeSvg(staff.card_number) : '';

    return (
        <div className="relative rounded-xl overflow-hidden shadow-lg border border-gray-200" style={{ width: 340, height: 214, background: design.body_bg || '#fff' }}>
            <div className="py-2 px-3 text-center" style={{ background: design.header_bg, color: design.header_text || '#fff' }}>
                <p className="text-[10px] font-bold uppercase tracking-wider">{school?.school_name || 'Alpha School'}</p>
                <p className="text-[6px] mt-0.5 font-bold uppercase tracking-widest bg-white/20 inline-block px-2 py-px rounded-full">Staff Identity Card</p>
            </div>
            <div className="px-3 py-2 flex gap-2.5">
                <div className="flex-shrink-0">
                    <div className="w-16 h-20 rounded-lg border-2 flex items-center justify-center text-white font-bold text-lg"
                        style={{ borderColor: design.photo_border || design.accent, background: `linear-gradient(135deg, ${design.accent}, #991b1b)` }}>
                        {staff.first_name?.charAt(0)}{staff.last_name?.charAt(0)}
                    </div>
                </div>
                <div className="flex-1 space-y-0.5 text-[9px] leading-tight">
                    <div><span className="text-gray-400 font-semibold">Name:</span><p className="font-bold text-gray-800 text-[11px]">{staff.first_name} {staff.middle_name || ''} {staff.last_name}</p></div>
                    <div><span className="text-gray-400 font-semibold">TSC No:</span><span className="font-bold ml-1" style={{ color: design.accent }}>{staff.tsc_number || staff.staff_no || '-'}</span></div>
                    <div><span className="text-gray-400 font-semibold">Role:</span><span className="font-bold text-gray-700 ml-1">{staff.designation || staff.qualification || 'Teacher'}</span></div>
                    <div><span className="text-gray-400 font-semibold">Dept:</span><span className="font-medium text-gray-700 ml-1">{staff.department || '-'}</span></div>
                    <div><span className="text-gray-400 font-semibold">Phone:</span><span className="font-medium text-gray-700 ml-1">{staff.phone || '-'}</span></div>
                </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 px-3 py-1.5 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between">
                <div className="text-[7px] text-gray-400">{staff.email || ''}</div>
                <div className="flex items-center gap-1.5">
                    {barcodeSvg && <div dangerouslySetInnerHTML={{ __html: barcodeSvg }} />}
                    {qrDataUrl && <img src={qrDataUrl} alt="QR" width={22} height={22} className="rounded-sm" />}
                </div>
                <div className="text-right text-[7px] text-gray-400">
                    <p className="font-bold">ID: {staff.card_number || staff.tsc_number || '-'}</p>
                    <p>Valid: {staff.card_expiry_date ? new Date(staff.card_expiry_date).getFullYear() : new Date().getFullYear()}</p>
                </div>
            </div>
        </div>
    );
}

export function VisitorCardPreview({ visitor, school }: any) {
    return (
        <div className="relative rounded-xl overflow-hidden shadow-lg border-2 border-amber-400" style={{ width: 200, height: 300, background: '#ffffff' }}>
            <div className="py-3 px-3 text-center" style={{ background: 'linear-gradient(135deg, #92400e, #f59e0b)', color: '#fff' }}>
                <p className="text-[9px] font-bold uppercase tracking-wider">{school?.school_name || 'Alpha School'}</p>
                <p className="text-[7px] font-bold uppercase tracking-widest bg-white/20 inline-block px-2 py-0.5 rounded-full mt-1">Visitor Pass</p>
            </div>
            <div className="px-3 py-3 text-center space-y-2">
                <div className="w-14 h-14 rounded-full bg-amber-100 border-2 border-amber-400 flex items-center justify-center text-amber-700 font-bold text-xl mx-auto">
                    {visitor.visitor_name?.charAt(0) || '?'}
                </div>
                <p className="font-bold text-gray-800 text-sm">{visitor.visitor_name || 'Visitor Name'}</p>
                <div className="text-[8px] text-gray-500 space-y-0.5">
                    <p>Purpose: {visitor.visitor_purpose || '-'}</p>
                    <p>Host: {visitor.host_person || '-'}</p>
                    <p>ID: {visitor.visitor_id_number || '-'}</p>
                    <p>Phone: {visitor.visitor_phone || '-'}</p>
                </div>
                <div className="border-t border-gray-200 pt-2 text-[7px] text-gray-400">
                    <p>Card: {visitor.card_number || '-'}</p>
                    <p>Check-in: {visitor.check_in_time ? new Date(visitor.check_in_time).toLocaleString() : 'Now'}</p>
                </div>
            </div>
        </div>
    );
}

export function BusPassCardPreview({ busPass, student, school, getFormName }: any) {
    return (
        <div className="relative rounded-xl overflow-hidden shadow-lg border-2 border-cyan-400" style={{ width: 200, height: 280, background: '#ffffff' }}>
            <div className="py-2 px-3 text-center" style={{ background: 'linear-gradient(135deg, #155e75, #06b6d4)', color: '#fff' }}>
                <p className="text-[9px] font-bold uppercase tracking-wider">{school?.school_name || 'Alpha School'}</p>
                <p className="text-[7px] font-bold uppercase tracking-widest bg-white/20 inline-block px-2 py-0.5 rounded-full mt-0.5">Bus Pass</p>
            </div>
            <div className="px-3 py-2 text-[9px] space-y-1.5">
                <p className="font-bold text-gray-800 text-sm text-center">{student ? `${student.first_name} ${student.last_name}` : busPass.student_id}</p>
                <p className="text-center text-gray-500">{student ? getFormName(student.form_id) : '-'}</p>
                <div className="border border-cyan-200 rounded-lg p-2 space-y-0.5">
                    <p><span className="text-gray-400">Route:</span> <span className="font-bold text-cyan-700">{busPass.route_name || '-'}</span></p>
                    <p><span className="text-gray-400">Pickup:</span> {busPass.pickup_point || '-'}</p>
                    <p><span className="text-gray-400">Drop-off:</span> {busPass.dropoff_point || '-'}</p>
                </div>
                <div className="border border-cyan-200 rounded-lg p-2 space-y-0.5">
                    <p><span className="text-gray-400">Driver:</span> {busPass.driver_name || '-'}</p>
                    <p><span className="text-gray-400">Phone:</span> {busPass.driver_phone || '-'}</p>
                </div>
                <div className="text-center text-[7px] text-gray-400 mt-1">
                    <p>Card: {busPass.card_number || '-'}</p>
                    <p>Valid: {busPass.issue_date || '-'} — {busPass.expiry_date || '-'}</p>
                </div>
            </div>
        </div>
    );
}
