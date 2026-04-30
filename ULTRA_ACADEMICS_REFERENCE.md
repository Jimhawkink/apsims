# APSIMS Ultra Academics — Code Reference

## File Locations

| File | Path | Purpose |
|------|------|---------|
| Main Page | `src/app/dashboard/exams/question-bank/page.tsx` | Tab navigation (9 tabs) |
| Data Hook | `src/app/dashboard/exams/question-bank/useQuestionBankData.ts` | Supabase data fetching |
| Questions Tab | `src/app/dashboard/exams/question-bank/QuestionsTab.tsx` | Question CRUD + filters |
| AI Generator | `src/app/dashboard/exams/question-bank/AIGenTab.tsx` | 🇰🇪 Kenya curriculum AI gen |
| Marking Schemes | `src/app/dashboard/exams/question-bank/MarkingSchemesTab.tsx` | Scheme builder |
| Past Papers | `src/app/dashboard/exams/question-bank/PastPapersTab.tsx` | Paper upload/management |
| Student Practice | `src/app/dashboard/exams/question-bank/StudentPracticeTab.tsx` | Practice mode + scoring |
| KCSE Analysis | `src/app/dashboard/exams/question-bank/KCSEAnalysisTab.tsx` | Frequency analysis |
| Approvals | `src/app/dashboard/exams/question-bank/ApprovalTab.tsx` | Approval workflow |
| Statistics | `src/app/dashboard/exams/question-bank/StatsTab.tsx` | Stats + coverage gaps |
| Duplicates | `src/app/dashboard/exams/question-bank/DuplicatesTab.tsx` | Duplicate detection |
| AI API Route | `src/app/api/ai-generate/route.ts` | Server-side AI (Anthropic+OpenAI) |
| QB Migration | `question_bank_ultra_migration.sql` | Question bank tables |
| Academics Migration | `academics_ultra_migration.sql` | Academics tables |

## Environment Setup

```env
# .env.local (NEVER commit this file)
ANTHROPIC_API_KEY=sk-ant-your-key-here
OPENAI_API_KEY=sk-your-openai-key-here
```

On Vercel: Settings → Environment Variables → add both keys.

## AI Generator Features (AIGenTab)

- **3 Curriculum Systems**: 8-4-4 (Form 1-4/KCSE), CBC-JSS (Grade 7-9/KJSEA), CBC-Senior (Grade 10-12)
- **9 Question Types**: MCQ, True/False, Short Answer, Structured, Essay, Calculation, Fill Blank, Data Analysis, Scenario
- **3-Step Flow**: Configure → Preview/Edit → Done
- **AI Providers**: Anthropic Claude (primary) + OpenAI GPT-4o (fallback)
- **Kenyan Context**: KNEC standards, KICD curriculum, Kenyan scenarios, KES currency
- **Full Metadata**: marks, Bloom's taxonomy, marking scheme, distractor analysis, calculation steps
- **Topic filtering**: filtered by selected subject + form

## API Route Flow

```
Browser (AIGenTab) → /api/ai-generate → Anthropic API (or OpenAI fallback)
```

API key lives server-side only. Browser never sees it.

## Database Tables (from migrations)

- `school_question_bank` — extended with marking_scheme, calculation_steps, essay_marking_points, distractor_analysis, ai_answer, ai_explanation, kcse_frequency, approval_status, is_duplicate
- `school_past_papers` — KCSE/mock paper uploads
- `school_paper_versions` — A/B/C versions
- `school_student_practice` — practice sessions + scores
- `school_kcse_frequency` — topic frequency analysis
- `school_lesson_plans` — lesson planning
- `school_syllabus_coverage` — coverage tracking
- `school_departments` — department management
- `school_room_bookings` — room scheduling
- `school_content_bank` — digital content
- `school_knec_syllabus` — KNEC syllabus mapping
- `school_hod_approvals` — HOD approval workflow
- `school_moe_inspections` — MoE inspection records
- `school_digital_textbooks` — digital textbook library

## Deployment

```bash
npx vercel --prod --yes
```

Live at: https://apsims.vercel.app
