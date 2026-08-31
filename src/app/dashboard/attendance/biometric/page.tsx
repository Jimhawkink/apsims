'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { FiCpu, FiUsers, FiList, FiRefreshCw } from 'react-icons/fi';
import { BiometricDevice, BiometricEnrollment } from '@/lib/biometric-types';
import DevicesTab from './DevicesTab';
import EnrollmentTab from './EnrollmentTab';
import PunchLogTab from './PunchLogTab';
import SyncTab from './SyncTab';

type Tab = 'devices' | 'enrollment' | 'logs' | 'sync';

interface Student {
  id: number;
  first_name: string;
  last_name: string;
  admission_number: string;
  admission_no?: string;
  form_id: number;
  biometric_enrolled: boolean;
  biometric_device_user_id: string | null;
}

const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'devices', label: 'Devices', icon: FiCpu },
  { id: 'enrollment', label: 'Enrollment', icon: FiUsers },
  { id: 'logs', label: 'Punch Logs', icon: FiList },
  { id: 'sync', label: 'Sync Engine', icon: FiRefreshCw },
];

export default function BiometricPage() {
  const [activeTab, setActiveTab] = useState<Tab>('enrollment');
  const [devices, setDevices] = useState<BiometricDevice[]>([]);
  const [enrollments, setEnrollments] = useState<BiometricEnrollment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Load students DIRECTLY from Supabase (no broken /api/students route)
      const { data: studData } = await supabase
        .from('school_students')
        .select('id, first_name, last_name, admission_number, admission_no, form_id, biometric_enrolled, biometric_device_user_id')
        .eq('status', 'Active')
        .order('first_name')
        .limit(2000);

      setStudents((studData || []).map((s: any) => ({
        ...s,
        admission_number: s.admission_number || s.admission_no || '',
        biometric_enrolled: s.biometric_enrolled || false,
        biometric_device_user_id: s.biometric_device_user_id || null,
      })));

      // Load devices + enrollments (these APIs exist)
      const [devRes, enrollRes] = await Promise.all([
        fetch('/api/biometric/devices').catch(() => null),
        fetch('/api/biometric/enrollments').catch(() => null),
      ]);
      if (devRes?.ok) { const d = await devRes.json(); if (d.devices) setDevices(d.devices); }
      if (enrollRes?.ok) { const e = await enrollRes.json(); if (e.enrollments) setEnrollments(e.enrollments); }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
          <FiCpu className="text-white" size={20} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Biometric Attendance</h1>
          <p className="text-sm text-gray-500">ZKTeco · Hikvision · Suprema device management</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 w-fit">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <FiRefreshCw size={28} className="animate-spin text-indigo-400 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Loading biometric data...</p>
          </div>
        </div>
      ) : (
        <>
          {activeTab === 'devices' && <DevicesTab devices={devices} onRefresh={fetchData} />}
          {activeTab === 'enrollment' && (
            <EnrollmentTab devices={devices} enrollments={enrollments} students={students} onRefresh={fetchData} />
          )}
          {activeTab === 'logs' && <PunchLogTab devices={devices} />}
          {activeTab === 'sync' && <SyncTab />}
        </>
      )}
    </div>
  );
}
