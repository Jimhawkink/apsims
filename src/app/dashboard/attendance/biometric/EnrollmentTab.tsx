'use client';
import { useState, useMemo, useRef } from 'react';
import toast from 'react-hot-toast';
import { FiSearch, FiUserCheck, FiUserX, FiUpload, FiDownload, FiUsers } from 'react-icons/fi';
import { BiometricDevice, BiometricEnrollment } from '@/lib/biometric-types';

interface Student {
  id: number;
  first_name: string;
  last_name: string;
  admission_number: string;
  form_id: number;
  biometric_enrolled: boolean;
  biometric_device_user_id: string | null;
}

interface Props {
  devices: BiometricDevice[];
  enrollments: BiometricEnrollment[];
  students: Student[];
  onRefresh: () => void;
}

export default function EnrollmentTab({ devices, enrollments, students, onRefresh }: Props) {
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [enrollForm, setEnrollForm] = useState({ device_id: '', enrollment_type: 'fingerprint', device_user_id: '' });
  const [saving, setSaving] = useState(false);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const enrolled = students.filter(s => s.biometric_enrolled).length;
  const unenrolled = students.length - enrolled;
  const pct = students.length > 0 ? Math.round((enrolled / students.length) * 100) : 0;

  const filtered = useMemo(() => {
    if (!search.trim()) return students;
    const q = search.toLowerCase();
    return students.filter(s =>
      `${s.first_name} ${s.last_name}`.toLowerCase().includes(q) ||
      s.admission_number.toLowerCase().includes(q)
    );
  }, [students, search]);

  const openEnroll = (s: Student) => {
    setSelectedStudent(s);
    setEnrollForm({ device_id: devices[0]?.id?.toString() || '', enrollment_type: 'fingerprint', device_user_id: '' });
    setShowModal(true);
  };

  const handleEnroll = async () => {
    if (!selectedStudent || !enrollForm.device_id || !enrollForm.device_user_id) {
      toast.error('All fields are required'); return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/biometric/enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: selectedStudent.id, device_id: parseInt(enrollForm.device_id), enrollment_type: enrollForm.enrollment_type, device_user_id: enrollForm.device_user_id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`${selectedStudent.first_name} enrolled successfully`);
      setShowModal(false);
      onRefresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Enrollment failed');
    } finally { setSaving(false); }
  };

  const handleDeactivate = async (enrollmentId: number, studentName: string) => {
    if (!confirm(`Deactivate biometric enrollment for ${studentName}?`)) return;
    const res = await fetch('/api/biometric/enrollments', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: enrollmentId, is_active: false }),
    });
    if (res.ok) { toast.success('Enrollment deactivated'); onRefresh(); }
    else toast.error('Failed to deactivate');
  };

  const handleCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const lines = text.split('\n').filter(l => l.trim());
    const errors: string[] = [];
    let success = 0;

    for (let i = 1; i < lines.length; i++) {
      const [admission_number, device_user_id, device_id, enrollment_type] = lines[i].split(',').map(s => s.trim());
      const student = students.find(s => s.admission_number === admission_number);
      if (!student) { errors.push(`Row ${i + 1}: Student "${admission_number}" not found`); continue; }
      const res = await fetch('/api/biometric/enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: student.id, device_id: parseInt(device_id), enrollment_type: enrollment_type || 'fingerprint', device_user_id }),
      });
      if (res.ok) success++; else errors.push(`Row ${i + 1}: Failed to enroll ${admission_number}`);
    }

    setCsvErrors(errors);
    toast.success(`Bulk enrollment: ${success} enrolled, ${errors.length} errors`);
    if (fileRef.current) fileRef.current.value = '';
    onRefresh();
  };

  const downloadErrors = () => {
    const blob = new Blob([csvErrors.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'enrollment_errors.txt'; a.click();
  };

  const getStudentEnrollments = (studentId: number) =>
    enrollments.filter(e => e.student_id === studentId && e.is_active);

  return (
    <div>
      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-green-50 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-green-700">{enrolled}</div>
          <div className="text-xs text-green-600 mt-0.5">Enrolled</div>
        </div>
        <div className="bg-amber-50 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-amber-700">{unenrolled}</div>
          <div className="text-xs text-amber-600 mt-0.5">Not Enrolled</div>
        </div>
        <div className="bg-indigo-50 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-indigo-700">{pct}%</div>
          <div className="text-xs text-indigo-600 mt-0.5">Coverage</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-48">
          <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search students..."
            className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
        </div>
        <label className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
          <FiUpload size={14} /> Bulk CSV
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleCSV} />
        </label>
        {csvErrors.length > 0 && (
          <button onClick={downloadErrors} className="flex items-center gap-1.5 text-sm text-red-600 px-3 py-2 rounded-lg border border-red-200 hover:bg-red-50">
            <FiDownload size={14} /> {csvErrors.length} errors
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Student</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Adm No.</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Device ID</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Devices</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map(s => {
              const studentEnrollments = getStudentEnrollments(s.id);
              return (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{s.first_name} {s.last_name}</td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{s.admission_number}</td>
                  <td className="px-4 py-3">
                    {s.biometric_enrolled
                      ? <span className="flex items-center gap-1 text-green-700 bg-green-50 px-2 py-0.5 rounded-full text-xs font-medium w-fit"><FiUserCheck size={11} />Enrolled</span>
                      : <span className="flex items-center gap-1 text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full text-xs font-medium w-fit"><FiUserX size={11} />Not enrolled</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{s.biometric_device_user_id || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {studentEnrollments.map(e => (
                        <span key={e.id} className="text-xs bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded">
                          {(e.device as { device_name?: string })?.device_name || `Device ${e.device_id}`}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => openEnroll(s)} className="text-xs bg-indigo-600 text-white px-2.5 py-1 rounded-lg hover:bg-indigo-700">Enroll</button>
                      {studentEnrollments.map(e => (
                        <button key={e.id} onClick={() => handleDeactivate(e.id, `${s.first_name} ${s.last_name}`)}
                          className="text-xs bg-red-50 text-red-600 px-2.5 py-1 rounded-lg hover:bg-red-100">Deactivate</button>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-10 text-gray-400">
            <FiUsers size={32} className="mx-auto mb-2 opacity-30" />
            <p>No students found</p>
          </div>
        )}
      </div>

      {/* Enroll Modal */}
      {showModal && selectedStudent && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Enroll Student</h2>
              <p className="text-sm text-gray-500 mt-0.5">{selectedStudent.first_name} {selectedStudent.last_name}</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Device *</label>
                <select value={enrollForm.device_id} onChange={e => setEnrollForm(f => ({ ...f, device_id: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                  {devices.map(d => <option key={d.id} value={d.id}>{d.device_name} ({d.brand})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Enrollment Type</label>
                <select value={enrollForm.enrollment_type} onChange={e => setEnrollForm(f => ({ ...f, enrollment_type: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                  {['fingerprint', 'face', 'card'].map(t => <option key={t} className="capitalize">{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Device User ID *</label>
                <input value={enrollForm.device_user_id} onChange={e => setEnrollForm(f => ({ ...f, device_user_id: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  placeholder="ID assigned on the device (e.g. 1001)" />
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex gap-3 justify-end">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button onClick={handleEnroll} disabled={saving}
                className="px-5 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                {saving ? 'Enrolling...' : 'Enroll Student'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
