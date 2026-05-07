'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { FiDownload, FiTrendingUp, FiUsers, FiDollarSign, FiAlertTriangle } from 'react-icons/fi';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

//  Types 

interface Term {
  id: number;
  term_name: string;
  academic_year: string;
  is_current: boolean;
}

interface MeanTrendItem {
  term_name: string;
  academic_year: string;
  mean_score: number;
}

interface HeatmapItem {
  subject_name: string;
  form_name: string;
  avg_mark: number;
}

interface GradeDistribution {
  A: number;
  B: number;
  C: number;
  D: number;
  E: number;
}

interface TopStudent {
  student_name: string;
  form_name: string;
  stream_name: string;
  mean_score: number;
}

interface SubjectWeakness {
  subject_name: string;
  failure_rate: number;
  student_count: number;
}

interface AcademicData {
  mean_trend: MeanTrendItem[];
  subject_heatmap: HeatmapItem[];
  grade_distribution: GradeDistribution;
  top_students: TopStudent[];
  subject_weakness: SubjectWeakness[];
}

interface MonthlyAttendance {
  month: string;
  attendance_rate: number;
}

interface FormAttendance {
  form_name: string;
  attendance_rate: number;
  present_count: number;
  absent_count: number;
}

interface AttendanceData {
  monthly_trend: MonthlyAttendance[];
  form_attendance: FormAttendance[];
}

interface CollectionByForm {
  form_name: string;
  collection_rate: number;
  outstanding_amount: number;
}

interface MonthlyCollection {
  month: string;
  amount_collected: number;
}

interface FinanceData {
  collection_by_form: CollectionByForm[];
  monthly_collection: MonthlyCollection[];
}

interface DropoutStudent {
  student_name: string;
  form_name: string;
  attendance_rate: number;
  mean_score: number;
  fee_balance: number;
  risk_score: number;
}

type Tab = 'academic' | 'attendance' | 'finance' | 'predictive';

//  Helpers 

function heatColor(avg: number): string {
  if (avg >= 70) return '#16a34a'; // green
  if (avg >= 50) return '#ca8a04'; // yellow
  if (avg >= 40) return '#ea580c'; // orange
  return '#dc2626';                // red
}

function riskColor(score: number): string {
  if (score >= 75) return '#dc2626';
  if (score >= 50) return '#ea580c';
  if (score >= 25) return '#ca8a04';
  return '#16a34a';
}

function fmtKES(n: number): string {
  return `KES ${n.toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}


//  Sub-components 

function Spinner() {
  return (
    <div className="flex justify-center items-center py-16">
      <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function EmptyState({ icon, message }: { icon: string; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
      <span className="text-5xl mb-3">{icon}</span>
      <p className="text-sm">{message}</p>
    </div>
  );
}

//  Academic Tab Components 

function SchoolMeanTrendChart({ data }: { data: MeanTrendItem[] }) {
  if (!data.length) return <EmptyState icon="" message="No trend data available" />;
  const chartData = {
    labels: data.map(d => `${d.term_name} ${d.academic_year}`),
    datasets: [{
      label: 'Mean Score',
      data: data.map(d => d.mean_score),
      borderColor: '#6366f1',
      backgroundColor: 'rgba(99,102,241,0.1)',
      fill: true,
      tension: 0.4,
      pointBackgroundColor: '#6366f1',
      pointRadius: 5,
    }],
  };
  const options = {
    responsive: true,
    plugins: { legend: { display: false }, title: { display: true, text: 'School Mean Score Trend (Last 6 Terms)' } },
    scales: { y: { min: 0, max: 100, title: { display: true, text: 'Mean Score' } } },
  };
  return <div className="bg-white rounded-xl p-4 shadow-sm"><Line data={chartData} options={options} /></div>;
}

function SubjectHeatmap({ data }: { data: HeatmapItem[] }) {
  if (!data.length) return <EmptyState icon="" message="No heatmap data available" />;

  const subjects = Array.from(new Set(data.map(d => d.subject_name))).sort();
  const forms = Array.from(new Set(data.map(d => d.form_name))).sort();

  const lookup: Record<string, number> = {};
  data.forEach(d => { lookup[`${d.subject_name}||${d.form_name}`] = d.avg_mark; });

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm overflow-x-auto">
      <h3 className="font-semibold text-gray-700 mb-3">Subject Performance Heatmap</h3>
      <table className="text-xs border-collapse w-full">
        <thead>
          <tr>
            <th className="p-2 text-left bg-gray-50 border border-gray-200 font-medium text-gray-600">Subject</th>
            {forms.map(f => (
              <th key={f} className="p-2 text-center bg-gray-50 border border-gray-200 font-medium text-gray-600 min-w-[70px]">{f}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {subjects.map(subject => (
            <tr key={subject}>
              <td className="p-2 border border-gray-200 font-medium text-gray-700 whitespace-nowrap">{subject}</td>
              {forms.map(form => {
                const val = lookup[`${subject}||${form}`];
                return (
                  <td
                    key={form}
                    className="p-2 border border-gray-200 text-center font-semibold text-white"
                    style={{ backgroundColor: val !== undefined ? heatColor(val) : '#e5e7eb', color: val !== undefined ? 'white' : '#9ca3af' }}
                  >
                    {val !== undefined ? val.toFixed(1) : '-'}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex gap-4 mt-3 text-xs text-gray-600">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block" style={{background:'#16a34a'}} /> 70</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block" style={{background:'#ca8a04'}} /> 50</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block" style={{background:'#ea580c'}} /> 40</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block" style={{background:'#dc2626'}} /> &lt;40</span>
      </div>
    </div>
  );
}

function GradeDistributionChart({ data }: { data: GradeDistribution }) {
  const total = Object.values(data).reduce((a, b) => a + b, 0);
  if (total === 0) return <EmptyState icon="" message="No grade data available" />;
  const chartData = {
    labels: ['A (75)', 'B (60)', 'C (50)', 'D (40)', 'E (<40)'],
    datasets: [{
      data: [data.A, data.B, data.C, data.D, data.E],
      backgroundColor: ['#22c55e', '#84cc16', '#f59e0b', '#ef4444', '#6b7280'],
      borderWidth: 2,
      borderColor: '#fff',
    }],
  };
  const options = {
    responsive: true,
    plugins: {
      legend: { position: 'right' as const },
      title: { display: true, text: 'Grade Distribution' },
    },
  };
  return <div className="bg-white rounded-xl p-4 shadow-sm"><Doughnut data={chartData} options={options} /></div>;
}

function TopStudentsLeaderboard({ data }: { data: TopStudent[] }) {
  if (!data.length) return <EmptyState icon="" message="No student data available" />;
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <h3 className="font-semibold text-gray-700 mb-3">Top 20 Students Leaderboard</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Form</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Stream</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Mean Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((s, i) => (
              <tr key={i} className={i < 3 ? 'bg-yellow-50' : ''}>
                <td className="px-3 py-2 font-bold text-gray-700">
                  {i === 0 ? '' : i === 1 ? '' : i === 2 ? '' : `#${i + 1}`}
                </td>
                <td className="px-3 py-2 font-medium text-gray-800">{s.student_name}</td>
                <td className="px-3 py-2 text-gray-600">{s.form_name}</td>
                <td className="px-3 py-2 text-gray-600">{s.stream_name}</td>
                <td className="px-3 py-2 text-right font-semibold text-indigo-600">{s.mean_score.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SubjectWeaknessTable({ data }: { data: SubjectWeakness[] }) {
  if (!data.length) return <EmptyState icon="" message="No subjects with failure rate above 30%" />;
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <h3 className="font-semibold text-gray-700 mb-3">Subject Weakness Analysis (Failure Rate &gt; 30%)</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Failure Rate</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Students</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((s, i) => (
              <tr key={i}>
                <td className="px-3 py-2 font-medium text-gray-800">{s.subject_name}</td>
                <td className="px-3 py-2 text-right">
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold text-white" style={{ backgroundColor: s.failure_rate >= 60 ? '#dc2626' : '#ea580c' }}>
                    {s.failure_rate.toFixed(1)}%
                  </span>
                </td>
                <td className="px-3 py-2 text-right text-gray-600">{s.student_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


//  Attendance Tab Components 

function MonthlyAttendanceTrend({ data }: { data: MonthlyAttendance[] }) {
  if (!data.length) return <EmptyState icon="" message="No attendance data available" />;
  const chartData = {
    labels: data.map(d => d.month),
    datasets: [{
      label: 'Attendance Rate (%)',
      data: data.map(d => d.attendance_rate),
      borderColor: '#0891b2',
      backgroundColor: 'rgba(8,145,178,0.1)',
      fill: true,
      tension: 0.4,
      pointBackgroundColor: '#0891b2',
      pointRadius: 5,
    }],
  };
  const options = {
    responsive: true,
    plugins: { legend: { display: false }, title: { display: true, text: 'Monthly Attendance Trend' } },
    scales: { y: { min: 0, max: 100, title: { display: true, text: 'Attendance Rate (%)' } } },
  };
  return <div className="bg-white rounded-xl p-4 shadow-sm"><Line data={chartData} options={options} /></div>;
}

function FormAttendanceTable({ data }: { data: FormAttendance[] }) {
  if (!data.length) return <EmptyState icon="" message="No form attendance data available" />;
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <h3 className="font-semibold text-gray-700 mb-3">Attendance by Form</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Form</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Attendance Rate</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Present</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Absent</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((f, i) => (
              <tr key={i}>
                <td className="px-3 py-2 font-medium text-gray-800">{f.form_name}</td>
                <td className="px-3 py-2 text-right">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold text-white ${f.attendance_rate >= 80 ? 'bg-green-500' : f.attendance_rate >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}>
                    {f.attendance_rate.toFixed(1)}%
                  </span>
                </td>
                <td className="px-3 py-2 text-right text-green-600 font-medium">{f.present_count.toLocaleString()}</td>
                <td className="px-3 py-2 text-right text-red-600 font-medium">{f.absent_count.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

//  Finance Tab Components 

function CollectionRateByForm({ data }: { data: CollectionByForm[] }) {
  if (!data.length) return <EmptyState icon="" message="No collection data available" />;
  const chartData = {
    labels: data.map(d => d.form_name),
    datasets: [{
      label: 'Collection Rate (%)',
      data: data.map(d => d.collection_rate),
      backgroundColor: '#6366f1',
      borderRadius: 6,
    }],
  };
  const options = {
    responsive: true,
    plugins: { legend: { display: false }, title: { display: true, text: 'Fee Collection Rate by Form' } },
    scales: { y: { min: 0, max: 100, title: { display: true, text: 'Collection Rate (%)' } } },
  };
  return <div className="bg-white rounded-xl p-4 shadow-sm"><Bar data={chartData} options={options} /></div>;
}

function OutstandingByForm({ data }: { data: CollectionByForm[] }) {
  if (!data.length) return <EmptyState icon="" message="No outstanding data available" />;
  const chartData = {
    labels: data.map(d => d.form_name),
    datasets: [{
      label: 'Outstanding (KES)',
      data: data.map(d => d.outstanding_amount),
      backgroundColor: '#ef4444',
      borderRadius: 6,
    }],
  };
  const options = {
    responsive: true,
    plugins: { legend: { display: false }, title: { display: true, text: 'Outstanding Fees by Form (KES)' } },
    scales: { y: { title: { display: true, text: 'Amount (KES)' } } },
  };
  return <div className="bg-white rounded-xl p-4 shadow-sm"><Bar data={chartData} options={options} /></div>;
}

function MonthlyFeeCollectionTrend({ data }: { data: MonthlyCollection[] }) {
  if (!data.length) return <EmptyState icon="" message="No monthly collection data available" />;
  const chartData = {
    labels: data.map(d => d.month),
    datasets: [{
      label: 'Amount Collected (KES)',
      data: data.map(d => d.amount_collected),
      borderColor: '#22c55e',
      backgroundColor: 'rgba(34,197,94,0.1)',
      fill: true,
      tension: 0.4,
      pointBackgroundColor: '#22c55e',
      pointRadius: 5,
    }],
  };
  const options = {
    responsive: true,
    plugins: { legend: { display: false }, title: { display: true, text: 'Monthly Fee Collection Trend' } },
    scales: { y: { title: { display: true, text: 'Amount (KES)' } } },
  };
  return <div className="bg-white rounded-xl p-4 shadow-sm"><Line data={chartData} options={options} /></div>;
}

//  Predictive Tab Components 

function DropoutRiskTable({ data, onExport }: { data: DropoutStudent[]; onExport: () => void }) {
  if (!data.length) return (
    <div>
      <EmptyState icon="" message="No students with dropout risk score above 50" />
    </div>
  );
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-700">Dropout Risk Students (Score &gt; 50)</h3>
        <button
          onClick={onExport}
          className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <FiDownload size={14} />
          Export CSV
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Form</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Attendance</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Mean Score</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Fee Balance</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Risk Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((s, i) => (
              <tr key={i}>
                <td className="px-3 py-2 font-medium text-gray-800">{s.student_name}</td>
                <td className="px-3 py-2 text-gray-600">{s.form_name}</td>
                <td className="px-3 py-2 text-right text-gray-700">{s.attendance_rate.toFixed(1)}%</td>
                <td className="px-3 py-2 text-right text-gray-700">{s.mean_score.toFixed(1)}</td>
                <td className="px-3 py-2 text-right text-gray-700">{fmtKES(s.fee_balance)}</td>
                <td className="px-3 py-2 text-right">
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-bold text-white"
                    style={{ backgroundColor: riskColor(s.risk_score) }}
                  >
                    {s.risk_score}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


//  Main Page Component 

export default function AnalyticsPage() {
  const [session, setSession] = useState<{ role: string } | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<Tab>('academic');
  const [terms, setTerms] = useState<Term[]>([]);
  const [selectedTermId, setSelectedTermId] = useState<string>('');

  // Academic data
  const [academicData, setAcademicData] = useState<AcademicData | null>(null);
  const [academicLoading, setAcademicLoading] = useState(false);

  // Attendance data
  const [attendanceData, setAttendanceData] = useState<AttendanceData | null>(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);

  // Finance data
  const [financeData, setFinanceData] = useState<FinanceData | null>(null);
  const [financeLoading, setFinanceLoading] = useState(false);

  // Dropout risk data
  const [dropoutData, setDropoutData] = useState<DropoutStudent[]>([]);
  const [dropoutLoading, setDropoutLoading] = useState(false);

  //  Session check 
  useEffect(() => {
    fetch('/api/auth/session')
      .then(r => r.json())
      .then(d => {
        setSession(d.user || null);
        setSessionLoading(false);
      })
      .catch(() => setSessionLoading(false));
  }, []);

  //  Load terms 
  useEffect(() => {
    fetch('/api/auth/session').then(r => r.json()).then(d => {
      if (!d.user || !['admin', 'principal'].includes(d.user.role?.toLowerCase())) return;
      // Fetch terms from a known endpoint
      fetch('/api/academic-events?month=1&year=2024')
        .then(() => {
          // Use a direct supabase-like approach via existing endpoints
        });
    });
    // Load terms via the transport assignments endpoint which returns terms
    fetch('/api/transport/assignments?route_id=0&term_id=0')
      .catch(() => null);
  }, []);

  // Load terms from school_terms via a simple fetch
  useEffect(() => {
    fetch('/api/analytics/academic')
      .then(r => r.json())
      .then(() => {
        // Terms are loaded separately
      })
      .catch(() => null);
  }, []);

  // Fetch terms list
  useEffect(() => {
    fetch('/api/auth/session')
      .then(r => r.json())
      .then(async (d) => {
        if (!d.user) return;
        // We'll get terms from the academic endpoint indirectly
        // For now, use a dedicated terms fetch
        const res = await fetch('/api/analytics/academic');
        if (res.ok) {
          const json = await res.json();
          // Extract unique terms from mean_trend
          if (json.mean_trend) {
            // Terms are embedded in mean_trend
          }
        }
      })
      .catch(() => null);
  }, []);

  //  Fetch terms list directly 
  const loadTerms = useCallback(async () => {
    try {
      // Use the clinic visits endpoint to get terms (it uses school_terms)
      const res = await fetch('/api/clinic/visits?term_id=0');
      if (!res.ok) return;
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadTerms(); }, [loadTerms]);

  //  Fetch academic data 
  const loadAcademic = useCallback(async (termId?: string) => {
    setAcademicLoading(true);
    try {
      const url = termId ? `/api/analytics/academic?term_id=${termId}` : '/api/analytics/academic';
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setAcademicData(json);
      }
    } catch { /* ignore */ } finally {
      setAcademicLoading(false);
    }
  }, []);

  //  Fetch attendance data 
  const loadAttendance = useCallback(async () => {
    setAttendanceLoading(true);
    try {
      const res = await fetch('/api/analytics/attendance');
      if (res.ok) {
        const json = await res.json();
        setAttendanceData(json);
      }
    } catch { /* ignore */ } finally {
      setAttendanceLoading(false);
    }
  }, []);

  //  Fetch finance data 
  const loadFinance = useCallback(async () => {
    setFinanceLoading(true);
    try {
      const res = await fetch('/api/analytics/finance');
      if (res.ok) {
        const json = await res.json();
        setFinanceData(json);
      }
    } catch { /* ignore */ } finally {
      setFinanceLoading(false);
    }
  }, []);

  //  Fetch dropout risk data 
  const loadDropout = useCallback(async () => {
    setDropoutLoading(true);
    try {
      const res = await fetch('/api/analytics/dropout-risk');
      if (res.ok) {
        const json = await res.json();
        setDropoutData(json.data || []);
      }
    } catch { /* ignore */ } finally {
      setDropoutLoading(false);
    }
  }, []);

  //  Initial data load based on active tab 
  useEffect(() => {
    if (!session || !['admin', 'principal'].includes(session.role?.toLowerCase())) return;
    if (activeTab === 'academic') loadAcademic(selectedTermId || undefined);
    if (activeTab === 'attendance') loadAttendance();
    if (activeTab === 'finance') loadFinance();
    if (activeTab === 'predictive') loadDropout();
  }, [activeTab, session, selectedTermId, loadAcademic, loadAttendance, loadFinance, loadDropout]);

  //  Load terms on mount 
  useEffect(() => {
    if (!session || !['admin', 'principal'].includes(session.role?.toLowerCase())) return;
    // Fetch terms list via a simple approach
    fetch('/api/analytics/academic')
      .then(r => r.json())
      .then(json => {
        if (json.mean_trend && Array.isArray(json.mean_trend)) {
          // Build pseudo-terms from mean_trend for the filter
          const pseudoTerms = json.mean_trend.map((t: MeanTrendItem, i: number) => ({
            id: i + 1,
            term_name: t.term_name,
            academic_year: t.academic_year,
            is_current: i === json.mean_trend.length - 1,
          }));
          setTerms(pseudoTerms);
        }
      })
      .catch(() => null);
  }, [session]);

  //  CSV Export 
  const exportDropoutCSV = useCallback(() => {
    if (!dropoutData.length) return;
    const headers = ['Student Name', 'Form', 'Attendance Rate (%)', 'Mean Score', 'Fee Balance (KES)', 'Risk Score'];
    const rows = dropoutData.map(s => [
      s.student_name,
      s.form_name,
      s.attendance_rate.toFixed(1),
      s.mean_score.toFixed(1),
      s.fee_balance.toFixed(2),
      s.risk_score.toString(),
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dropout-risk-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [dropoutData]);

  //  Render 

  if (sessionLoading) return <Spinner />;

  if (!session || !['admin', 'principal'].includes(session.role?.toLowerCase())) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-2xl shadow-lg p-10 text-center max-w-md">
          <span className="text-6xl mb-4 block"></span>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h2>
          <p className="text-gray-500">This page is restricted to Admin and Principal roles only.</p>
        </div>
      </div>
    );
  }

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'academic', label: 'Academic', icon: <FiTrendingUp size={16} /> },
    { key: 'attendance', label: 'Attendance', icon: <FiUsers size={16} /> },
    { key: 'finance', label: 'Finance', icon: <FiDollarSign size={16} /> },
    { key: 'predictive', label: 'Predictive', icon: <FiAlertTriangle size={16} /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div
        className="px-6 py-8 text-white"
        style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}
      >
        <h1 className="text-3xl font-bold mb-1">Analytics Dashboard</h1>
        <p className="text-indigo-200 text-sm">Data-driven insights for school performance</p>
      </div>

      <div className="px-6 py-6 max-w-7xl mx-auto">
        {/* Global Term Filter */}
        <div className="flex items-center gap-4 mb-6">
          <label className="text-sm font-medium text-gray-600">Term Filter:</label>
          <select
            value={selectedTermId}
            onChange={e => setSelectedTermId(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Current Term</option>
            {terms.map((t, i) => (
              <option key={i} value={t.id.toString()}>
                {t.term_name} {t.academic_year}
              </option>
            ))}
          </select>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm mb-6 w-fit">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/*  Academic Tab  */}
        {activeTab === 'academic' && (
          <div className="space-y-6">
            {academicLoading ? (
              <Spinner />
            ) : academicData ? (
              <>
                <SchoolMeanTrendChart data={academicData.mean_trend} />
                <SubjectHeatmap data={academicData.subject_heatmap} />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <GradeDistributionChart data={academicData.grade_distribution} />
                  <TopStudentsLeaderboard data={academicData.top_students} />
                </div>
                <SubjectWeaknessTable data={academicData.subject_weakness} />
              </>
            ) : (
              <EmptyState icon="" message="No academic data available" />
            )}
          </div>
        )}

        {/*  Attendance Tab  */}
        {activeTab === 'attendance' && (
          <div className="space-y-6">
            {attendanceLoading ? (
              <Spinner />
            ) : attendanceData ? (
              <>
                <MonthlyAttendanceTrend data={attendanceData.monthly_trend} />
                <FormAttendanceTable data={attendanceData.form_attendance} />
              </>
            ) : (
              <EmptyState icon="" message="No attendance data available" />
            )}
          </div>
        )}

        {/*  Finance Tab  */}
        {activeTab === 'finance' && (
          <div className="space-y-6">
            {financeLoading ? (
              <Spinner />
            ) : financeData ? (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <CollectionRateByForm data={financeData.collection_by_form} />
                  <OutstandingByForm data={financeData.collection_by_form} />
                </div>
                <MonthlyFeeCollectionTrend data={financeData.monthly_collection} />
              </>
            ) : (
              <EmptyState icon="" message="No finance data available" />
            )}
          </div>
        )}

        {/*  Predictive Tab  */}
        {activeTab === 'predictive' && (
          <div className="space-y-6">
            {dropoutLoading ? (
              <Spinner />
            ) : (
              <>
                <DropoutRiskTable data={dropoutData} onExport={exportDropoutCSV} />
                {/* KCSE Prediction Chart  conditional render only if data exists */}
                {/* This would be populated from a future KCSE prediction data source */}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
