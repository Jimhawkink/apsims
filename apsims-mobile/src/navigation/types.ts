import { NavigatorScreenParams } from '@react-navigation/native';

// ============================================================
// APSIMS Mobile — Navigation Type Definitions (Ultra v3.0)
// All screens: Principal, Teacher, Parent, Student, Shared
// ============================================================

export type TeacherTabParamList = {
    Dashboard: undefined;
    Attendance: undefined;
    Marks: undefined;
    CBC: undefined;
    Schedule: undefined;
    More: undefined;
};

export type ParentTabParamList = {
    Home: undefined;
    Attendance: undefined;
    Homework: undefined;
    Circulars: undefined;
    More: undefined;
};

export type StudentTabParamList = {
    Home: undefined;
    Attendance: undefined;
    Timetable: undefined;
    Results: undefined;
    Library: undefined;
    More: undefined;
};

export type PrincipalTabParamList = {
    Dashboard: undefined;
    Students: undefined;
    Finance: undefined;
    Reports: undefined;
    More: undefined;
};

export type BursarTabParamList = {
    Dashboard: undefined;
    Fees: undefined;
    Expenses: undefined;
    Income: undefined;
    More: undefined;
};

export type RootStackParamList = {
    Login: undefined;
    PINLogin: undefined;
    TeacherTabs: NavigatorScreenParams<TeacherTabParamList>;
    ParentTabs: NavigatorScreenParams<ParentTabParamList>;
    StudentTabs: NavigatorScreenParams<StudentTabParamList>;
    PrincipalTabs: NavigatorScreenParams<PrincipalTabParamList>;
    BursarTabs: NavigatorScreenParams<BursarTabParamList>;

    // ── Shared modal / pushed screens ──────────────────────────
    Notifications: { portalUserId: number };
    ReportCard: { studentId: number; formId: number; formLevel: number; isParent: boolean };
    CBCAssessment: { studentId: number };
    Announcement: undefined;
    Export: undefined;

    // ── Teacher screens ────────────────────────────────────────
    StudentProfile: { studentId: number };
    ClassPerformance: {
        subjectId: number;
        subjectName: string;
        formId: number;
        streamId: number;
        streamName: string;
    };
    CBCMarksEntry: {
        subjectId: number;
        subjectName: string;
        formId: number;
        formName: string;
        streamId: number;
        streamName: string;
    };
    MarksEntry: {
        subject_id: number;
        subject_name: string;
        form_id: number;
        form_name: string;
        stream_id: number;
        stream_name: string;
    };
    TeacherTimetable: undefined;
    CBCProgress: {
        studentId: number;
        studentName: string;
        formLevel: number;
    };
    Remedials: undefined;
    CBCTeacherHub: undefined;
    MarksHub: undefined;

    // ── Parent screens ─────────────────────────────────────────
    PayFees: {
        studentId: number;
        studentName: string;
        formId: number;
        admissionNumber?: string;
        formName?: string;
        streamName?: string;
        balance?: number;
        totalDue?: number;
        totalPaid?: number;
    };
    HealthRecord: undefined;
    LeaveOut: undefined;
    FeeBalance: undefined;
    Circular: undefined;
    ParentDiscipline: undefined;
    ChildTimetable: {
        studentId: number;
        formId: number;
        streamId: number;
    };

    // ── Principal screens ──────────────────────────────────────
    PrincipalStudents: undefined;
    PrincipalStaff: undefined;
    PrincipalDiscipline: undefined;
    PrincipalAttendance: undefined;
    AcademicReport: undefined;
    FinanceReport: undefined;
    StoresReport: undefined;
    LibraryReport: undefined;

    // ── Bursar screens ─────────────────────────────────────────
    BursarStudentFees: { studentId: number; studentName: string; formId: number };
    BursarAddExpense: undefined;
    BursarAddIncome: undefined;
    BursarFeeReceipt: { receiptNo: string; studentName: string; amount: number; method: string };
};
