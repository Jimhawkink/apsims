import { NavigatorScreenParams } from '@react-navigation/native';

// ============================================================
// APSIMS Mobile Phase 1 Ultra — Navigation Type Definitions
// ============================================================

export type TeacherTabParamList = {
    Dashboard: undefined;
    Attendance: undefined;
    Homework: undefined;
    More: undefined;
};

export type ParentTabParamList = {
    Home: undefined;
    Attendance: undefined;
    Homework: undefined;
    More: undefined;
};

export type StudentTabParamList = {
    Home: undefined;
    Attendance: undefined;
    Timetable: undefined;
    More: undefined;
};

export type RootStackParamList = {
    Login: undefined;
    TeacherTabs: NavigatorScreenParams<TeacherTabParamList>;
    ParentTabs: NavigatorScreenParams<ParentTabParamList>;
    StudentTabs: NavigatorScreenParams<StudentTabParamList>;
    // Modal / pushed screens accessible from any tab
    Notifications: { portalUserId: number };
    ReportCard: { studentId: number; formId: number; formLevel: number; isParent: boolean };
    CBCAssessment: { studentId: number };
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
    PayFees: {
        studentId: number;
        studentName: string;
        formId: number;
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
    Export: undefined;
    Announcement: undefined;
    HealthRecord: undefined;
    LeaveOut: undefined;
    FeeBalance: undefined;
};
