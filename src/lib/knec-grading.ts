// ============================================================
// KNEC GRADING ENGINE — APSIMS Ultra Premium
// Kenya 8-4-4 + CBC Analysis | Correct KNEC Method
// ============================================================

export interface KNECGrade {
    grade: string; points: number; minScore: number; maxScore: number; remarks: string;
}

// Official KCSE individual subject grade table
export const KNEC_GRADE_TABLE: KNECGrade[] = [
    { grade: 'A',  points: 12, minScore: 75, maxScore: 100, remarks: 'Excellent' },
    { grade: 'A-', points: 11, minScore: 70, maxScore: 74,  remarks: 'Very Good' },
    { grade: 'B+', points: 10, minScore: 65, maxScore: 69,  remarks: 'Good' },
    { grade: 'B',  points: 9,  minScore: 60, maxScore: 64,  remarks: 'Good' },
    { grade: 'B-', points: 8,  minScore: 55, maxScore: 59,  remarks: 'Fairly Good' },
    { grade: 'C+', points: 7,  minScore: 50, maxScore: 54,  remarks: 'Average' },
    { grade: 'C',  points: 6,  minScore: 45, maxScore: 49,  remarks: 'Average' },
    { grade: 'C-', points: 5,  minScore: 40, maxScore: 44,  remarks: 'Below Average' },
    { grade: 'D+', points: 4,  minScore: 35, maxScore: 39,  remarks: 'Below Average' },
    { grade: 'D',  points: 3,  minScore: 30, maxScore: 34,  remarks: 'Poor' },
    { grade: 'D-', points: 2,  minScore: 25, maxScore: 29,  remarks: 'Poor' },
    { grade: 'E',  points: 1,  minScore: 0,  maxScore: 24,  remarks: 'Very Poor' },
];

// Official KNEC mean grade table (total best-7 points out of 84)
export const KNEC_MEAN_GRADE_TABLE = [
    { grade: 'A',  minPts: 81, maxPts: 84 },
    { grade: 'A-', minPts: 74, maxPts: 80 },
    { grade: 'B+', minPts: 67, maxPts: 73 },
    { grade: 'B',  minPts: 60, maxPts: 66 },
    { grade: 'B-', minPts: 53, maxPts: 59 },
    { grade: 'C+', minPts: 46, maxPts: 52 },
    { grade: 'C',  minPts: 40, maxPts: 45 },
    { grade: 'C-', minPts: 33, maxPts: 39 },
    { grade: 'D+', minPts: 27, maxPts: 32 },
    { grade: 'D',  minPts: 21, maxPts: 26 },
    { grade: 'D-', minPts: 14, maxPts: 20 },
    { grade: 'E',  minPts: 7,  maxPts: 13 },
];

// Get subject grade from score
export function getSubjectGrade(score: number, customGrading?: any[]): KNECGrade {
    if (customGrading && customGrading.length > 0) {
        const sorted = [...customGrading].sort((a, b) => b.min_score - a.min_score);
        const found = sorted.find((g: any) => score >= g.min_score && score <= g.max_score);
        if (found) return { grade: found.grade, points: found.points, minScore: found.min_score, maxScore: found.max_score, remarks: found.remarks };
    }
    return KNEC_GRADE_TABLE.find(g => score >= g.minScore && score <= g.maxScore) || KNEC_GRADE_TABLE[KNEC_GRADE_TABLE.length - 1];
}

// Get KNEC mean grade from total best-7 points — CORRECT METHOD
export function getKNECMeanGrade(totalPoints: number): string {
    return KNEC_MEAN_GRADE_TABLE.find(g => totalPoints >= g.minPts && totalPoints <= g.maxPts)?.grade || 'E';
}

// Grade order for comparison
export const GRADE_ORDER = ['A','A-','B+','B','B-','C+','C','C-','D+','D','D-','E'];
export const gradeIndex = (g: string) => GRADE_ORDER.indexOf(g);
export const isBetterGrade = (a: string, b: string) => gradeIndex(a) < gradeIndex(b);

// CAT 30% / End-Term 70% weighted mark — KNEC correct
export function computeWeightedMark(marks: { examType: string; score: number; outOf?: number }[]): number {
    const normalize = (m: { score: number; outOf?: number }) => (m.score / (m.outOf || 100)) * 100;
    const cats = marks.filter(m => /cat\s*\d?|continuous|formative|test\s*\d/i.test(m.examType));
    const endTerm = marks.find(m => /end.?term|final|annual/i.test(m.examType));
    const midTerm = marks.find(m => /mid.?term/i.test(m.examType));
    if (cats.length > 0 && endTerm) {
        const catAvg = cats.reduce((a, m) => a + normalize(m), 0) / cats.length;
        return Math.round((catAvg * 0.30 + normalize(endTerm) * 0.70) * 10) / 10;
    }
    if (endTerm) return normalize(endTerm);
    if (midTerm) return normalize(midTerm);
    if (marks.length > 0) return Math.round(marks.reduce((a, m) => a + normalize(m), 0) / marks.length * 10) / 10;
    return 0;
}

// Get subject group number (for KCSE grouping)
export function getSubjectGroup(name: string): number {
    if (/^english$|^kiswahili$|kenya sign/i.test(name.trim())) return 1;
    if (/biology|chemistry|physics|agriculture|home science|integrated science/i.test(name)) return 2;
    if (/mathemat/i.test(name)) return 3;
    if (/history|geography|cre|christian|ire|islamic|hre|hindu/i.test(name)) return 4;
    if (/business|computer|economics|accounting|commerce/i.test(name)) return 5;
    return 6;
}

export interface SubjectResult {
    subjectId: number; subjectName: string; score: number;
    grade: string; points: number; group: number;
    catAvg?: number | null; endTermScore?: number | null;
}

// CORRECT KNEC Best-7 Mean Grade (mandatory: English + Kiswahili + best 5 others)
export function computeKNECMeanGrade(results: SubjectResult[]): {
    totalPoints: number; meanGrade: string; best7: SubjectResult[];
    hasEnglish: boolean; hasKiswahili: boolean; isValid: boolean;
} {
    if (!results.length) return { totalPoints: 7, meanGrade: 'E', best7: [], hasEnglish: false, hasKiswahili: false, isValid: false };
    const english = results.find(r => /^english$/i.test(r.subjectName.trim()));
    const kiswahili = results.find(r => /^kiswahili$/i.test(r.subjectName.trim()));
    const mandatoryIds = new Set([english?.subjectId, kiswahili?.subjectId].filter(Boolean));
    const mandatories = [english, kiswahili].filter(Boolean) as SubjectResult[];
    const others = results.filter(r => !mandatoryIds.has(r.subjectId)).sort((a, b) => b.points - a.points);
    const best7 = [...mandatories, ...others.slice(0, 7 - mandatories.length)];
    const totalPoints = best7.reduce((a, r) => a + r.points, 0);
    return {
        totalPoints, meanGrade: getKNECMeanGrade(totalPoints), best7,
        hasEnglish: !!english, hasKiswahili: !!kiswahili, isValid: !!english && !!kiswahili && best7.length >= 7,
    };
}

// Process all marks for a student into weighted per-subject results
export function processStudentAllMarks(
    marks: { subject_id: number; exam_type: string; score: number; out_of?: number }[],
    subjects: { id: number; subject_name: string }[],
    customGrading?: any[]
): SubjectResult[] {
    const bySubject = new Map<number, typeof marks>();
    marks.forEach(m => {
        if (!bySubject.has(m.subject_id)) bySubject.set(m.subject_id, []);
        bySubject.get(m.subject_id)!.push(m);
    });
    const results: SubjectResult[] = [];
    bySubject.forEach((subMarks, subjectId) => {
        const subject = subjects.find(s => s.id === subjectId);
        if (!subject) return;
        const weightedScore = computeWeightedMark(subMarks.map(m => ({ examType: m.exam_type, score: m.score, outOf: m.out_of || 100 })));
        const gradeEntry = getSubjectGrade(weightedScore, customGrading);
        const cats = subMarks.filter(m => /cat|continuous|test\s*\d/i.test(m.exam_type));
        const endTerm = subMarks.find(m => /end.?term|final/i.test(m.exam_type));
        results.push({
            subjectId, subjectName: subject.subject_name, score: weightedScore,
            grade: gradeEntry.grade, points: gradeEntry.points,
            group: getSubjectGroup(subject.subject_name),
            catAvg: cats.length > 0 ? cats.reduce((a, m) => a + m.score, 0) / cats.length : null,
            endTermScore: endTerm?.score ?? null,
        });
    });
    return results;
}

// CBC Levels
export type CBCLevel = 'EE' | 'ME' | 'AE' | 'BE';
export const CBC_LEVEL_CONFIG = {
    EE: { label: 'Exceeds Expectation', level: 4, color: '#059669', bg: '#d1fae5', min: 80 },
    ME: { label: 'Meets Expectation',   level: 3, color: '#2563eb', bg: '#dbeafe', min: 60 },
    AE: { label: 'Approaches',          level: 2, color: '#d97706', bg: '#fef3c7', min: 40 },
    BE: { label: 'Below Expectation',   level: 1, color: '#dc2626', bg: '#fee2e2', min: 0  },
};
export const scoreToLevel = (s: number): CBCLevel => s >= 80 ? 'EE' : s >= 60 ? 'ME' : s >= 40 ? 'AE' : 'BE';

// Dropout risk score
export function computeRiskScore(avgScore: number, attendanceRate: number, feeBalance: number, subjectsFailing: number): {
    score: number; level: 'Critical' | 'High' | 'Medium' | 'Low'; reasons: string[];
} {
    let score = 0; const reasons: string[] = [];
    if (avgScore < 30) { score += 40; reasons.push('Average below 30%'); }
    else if (avgScore < 40) { score += 30; reasons.push('Average below 40%'); }
    else if (avgScore < 50) { score += 15; reasons.push('Average below 50%'); }
    if (attendanceRate < 50) { score += 30; reasons.push('Attendance below 50%'); }
    else if (attendanceRate < 70) { score += 20; reasons.push('Attendance below 70%'); }
    else if (attendanceRate < 80) { score += 10; reasons.push('Attendance below 80%'); }
    if (feeBalance > 50000) { score += 20; reasons.push('Fee balance > KES 50,000'); }
    else if (feeBalance > 20000) { score += 12; reasons.push('Fee balance > KES 20,000'); }
    if (subjectsFailing >= 5) { score += 10; reasons.push(`Failing ${subjectsFailing} subjects`); }
    score = Math.min(100, score);
    return { score, level: score >= 70 ? 'Critical' : score >= 50 ? 'High' : score >= 30 ? 'Medium' : 'Low', reasons };
}

// KNEC national averages 2023
export const NATIONAL_AVG_2023: Record<string, number> = {
    'Mathematics': 30.2, 'English': 43.5, 'Kiswahili': 51.8,
    'Biology': 45.6, 'Chemistry': 41.3, 'Physics': 44.1,
    'History & Government': 55.2, 'Geography': 52.7,
    'CRE': 61.4, 'Christian Religious Education': 61.4,
    'IRE': 63.1, 'Islamic Religious Education': 63.1,
    'Business Studies': 48.9, 'Computer Studies': 52.3,
    'Agriculture': 53.8, 'Home Science': 58.4,
};

export function vsNational(subjectName: string, schoolAvg: number) {
    const key = Object.keys(NATIONAL_AVG_2023).find(k => subjectName.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(subjectName.toLowerCase()));
    const national = key ? NATIONAL_AVG_2023[key] : 50;
    const gap = Math.round((schoolAvg - national) * 10) / 10;
    return { national, gap, above: gap >= 0 };
}

// KUCCPS courses database
export interface KUCCPSCourse {
    course: string; faculty: string; university: string;
    cluster: string[]; minClusterPts: number; minMeanGrade: string;
    required?: string[];
}

export const KUCCPS_COURSES: KUCCPSCourse[] = [
    { course: 'Medicine & Surgery (MBChB)', faculty: 'Medicine', university: 'University of Nairobi', cluster: ['Biology','Chemistry','Mathematics','Physics'], minClusterPts: 11.0, minMeanGrade: 'A-', required: ['Biology','Chemistry'] },
    { course: 'Medicine & Surgery (MBChB)', faculty: 'Medicine', university: 'Moi University', cluster: ['Biology','Chemistry','Mathematics','Physics'], minClusterPts: 10.8, minMeanGrade: 'A-', required: ['Biology','Chemistry'] },
    { course: 'Pharmacy (BPharm)', faculty: 'Pharmacy', university: 'University of Nairobi', cluster: ['Biology','Chemistry','Mathematics','Physics'], minClusterPts: 10.5, minMeanGrade: 'B+', required: ['Biology','Chemistry'] },
    { course: 'Nursing (BScN)', faculty: 'Health Sciences', university: 'University of Nairobi', cluster: ['Biology','Chemistry','Mathematics','English'], minClusterPts: 8.5, minMeanGrade: 'C+', required: ['Biology','Chemistry'] },
    { course: 'Dental Surgery (BDS)', faculty: 'Dentistry', university: 'University of Nairobi', cluster: ['Biology','Chemistry','Mathematics','Physics'], minClusterPts: 10.5, minMeanGrade: 'A-' },
    { course: 'Veterinary Medicine (BVM)', faculty: 'Veterinary', university: 'University of Nairobi', cluster: ['Biology','Chemistry','Mathematics','Agriculture'], minClusterPts: 9.5, minMeanGrade: 'B' },
    { course: 'Medical Lab Sciences', faculty: 'Health Sciences', university: 'JKUAT', cluster: ['Biology','Chemistry','Mathematics','Physics'], minClusterPts: 8.0, minMeanGrade: 'C+' },
    { course: 'Clinical Medicine', faculty: 'Health Sciences', university: 'Kenya Medical Training College', cluster: ['Biology','Chemistry','Mathematics','English'], minClusterPts: 7.5, minMeanGrade: 'C+' },
    { course: 'Civil Engineering', faculty: 'Engineering', university: 'University of Nairobi', cluster: ['Mathematics','Physics','Chemistry','Biology'], minClusterPts: 9.0, minMeanGrade: 'B', required: ['Mathematics','Physics'] },
    { course: 'Electrical Engineering', faculty: 'Engineering', university: 'University of Nairobi', cluster: ['Mathematics','Physics','Chemistry','Computer Studies'], minClusterPts: 9.5, minMeanGrade: 'B+', required: ['Mathematics','Physics'] },
    { course: 'Mechanical Engineering', faculty: 'Engineering', university: 'JKUAT', cluster: ['Mathematics','Physics','Chemistry','Biology'], minClusterPts: 9.0, minMeanGrade: 'B', required: ['Mathematics','Physics'] },
    { course: 'Computer Science (BSc)', faculty: 'ICT', university: 'University of Nairobi', cluster: ['Mathematics','Physics','Chemistry','Computer Studies'], minClusterPts: 8.5, minMeanGrade: 'B-', required: ['Mathematics'] },
    { course: 'Information Technology', faculty: 'ICT', university: 'JKUAT', cluster: ['Mathematics','Physics','Computer Studies','Biology'], minClusterPts: 7.5, minMeanGrade: 'C+' },
    { course: 'Software Engineering', faculty: 'ICT', university: 'Strathmore University', cluster: ['Mathematics','Physics','Computer Studies','Chemistry'], minClusterPts: 8.0, minMeanGrade: 'B-', required: ['Mathematics'] },
    { course: 'Architecture', faculty: 'Engineering', university: 'University of Nairobi', cluster: ['Mathematics','Physics','Art & Design','Chemistry'], minClusterPts: 8.0, minMeanGrade: 'C+' },
    { course: 'BSc Mathematics', faculty: 'Pure Sciences', university: 'University of Nairobi', cluster: ['Mathematics','Physics','Chemistry','Biology'], minClusterPts: 8.0, minMeanGrade: 'B-', required: ['Mathematics'] },
    { course: 'BSc Biology', faculty: 'Pure Sciences', university: 'Kenyatta University', cluster: ['Biology','Chemistry','Mathematics','Physics'], minClusterPts: 7.0, minMeanGrade: 'C+', required: ['Biology'] },
    { course: 'Bachelor of Education (Science)', faculty: 'Education', university: 'Kenyatta University', cluster: ['Biology','Chemistry','Mathematics','Physics'], minClusterPts: 7.0, minMeanGrade: 'C+' },
    { course: 'Bachelor of Education (Arts)', faculty: 'Education', university: 'Kenyatta University', cluster: ['English','History & Government','Geography','Kiswahili'], minClusterPts: 6.0, minMeanGrade: 'C' },
    { course: 'Bachelor of Commerce', faculty: 'Business', university: 'University of Nairobi', cluster: ['Mathematics','English','Kiswahili','Business Studies'], minClusterPts: 7.0, minMeanGrade: 'C+' },
    { course: 'Bachelor of Economics', faculty: 'Economics', university: 'University of Nairobi', cluster: ['Mathematics','Economics','English','Business Studies'], minClusterPts: 8.0, minMeanGrade: 'B-', required: ['Mathematics'] },
    { course: 'Bachelor of Accounting', faculty: 'Business', university: 'JKUAT', cluster: ['Mathematics','Business Studies','Economics','English'], minClusterPts: 7.0, minMeanGrade: 'C+' },
    { course: 'Bachelor of Laws (LLB)', faculty: 'Law', university: 'University of Nairobi', cluster: ['English','History & Government','Kiswahili','Mathematics'], minClusterPts: 9.0, minMeanGrade: 'B+', required: ['English'] },
    { course: 'Bachelor of Arts (English)', faculty: 'Arts', university: 'Kenyatta University', cluster: ['English','History & Government','Geography','Kiswahili'], minClusterPts: 6.0, minMeanGrade: 'C' },
    { course: 'BSc Agriculture', faculty: 'Agriculture', university: 'University of Nairobi', cluster: ['Agriculture','Biology','Chemistry','Mathematics'], minClusterPts: 7.5, minMeanGrade: 'C+', required: ['Biology'] },
    { course: 'BSc Food Science & Technology', faculty: 'Agriculture', university: 'University of Nairobi', cluster: ['Biology','Chemistry','Agriculture','Mathematics'], minClusterPts: 7.0, minMeanGrade: 'C+' },
    { course: 'BSc Environmental Science', faculty: 'Environment', university: 'JKUAT', cluster: ['Biology','Chemistry','Geography','Mathematics'], minClusterPts: 6.5, minMeanGrade: 'C+' },
    { course: 'BSc Journalism & Media', faculty: 'Media', university: 'Daystar University', cluster: ['English','History & Government','Kiswahili','Geography'], minClusterPts: 6.0, minMeanGrade: 'C' },
    { course: 'BSc Social Work', faculty: 'Social Sciences', university: 'Catholic University', cluster: ['English','History & Government','Geography','Biology'], minClusterPts: 5.5, minMeanGrade: 'C-' },
    { course: 'Bachelor of Fine Art', faculty: 'Arts', university: 'Kenyatta University', cluster: ['Art & Design','English','History & Government','Kiswahili'], minClusterPts: 5.0, minMeanGrade: 'C-' },
];

export function computeClusterPoints(results: SubjectResult[], clusterSubjects: string[]): number {
    const scores = clusterSubjects.map(name => {
        const r = results.find(r => r.subjectName.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(r.subjectName.toLowerCase()));
        return r ? r.score : 0;
    });
    if (scores.filter(s => s > 0).length < 2) return 0;
    const weighted = scores[0] * 2 + (scores[1] || 0) + (scores[2] || 0) + (scores[3] || 0);
    return Math.round((weighted / 500) * 12 * 10) / 10;
}

export function getQualifyingCourses(results: SubjectResult[], meanGrade: string) {
    return KUCCPS_COURSES.map(course => {
        const clusterPts = computeClusterPoints(results, course.cluster);
        const meetsGrade = gradeIndex(meanGrade) <= gradeIndex(course.minMeanGrade);
        const meetsCluster = clusterPts >= course.minClusterPts;
        const meetsRequired = !course.required || course.required.every(req =>
            results.some(r => r.subjectName.toLowerCase().includes(req.toLowerCase()) && r.points >= 6)
        );
        const qualifies = meetsGrade && meetsCluster && meetsRequired;
        return { course, clusterPts, qualifies, gap: Math.round((course.minClusterPts - clusterPts) * 10) / 10 };
    }).sort((a, b) => {
        if (a.qualifies && !b.qualifies) return -1;
        if (!a.qualifies && b.qualifies) return 1;
        return a.gap - b.gap;
    });
}
