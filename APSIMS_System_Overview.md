# APSIMS — Advanced Pupil & Staff Information Management System

**Powered by Hawkinsoft Solutions**  
**Live Demo:** https://apsims.vercel.app  
**Tech Stack:** Next.js 14 · TypeScript · TailwindCSS · Supabase (PostgreSQL) · React Icons · Chart.js

---

## 🔐 Authentication & Security

| Feature | Description |
|---------|-------------|
| Login | Username/password with bcrypt hashing (12 salt rounds) |
| Session | httpOnly cookies with CSRF protection |
| Rate Limiting | 5 attempts max, 15-min lockout per IP |
| Auto-upgrade | Plaintext passwords auto-converted to bcrypt on login |
| Password Reset | Token-based forgot/reset password flow |
| Audit Logging | All login attempts (success/fail) logged with IP |
| Role-Based Access | Per-module permissions (admin, principal, bursar, teacher, etc.) |

---

## 📊 Module Overview (50+ Pages)

### 1. 🏠 Dashboard
- **Route:** `/dashboard`
- School-wide KPIs: total students, staff, revenue, attendance rates
- Quick-action cards and recent activity feed
- Charts for enrollment trends, fee collection, gender distribution

---

### 2. 👥 Student Information (8 sub-pages)

| Page | Route | Functions |
|------|-------|-----------|
| Students List | `/dashboard/students` | Full CRUD, search/filter by form/stream/status, bulk import, photo upload, export CSV/PDF |
| Student Profiles | `/dashboard/students/profile` | Detailed profile view with tabs: academic, fees, attendance, discipline, health |
| Admissions | `/dashboard/students/admissions` | Admission form with auto-generated admission numbers, guardian info, document upload |
| Promotion | `/dashboard/students/promotion` | Promote/demote students across forms/streams, bulk promotion |
| ID Cards | `/dashboard/students/id-cards` | Generate printable student ID cards with photos, barcodes |
| Discipline | `/dashboard/discipline` | Record incidents (13 categories, 4 severity levels), track actions, analytics, SMS to parents |
| Leave Out | `/dashboard/leave-out` | Track students leaving school, QR codes, auto-SMS to guardians, return tracking |
| Health Records | `/dashboard/students/health` | Medical conditions, blood group, emergency contacts, special needs tracking |

---

### 3. 📚 Academics (18 sub-pages)

| Page | Route | Functions |
|------|-------|-----------|
| Curriculum & Grading | `/dashboard/curriculum` | Configure grading systems (A-E, 1-12), grade points, remarks |
| CBC Tracking | `/dashboard/curriculum/cbc-tracking` | Competency-Based Curriculum strand/sub-strand tracking |
| CBC Assessment | `/dashboard/curriculum/cbc-assessment` | Rubric-based CBC assessment recording |
| Schemes of Work | `/dashboard/schemes` | Create weekly lesson schemes (CBC & 8-4-4), strand mapping, approval workflow |
| Subjects | `/dashboard/subjects` | Manage subjects, codes, categories (Core/Elective), max scores, subject groups |
| Exam Dashboard | `/dashboard/exams` | Exam overview with stats, grading summary, performance charts |
| Mark Entry | `/dashboard/exams/marks` | Enter marks per subject/form/term, auto-grade calculation |
| Broadsheet | `/dashboard/exams/broadsheet` | Full class mark sheet view, totals, ranks, means |
| Merit List | `/dashboard/exams/merit-list` | Ranked student lists per form/stream/term |
| Report Cards | `/dashboard/exams/report-cards` | Generate & print report cards with grades, comments, signatures |
| Performance Analysis | `/dashboard/exams/analysis` | Subject/class comparison charts, grade distribution, trend analysis |
| Exam Manager | `/dashboard/exams/manage` | Create/manage exam types (CAT, Midterm, Final), set dates & weightings |
| Question Bank | `/dashboard/exams/question-bank` | Store questions by subject/topic/difficulty, multiple choice & essay |
| Paper Generator | `/dashboard/exams/paper-generator` | Auto-generate exam papers from question bank |
| AI Question Gen | `/dashboard/exams/ai-generate` | AI-powered question generation by topic/Bloom's level |
| Digital Report Cards | `/dashboard/exams/digital-delivery` | WhatsApp/SMS/Email delivery of report cards, digital signatures, parent viewing |
| Timetable | `/dashboard/timetable` | Visual timetable builder, period management, teacher availability, conflict detection |
| Remedial Programs | `/dashboard/remedial` | Remedial term setup, student enrollment, fee tracking, progress monitoring |

---

### 4. 📅 Attendance & Leave (2 sub-pages)

| Page | Route | Functions |
|------|-------|-----------|
| Student Attendance | `/dashboard/attendance` | Daily attendance by form/stream, present/absent/late, monthly reports |
| Staff Attendance | `/dashboard/attendance/staff` | Teacher & support staff attendance, time-in/time-out tracking |

---

### 5. 💼 HR & Payroll (3 sub-pages)

| Page | Route | Functions |
|------|-------|-----------|
| HR Overview | `/dashboard/hr-payroll` | Staff count, payroll summary, department breakdown |
| Staff Directory | `/dashboard/hr-payroll/staff` | Teachers (TSC), support staff, subordinate staff — full CRUD with bank details, KRA/NHIF/NSSF |
| Run Payroll | `/dashboard/hr-payroll/payroll` | Calculate gross pay, PAYE, NHIF, NSSF, loans, net pay; approve & process payments |

---

### 6. 💰 Finance (9 sub-pages)

| Page | Route | Functions |
|------|-------|-----------|
| Fee Dashboard | `/dashboard/fees` | Collection rate, outstanding amounts, today/week/month charts |
| Collect Fee | `/dashboard/fees/collect` | Record payments (Cash/M-Pesa/Bank), auto-receipt, SMS confirmation |
| Outstanding Fees | `/dashboard/fees/outstanding` | Students with balances, demand letters, filtered by form/amount |
| Payment History | `/dashboard/fees/payments` | All payment records, search/filter, export |
| Fee Structure | `/dashboard/fees/structure` | Set fees per form (tuition, boarding, transport, etc.), term-based |
| Fee Statements | `/dashboard/fees/statements` | Per-student statement with all charges & payments |
| Expenses | `/dashboard/expenses` | Record school expenses by category, payment method, recurring expenses |
| Other Income | `/dashboard/income` | Track non-fee income sources |
| Payment Integration | `/dashboard/payments/integration` | M-Pesa C2B configuration, paybill setup, auto-reconciliation |

---

### 7. 📦 Stores & Library (7 sub-pages)

| Page | Route | Functions |
|------|-------|-----------|
| Library Dashboard | `/dashboard/library-inventory` | Book stats, checkout overview, overdue alerts |
| Book Catalog | `/dashboard/library-inventory/catalog` | Full book CRUD, ISBN, categories, shelf location, condition tracking |
| Issue & Return | `/dashboard/library-inventory/checkout` | Check out/in books, borrower tracking (student/staff), due dates |
| Overdue Books | `/dashboard/library-inventory/overdue` | Overdue list, fine calculation, SMS reminders |
| Assets Register | `/dashboard/assets` | School asset tracking, depreciation, location assignment |
| Store Items | `/dashboard/stores` | General inventory management, stock levels, reorder alerts |
| Rim Paper | `/dashboard/rim-paper` | Track rim paper brought by students per term |

---

### 8. 📱 Parent & Portals (2 sub-pages)

| Page | Route | Functions |
|------|-------|-----------|
| SMS & Broadcasting | `/dashboard/communication` | Send bulk SMS (Africa's Talking), message templates, delivery tracking, cost tracking |
| Parent & Student Portal | `/dashboard/portals` | Manage portal accounts, link parents to students, view portal activity logs |

---

### 9. ⚙️ Administration (4 sub-pages)

| Page | Route | Functions |
|------|-------|-----------|
| Reports & Export | `/dashboard/reports` | Generate & export reports (PDF/CSV), custom report builder |
| User Roles | `/dashboard/users` | Create/manage users, assign roles & per-module permissions, activate/deactivate |
| System Settings | `/dashboard/settings` | School details, logo, academic year, terms, M-Pesa config, SMS config |
| Multi-School / Super Admin | `/dashboard/super-admin` | Multi-tenant management, school registration, subscription plans, cross-school analytics |

---

## 🗄️ Database Schema (60+ Tables)

### Core School Tables
- `school_students` — Student records with demographics, guardian info, medical data
- `school_teachers` — Teaching staff with TSC numbers, qualifications, bank details
- `school_support_teachers` — Contract/supply teachers
- `school_subordinate_staff` — Non-teaching staff
- `school_forms` — Class forms (Form 1-4)
- `school_streams` — Class streams (East/West/North/South)
- `school_subjects` — Subject definitions with codes and categories
- `school_terms` — Academic terms with dates

### Academic Tables
- `school_exam_marks` — Student marks per subject/exam/term
- `school_exam_types` — Exam definitions (CAT, Midterm, End Term)
- `school_grading_system` — Grade boundaries and points
- `school_schemes_of_work` — Lesson schemes with weeks and lessons
- `school_scheme_weeks` / `school_scheme_lessons` — Weekly lesson breakdown
- `school_topics` — Subject topics per form
- `school_cbc_strands` / `school_cbc_sub_strands` — CBC curriculum structure
- `school_question_bank` — Question storage with difficulty, Bloom's level
- `school_timetable_entries` / `school_timetable_periods` — Timetable structure
- `school_teacher_availability` — Teacher free periods

### Finance Tables
- `school_fee_structures` — Fee amounts per form/term/category
- `school_fee_payments` — Payment records with methods and receipts
- `school_expenses` — School expenses
- `school_payroll` — Staff payroll with KRA/NHIF/NSSF deductions
- `school_mpesa_transactions` — M-Pesa payment tracking
- `school_mpesa_config` — M-Pesa integration settings
- `school_payment_attempts` — Payment attempt tracking

### Discipline & Attendance
- `school_discipline_cases` — Incident records with categories and actions
- `school_attendance` — Daily student attendance
- `school_staff_attendance` — Staff attendance
- `school_leave_outs` — Student leave-out tracking

### Communication & Portals
- `school_portal_users` — Parent/student portal accounts
- `school_portal_notifications` — Portal push notifications
- `school_portal_activity_logs` — Portal usage tracking
- `school_parent_students` — Parent-student linking
- `school_message_logs` — SMS broadcast history
- `school_report_card_deliveries` — Digital report card delivery tracking

### Multi-Tenant & Admin
- `school_tenants` — Multi-school registration
- `school_users` — System users with bcrypt-hashed passwords
- `school_audit_log` — System-wide audit trail
- `school_settings` — System configuration key-value store

### Library & Stores
- `school_library_books` — Book catalog
- `school_library_checkouts` — Book issue/return tracking
- `school_rim_paper` — Rim paper tracking

### Remedial
- `school_remedial_terms` — Remedial program periods
- `school_remedial_enrollments` — Student enrollment
- `school_remedial_payments` — Remedial fee payments

---

## 🔑 User Roles

| Role | Access Level |
|------|-------------|
| Admin | Full access to all modules |
| Principal | Dashboard, students, academics, attendance, reports, discipline |
| Bursar | Fees, expenses, income, payroll, payment integration |
| Accountant | Fees, expenses, income, reports |
| Receptionist | Students, attendance, communication |
| Teacher | Own subjects, mark entry, attendance, class view |
| Super Admin | Multi-school management, tenant management |

---

## 🌐 Parent & Student Portal

- **Route:** `/portal/login`
- Parents view: child's fees, results, attendance, discipline records
- Students view: own results, timetable, fee balance
- Self-service password reset
- Push notifications for fee reminders, report cards

---

## 📱 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/login` | POST | User authentication |
| `/api/auth/logout` | POST | Session termination |
| `/api/auth/session` | GET | Session validation |
| `/api/auth/forgot-password` | POST | Password reset request |
| `/api/auth/reset-password` | POST | Password reset confirmation |
| `/api/auth/portal-login` | POST | Parent/student portal login |
| `/api/mpesa/*` | — | M-Pesa STK Push, C2B callbacks |
| `/api/send-sms` | POST | SMS sending via Africa's Talking |
| `/api/generate-questions` | POST | AI question generation |

---

*Built with ❤️ by Hawkinsoft Solutions*
