'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  FiGrid, FiTrendingUp, FiFileText, FiBarChart2, FiAlertTriangle,
  FiUsers, FiMap, FiGitBranch, FiStar, FiCpu, FiActivity,
  FiMessageCircle, FiGlobe, FiBookOpen, FiClipboard, FiLayers,
  FiCheckCircle, FiFlag, FiColumns, FiArrowRight, FiZap, FiAward,
  FiTarget, FiHeart, FiEye, FiShield
} from 'react-icons/fi';

// ─── Report definitions ───────────────────────────────────────────────────────
const TIERS = [
  {
    id: 'tier1',
    label: 'Tier 1 — Core CBC Reports',
    sub: 'Essential reports every school needs',
    reports: [
      {
        id: 'broadsheet', href: '/dashboard/exams/cbc-reports/broadsheet',
        icon: FiGrid, iconClass: 'icon-blue',
        badge: 'standard', title: 'CBC Broadsheet',
        desc: 'All students × all subjects. EE/ME/AE/BE per subject, overall competency level, ranked by performance per stream.',
        tags: ['PDF', 'Excel', 'per term'],
      },
      {
        id: 'merit-list', href: '/dashboard/exams/cbc-reports/merit-list',
        icon: FiAward, iconClass: 'icon-blue',
        badge: 'standard', title: 'Merit List / Ranking',
        desc: 'Students ranked by EE count → ME count → AE count. Overall position in stream and in form. Gender ranking split.',
        tags: ['PDF', 'per term', 'gender split'],
      },
      {
        id: 'report-card', href: '/dashboard/exams/cbc-report-cards',
        icon: FiFileText, iconClass: 'icon-blue',
        badge: 'standard', title: 'Student Report Card',
        desc: 'Per-student printable report. All 7 subjects, rubric level, teacher note, trend arrow, formative vs summative breakdown.',
        tags: ['PDF', 'bulk print', 'parent portal'],
      },
      {
        id: 'subject-performance', href: '/dashboard/exams/cbc-reports/subject-performance',
        icon: FiBarChart2, iconClass: 'icon-blue',
        badge: 'standard', title: 'Subject Performance',
        desc: 'Per-subject: EE/ME/AE/BE distribution chart, mean competency, comparison vs last term, teacher performance summary.',
        tags: ['chart', 'per subject', 'trends'],
      },
    ],
  },
  {
    id: 'tier2',
    label: 'Tier 2 — Analytics & Intelligence',
    sub: 'Advanced reports that beat Zeraki',
    reports: [
      {
        id: 'at-risk', href: '/dashboard/exams/cbc-reports/at-risk',
        icon: FiAlertTriangle, iconClass: 'icon-red',
        badge: 'zeraki-missing', title: 'AI At-Risk Predictor',
        desc: 'Flags students likely to drop to BE next term based on formative trajectory, attendance, and term-over-term decline.',
        tags: ['AI-powered', 'early warning', 'intervention plan'],
        featured: true,
      },
      {
        id: 'term-tracker', href: '/dashboard/exams/cbc-reports/term-tracker',
        icon: FiTrendingUp, iconClass: 'icon-teal',
        badge: 'zeraki-missing', title: 'Term-over-Term Tracker',
        desc: 'Visual heatmap of every student across all 3 terms. Green cells = improved, red = declined. Drill into any cell.',
        tags: ['heatmap', 'T1→T2→T3', 'drill-down'],
        featured: true,
      },
      {
        id: 'teacher-effectiveness', href: '/dashboard/exams/cbc-reports/teacher-effectiveness',
        icon: FiUsers, iconClass: 'icon-purple',
        badge: 'zeraki-missing', title: 'Teacher Effectiveness',
        desc: 'Per teacher: % of class at EE/ME, improvement rate vs previous teacher, subject mean vs school mean. Admin only.',
        tags: ['admin only', 'benchmarked', 'HR insight'],
        featured: true,
      },
      {
        id: 'pathway-readiness', href: '/dashboard/exams/cbc-reports/pathway-readiness',
        icon: FiMap, iconClass: 'icon-amber',
        badge: 'zeraki-missing', title: 'Pathway Readiness (STEM/Arts/SS)',
        desc: 'For Grade 9 students: calculates readiness score for each CBC Senior School pathway. Guides KJSEA planning.',
        tags: ['Grade 9', 'KJSEA prep', 'pathway match'],
        featured: true,
      },
      {
        id: 'formative-gap', href: '/dashboard/exams/cbc-reports/formative-gap',
        icon: FiGitBranch, iconClass: 'icon-amber',
        badge: 'zeraki-missing', title: 'Formative vs Summative Gap',
        desc: 'Identifies students whose summative level is far below/above their formative average — flags exam anxiety or patterns.',
        tags: ['integrity check', 'gap analysis', 'counselor view'],
        featured: true,
      },
      {
        id: 'gender-equity', href: '/dashboard/exams/cbc-reports/gender-equity',
        icon: FiUsers, iconClass: 'icon-pink',
        badge: 'zeraki-missing', title: 'Gender & Stream Equity',
        desc: 'Side-by-side EE/ME/AE/BE distribution by gender per subject. Spots systemic gaps — e.g. girls in STEM, boys in languages.',
        tags: ['equity lens', 'TSC compliant', 'gender split'],
        featured: true,
      },
    ],
  },
  {
    id: 'tier3',
    label: 'Tier 3 — Never-seen-before Reports',
    sub: 'New ground — nobody else has these',
    reports: [
      {
        id: 'learning-dna', href: '/dashboard/exams/cbc-reports/learning-dna',
        icon: FiActivity, iconClass: 'icon-purple',
        badge: 'new-ground', title: 'Student Learning DNA',
        desc: 'Radar chart per student across all 7 subjects showing competency shape across terms. Unique visual fingerprint.',
        tags: ['radar chart', 'parent shareable', 'Grade 10–12'],
        featured: true,
      },
      {
        id: 'intervention-tracker', href: '/dashboard/exams/cbc-reports/intervention-tracker',
        icon: FiHeart, iconClass: 'icon-red',
        badge: 'new-ground', title: 'Intervention Outcomes Tracker',
        desc: 'Tracks every BE-flagged student through intervention steps. Did they improve? Which interventions worked best?',
        tags: ['outcome tracking', 'evidence base', 'KNEC audit ready'],
        featured: true,
      },
      {
        id: 'sba-audit', href: '/dashboard/exams/cbc-reports/sba-audit',
        icon: FiClipboard, iconClass: 'icon-gray',
        badge: 'new-ground', title: 'SBA Completeness Audit',
        desc: 'Shows which teachers have submitted all required formative tasks, which are missing, and deadline status.',
        tags: ['compliance', 'KNEC ready', 'principal view'],
        featured: true,
      },
      {
        id: 'cohort-analysis', href: '/dashboard/exams/cbc-reports/cohort-analysis',
        icon: FiLayers, iconClass: 'icon-teal',
        badge: 'new-ground', title: 'Longitudinal Cohort Analysis',
        desc: 'Tracks a full student cohort from Grade 10 to Grade 12 — subject by subject, term by term. True value-add over 3 years.',
        tags: ['3-year view', 'value-add', 'board level'],
        featured: true,
      },
    ],
  },
  {
    id: 'tier4',
    label: 'Tier 4 — Admin & Operations Reports',
    sub: 'Principal and HOD operational reports',
    reports: [
      {
        id: 'marks-completion', href: '/dashboard/exams/cbc-reports/marks-completion',
        icon: FiCheckCircle, iconClass: 'icon-gray',
        badge: 'standard', title: 'Marks Entry Completion',
        desc: 'Which teachers have entered marks, which haven\'t. % complete per subject per term. Deadline countdown.',
        tags: ['principal view', 'deadline alerts'],
      },
      {
        id: 'be-register', href: '/dashboard/exams/cbc-reports/be-register',
        icon: FiFlag, iconClass: 'icon-red',
        badge: 'standard', title: 'BE Intervention Register',
        desc: 'Full register of all BE-flagged students, assigned support teacher, intervention type, and outcome. Printable for HOD.',
        tags: ['HOD report', 'printable'],
      },
      {
        id: 'stream-comparison', href: '/dashboard/exams/cbc-reports/stream-comparison',
        icon: FiColumns, iconClass: 'icon-blue',
        badge: 'standard', title: 'Stream Comparison',
        desc: 'Side-by-side performance comparison across streams in the same form. Which stream leads in each subject?',
        tags: ['HOD', 'streaming decision'],
      },
      {
        id: 'grade-progress', href: '/dashboard/exams/cbc-reports/grade-progress',
        icon: FiTarget, iconClass: 'icon-teal',
        badge: 'standard', title: 'Form/Grade Progress Summary',
        desc: 'One-page summary per form (Grade 10/11/12): total students, assessed %, EE/ME/AE/BE counts. For board meetings.',
        tags: ['board report', 'one-pager', 'PDF'],
      },
    ],
  },
];

const BADGE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  standard: { bg: '#f3f4f6', text: '#6b7280', label: 'Standard' },
  'zeraki-missing': { bg: '#fee2e2', text: '#b91c1c', label: "Zeraki can't do this" },
  'new-ground': { bg: '#dcfce7', text: '#15803d', label: 'New ground' },
};

const ICON_CLASSES: Record<string, { bg: string; color: string }> = {
  'icon-blue': { bg: '#E6F1FB', color: '#185FA5' },
  'icon-teal': { bg: '#E1F5EE', color: '#0F6E56' },
  'icon-amber': { bg: '#FAEEDA', color: '#854F0B' },
  'icon-red': { bg: '#FCEBEB', color: '#A32D2D' },
  'icon-purple': { bg: '#EEEDFE', color: '#534AB7' },
  'icon-pink': { bg: '#FBEAF0', color: '#993556' },
  'icon-gray': { bg: '#F1EFE8', color: '#5F5E5A' },
};

// ═══════════════════════════════════════════════════════════════════════════════
export default function CBCReportsHubPage() {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Hero Header ────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-gray-200"
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)' }}>
        {/* Animated gradient orbs */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full opacity-20"
            style={{ background: 'radial-gradient(circle, #6366f1, transparent 70%)', animation: 'pulse 4s ease-in-out infinite' }} />
          <div className="absolute -bottom-20 -left-20 w-60 h-60 rounded-full opacity-15"
            style={{ background: 'radial-gradient(circle, #06b6d4, transparent 70%)', animation: 'pulse 5s ease-in-out infinite 1s' }} />
          <div className="absolute top-10 left-1/2 w-40 h-40 rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, #10b981, transparent 70%)', animation: 'pulse 6s ease-in-out infinite 2s' }} />
        </div>

        <div className="relative px-8 py-8 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg"
                style={{ background: 'linear-gradient(135deg, #6366f1, #06b6d4)' }}>
                <FiBarChart2 size={24} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-white tracking-tight">
                  CBC Reports Command Center
                </h1>
                <p className="text-sm text-blue-200/70 mt-0.5">
                  20 cutting-edge reports · Beats Zeraki · KNEC compliant · AI-powered analytics
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 mt-4">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(10px)' }}>
                <div className="w-2.5 h-2.5 rounded-sm" style={{ background: '#E24B4A' }} />
                <span className="text-xs text-white/70 font-medium">Zeraki can&apos;t do this</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(10px)' }}>
                <div className="w-2.5 h-2.5 rounded-sm" style={{ background: '#1D9E75' }} />
                <span className="text-xs text-white/70 font-medium">New ground (nobody has it)</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(10px)' }}>
                <div className="w-2.5 h-2.5 rounded-sm" style={{ background: '#888780' }} />
                <span className="text-xs text-white/70 font-medium">Standard (must have)</span>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="hidden lg:flex gap-4">
            {[
              { label: 'Total Reports', value: '20', color: '#6366f1' },
              { label: 'Zeraki-Beating', value: '6', color: '#E24B4A' },
              { label: 'New Ground', value: '8', color: '#1D9E75' },
            ].map((stat, i) => (
              <div key={i} className="text-center px-5 py-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p className="text-2xl font-black text-white">{stat.value}</p>
                <p className="text-[10px] font-semibold uppercase tracking-wider mt-0.5" style={{ color: stat.color }}>{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Report Tiers ───────────────────────────────────────────────────── */}
      {TIERS.map(tier => (
        <div key={tier.id}>
          <div className="mb-4">
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">{tier.label}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{tier.sub}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {tier.reports.map(report => {
              const Icon = report.icon;
              const iconStyle = ICON_CLASSES[report.iconClass] || ICON_CLASSES['icon-blue'];
              const badgeStyle = BADGE_STYLES[report.badge] || BADGE_STYLES.standard;
              const isHovered = hoveredId === report.id;
              const isFeatured = (report as any).featured;

              return (
                <Link
                  key={report.id}
                  href={report.href}
                  className="group block no-underline"
                  onMouseEnter={() => setHoveredId(report.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  <div className={`bg-white rounded-xl border transition-all duration-300 p-5 h-full flex flex-col
                    ${isFeatured ? 'border-indigo-200 hover:border-indigo-400 hover:shadow-lg hover:shadow-indigo-100/50' : 'border-gray-200 hover:border-gray-300 hover:shadow-md'}
                    ${isHovered ? 'transform -translate-y-0.5' : ''}
                  `}>
                    {/* Top: Icon + Badge */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110"
                        style={{ background: iconStyle.bg, color: iconStyle.color }}>
                        <Icon size={20} />
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-1 rounded-md whitespace-nowrap"
                        style={{ background: badgeStyle.bg, color: badgeStyle.text }}>
                        {badgeStyle.label}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="text-[14px] font-bold text-gray-800 mb-1.5 group-hover:text-indigo-700 transition-colors">
                      {report.title}
                    </h3>

                    {/* Description */}
                    <p className="text-[12px] text-gray-500 leading-relaxed mb-3 flex-1">
                      {report.desc}
                    </p>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1.5 mt-auto">
                      {report.tags.map(tag => (
                        <span key={tag} className="text-[10px] px-2 py-0.5 rounded-md bg-gray-50 text-gray-500 border border-gray-100 font-medium">
                          {tag}
                        </span>
                      ))}
                    </div>

                    {/* Hover Arrow */}
                    <div className={`flex items-center gap-1 mt-3 text-xs font-semibold text-indigo-500 transition-all ${isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'}`}>
                      Open Report <FiArrowRight size={12} />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      ))}

      {/* Pulse animation */}
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.15; }
          50% { transform: scale(1.1); opacity: 0.25; }
        }
      `}</style>
    </div>
  );
}
