const fs = require('fs');
const path = require('path');

const screens = [
  // Principal sub-screens
  { file: 'E:/Res Pos/AlphaSchool/apsims-mobile/src/screens/principal/PrincipalStudentsScreen.tsx', title: '👨‍🎓 Students', grad: "['#7C3AED','#6D28D9']" },
  { file: 'E:/Res Pos/AlphaSchool/apsims-mobile/src/screens/principal/PrincipalStaffScreen.tsx', title: '👩‍🏫 Staff', grad: "['#0D9488','#059669']" },
  { file: 'E:/Res Pos/AlphaSchool/apsims-mobile/src/screens/principal/PrincipalAttendanceScreen.tsx', title: '📋 Attendance', grad: "['#2563EB','#1D4ED8']" },
  { file: 'E:/Res Pos/AlphaSchool/apsims-mobile/src/screens/principal/PrincipalDisciplineScreen.tsx', title: '🚨 Discipline', grad: "['#EF4444','#DC2626']" },
  { file: 'E:/Res Pos/AlphaSchool/apsims-mobile/src/screens/principal/AcademicReportScreen.tsx', title: '📊 Academic Report', grad: "['#4F46E5','#7C3AED']" },
  { file: 'E:/Res Pos/AlphaSchool/apsims-mobile/src/screens/principal/FinanceReportScreen.tsx', title: '💰 Finance Report', grad: "['#0D9488','#059669']" },
  { file: 'E:/Res Pos/AlphaSchool/apsims-mobile/src/screens/principal/LibraryReportScreen.tsx', title: '📖 Library', grad: "['#EC4899','#DB2777']" },
  { file: 'E:/Res Pos/AlphaSchool/apsims-mobile/src/screens/principal/StoresReportScreen.tsx', title: '📦 Stores', grad: "['#F59E0B','#D97706']" },
  // Bursar sub-screens
  { file: 'E:/Res Pos/AlphaSchool/apsims-mobile/src/screens/bursar/BursarFeesScreen.tsx', title: '💳 Fee Collection', grad: "['#0D9488','#0F766E']" },
  { file: 'E:/Res Pos/AlphaSchool/apsims-mobile/src/screens/bursar/BursarExpensesScreen.tsx', title: '📝 Expenses', grad: "['#EF4444','#DC2626']" },
  { file: 'E:/Res Pos/AlphaSchool/apsims-mobile/src/screens/bursar/BursarIncomeScreen.tsx', title: '💵 Income', grad: "['#059669','#047857']" },
  { file: 'E:/Res Pos/AlphaSchool/apsims-mobile/src/screens/bursar/BursarReportsScreen.tsx', title: '📊 Reports', grad: "['#6366F1','#4F46E5']" },
  { file: 'E:/Res Pos/AlphaSchool/apsims-mobile/src/screens/bursar/BursarStoresScreen.tsx', title: '📦 Stores', grad: "['#F59E0B','#D97706']" },
  { file: 'E:/Res Pos/AlphaSchool/apsims-mobile/src/screens/bursar/BursarAccountsScreen.tsx', title: '🏦 Accounts & Payroll', grad: "['#0891B2','#0C4A6E']" },
  // Shared sub-screens
  { file: 'E:/Res Pos/AlphaSchool/apsims-mobile/src/screens/shared/NotificationScreen.tsx', title: '🔔 Notifications', grad: "['#EC4899','#DB2777']" },
  { file: 'E:/Res Pos/AlphaSchool/apsims-mobile/src/screens/shared/ReportCardScreen.tsx', title: '📄 Report Card', grad: "['#2563EB','#1D4ED8']" },
  { file: 'E:/Res Pos/AlphaSchool/apsims-mobile/src/screens/shared/ExportScreen.tsx', title: '📤 Data Export', grad: "['#475569','#334155']" },
  { file: 'E:/Res Pos/AlphaSchool/apsims-mobile/src/screens/shared/AnnouncementScreen.tsx', title: '📢 Announcement', grad: "['#7C3AED','#6D28D9']" },
  // Parent sub-screens
  { file: 'E:/Res Pos/AlphaSchool/apsims-mobile/src/screens/parent/AttendanceScreen.tsx', title: '📋 Attendance', grad: "['#7C3AED','#6D28D9']" },
  { file: 'E:/Res Pos/AlphaSchool/apsims-mobile/src/screens/parent/ChildTimetableScreen.tsx', title: '🗓️ Child Timetable', grad: "['#7C3AED','#6D28D9']" },
  { file: 'E:/Res Pos/AlphaSchool/apsims-mobile/src/screens/parent/CircularScreen.tsx', title: '📰 Circulars', grad: "['#F59E0B','#D97706']" },
  { file: 'E:/Res Pos/AlphaSchool/apsims-mobile/src/screens/parent/HealthRecordScreen.tsx', title: '🏥 Health Records', grad: "['#059669','#047857']" },
  { file: 'E:/Res Pos/AlphaSchool/apsims-mobile/src/screens/parent/HomeworkScreen.tsx', title: '📝 Homework', grad: "['#2563EB','#1D4ED8']" },
  { file: 'E:/Res Pos/AlphaSchool/apsims-mobile/src/screens/parent/LeaveOutScreen.tsx', title: '🚪 Leave Out', grad: "['#F97316','#EA580C']" },
  { file: 'E:/Res Pos/AlphaSchool/apsims-mobile/src/screens/parent/PayFeesScreen.tsx', title: '💳 Pay Fees', grad: "['#0D9488','#0F766E']" },
  // Student sub-screens
  { file: 'E:/Res Pos/AlphaSchool/apsims-mobile/src/screens/student/AttendanceScreen.tsx', title: '📋 My Attendance', grad: "['#0D9488','#059669']" },
  { file: 'E:/Res Pos/AlphaSchool/apsims-mobile/src/screens/student/CBCAssessmentScreen.tsx', title: '🎓 CBC Levels', grad: "['#7C3AED','#6D28D9']" },
  { file: 'E:/Res Pos/AlphaSchool/apsims-mobile/src/screens/student/FeeBalanceScreen.tsx', title: '💰 Fee Balance', grad: "['#0D9488','#059669']" },
  { file: 'E:/Res Pos/AlphaSchool/apsims-mobile/src/screens/student/ResultsScreen.tsx', title: '📊 My Results', grad: "['#2563EB','#1D4ED8']" },
  { file: 'E:/Res Pos/AlphaSchool/apsims-mobile/src/screens/student/TimetableScreen.tsx', title: '🗓️ My Timetable', grad: "['#0D9488','#059669']" },
  // Teacher sub-screens
  { file: 'E:/Res Pos/AlphaSchool/apsims-mobile/src/screens/teacher/ClassPerformanceScreen.tsx', title: '📊 Class Performance', grad: "['#2563EB','#1D4ED8']" },
  { file: 'E:/Res Pos/AlphaSchool/apsims-mobile/src/screens/teacher/ExamScheduleScreen.tsx', title: '📅 Exam Schedule', grad: "['#2563EB','#1D4ED8']" },
  { file: 'E:/Res Pos/AlphaSchool/apsims-mobile/src/screens/teacher/HomeworkAssignmentScreen.tsx', title: '📝 Homework', grad: "['#059669','#047857']" },
  { file: 'E:/Res Pos/AlphaSchool/apsims-mobile/src/screens/teacher/RemedialsScreen.tsx', title: '⚡ Remedials', grad: "['#F59E0B','#D97706']" },
  { file: 'E:/Res Pos/AlphaSchool/apsims-mobile/src/screens/teacher/TimetableScreen.tsx', title: '🗓️ My Timetable', grad: "['#0D9488','#059669']" },
  { file: 'E:/Res Pos/AlphaSchool/apsims-mobile/src/screens/teacher/CBCProgressScreen.tsx', title: '🎓 CBC Progress', grad: "['#7C3AED','#6D28D9']" },
];

let fixed = 0, alreadyDone = 0, notFound = 0, errors = 0;

for (const screen of screens) {
  try {
    // Normalize path separators for Windows
    const filePath = screen.file.replace(/\//g, path.sep);

    if (!fs.existsSync(filePath)) {
      console.log('NOT FOUND:', path.basename(filePath));
      notFound++;
      continue;
    }

    let content = fs.readFileSync(filePath, 'utf8');

    if (content.includes('ScreenHeader')) {
      console.log('ALREADY FIXED:', path.basename(filePath));
      alreadyDone++;
      continue;
    }

    // ── 1. Add ScreenHeader import ──────────────────────────────
    // Insert after the last import line
    const importInsert = "import ScreenHeader from '../../components/ScreenHeader';";
    const lastImportIdx = content.lastIndexOf("import ");
    const endOfLastImport = content.indexOf('\n', lastImportIdx) + 1;
    content = content.slice(0, endOfLastImport) + importInsert + '\n' + content.slice(endOfLastImport);

    // ── 2. Add useNavigation if missing ───────────────────────────
    if (!content.includes('useNavigation') && !content.includes('navigation')) {
      content = content.replace(
        "import { LinearGradient }",
        "import { useNavigation } from '@react-navigation/native';\nimport { LinearGradient }"
      );
    }

    // ── 3. Replace the gradient header block ────────────────────
    // Match: <LinearGradient ... style={styles.header...}>...</LinearGradient>
    const headerRegex = /<LinearGradient[^>]*style=\{styles\.header[^}]*\}[\s\S]*?<\/LinearGradient>/;
    const screenHeaderJSX = 
      `<ScreenHeader\n                title="${screen.title}"\n                onBack={() => navigation.goBack()}\n                gradient={${screen.grad}}\n            />`;

    if (headerRegex.test(content)) {
      content = content.replace(headerRegex, screenHeaderJSX);
      console.log('  → Replaced gradient header');
    } else {
      // Try simpler SafeAreaView header pattern
      const altHeaderRegex = /<SafeAreaView[^>]*>\s*<StatusBar[^/]*\/>\s*<LinearGradient[\s\S]*?<\/LinearGradient>\s*<\/SafeAreaView>/;
      if (altHeaderRegex.test(content)) {
        content = content.replace(altHeaderRegex, screenHeaderJSX);
        console.log('  → Replaced SafeAreaView+gradient header');
      } else {
        console.log('  → No matching header pattern, added import only');
      }
    }

    // ── 4. Upgrade background color to premium ultra-light ───────
    content = content.replace(/backgroundColor:\s*'#f8fafc'/g, "backgroundColor: '#F8FAFF'");
    content = content.replace(/backgroundColor:\s*'#f1f5f9'/g, "backgroundColor: '#F8FAFF'");
    content = content.replace(/bg:\s*'#f8fafc'/g, "bg: '#F8FAFF'");
    content = content.replace(/bg:\s*'#f1f5f9'/g, "bg: '#F8FAFF'");

    // ── 5. Upgrade card border radius to 20+ ─────────────────────
    content = content.replace(/borderRadius:\s*12/g, 'borderRadius: 16');
    content = content.replace(/borderRadius:\s*14/g, 'borderRadius: 18');

    // ── 6. Upgrade card shadow to premium ────────────────────────
    content = content.replace(/shadowOpacity:\s*0\.04/g, 'shadowOpacity: 0.07');
    content = content.replace(/shadowOpacity:\s*0\.05/g, 'shadowOpacity: 0.08');

    fs.writeFileSync(filePath, content, 'utf8');
    fixed++;
    console.log('✅ DONE:', path.basename(filePath));
  } catch (e) {
    console.log('❌ ERROR on', path.basename(screen.file), ':', e.message);
    errors++;
  }
}

console.log('\n═══════════════════════════════');
console.log(`✅ Fixed:      ${fixed}`);
console.log(`⏭  Already OK: ${alreadyDone}`);
console.log(`❌ Not found:  ${notFound}`);
console.log(`💥 Errors:     ${errors}`);
console.log('═══════════════════════════════');
