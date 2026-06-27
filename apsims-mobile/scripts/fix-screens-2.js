// Fix screens where header pattern didn't auto-match
// These screens need navigation.goBack() wired to ScreenHeader manually
const fs = require('fs');
const path = require('path');

// These all need a ScreenHeader injected right after the outermost <View style={{ flex:1...
const screens = [
  // Principal - use Ultra components so they have different header structures
  'E:/Res Pos/AlphaSchool/apsims-mobile/src/screens/principal/PrincipalStudentsScreen.tsx',
  'E:/Res Pos/AlphaSchool/apsims-mobile/src/screens/principal/PrincipalStaffScreen.tsx',
  'E:/Res Pos/AlphaSchool/apsims-mobile/src/screens/principal/PrincipalAttendanceScreen.tsx',
  'E:/Res Pos/AlphaSchool/apsims-mobile/src/screens/principal/PrincipalDisciplineScreen.tsx',
  // Parent - custom header structures
  'E:/Res Pos/AlphaSchool/apsims-mobile/src/screens/parent/ChildTimetableScreen.tsx',
  'E:/Res Pos/AlphaSchool/apsims-mobile/src/screens/parent/CircularScreen.tsx',
  'E:/Res Pos/AlphaSchool/apsims-mobile/src/screens/parent/PayFeesScreen.tsx',
  // Teacher
  'E:/Res Pos/AlphaSchool/apsims-mobile/src/screens/teacher/ExamScheduleScreen.tsx',
  'E:/Res Pos/AlphaSchool/apsims-mobile/src/screens/teacher/RemedialsScreen.tsx',
  'E:/Res Pos/AlphaSchool/apsims-mobile/src/screens/teacher/CBCProgressScreen.tsx',
  // Student
  'E:/Res Pos/AlphaSchool/apsims-mobile/src/screens/student/ResultsScreen.tsx',
];

const configs = {
  'PrincipalStudentsScreen.tsx': { title: '👨‍🎓 Students', grad: "['#7C3AED','#6D28D9']" },
  'PrincipalStaffScreen.tsx': { title: '👩‍🏫 Staff', grad: "['#0D9488','#059669']" },
  'PrincipalAttendanceScreen.tsx': { title: '📋 Attendance', grad: "['#2563EB','#1D4ED8']" },
  'PrincipalDisciplineScreen.tsx': { title: '🚨 Discipline', grad: "['#EF4444','#DC2626']" },
  'ChildTimetableScreen.tsx': { title: '🗓️ Child Timetable', grad: "['#7C3AED','#6D28D9']" },
  'CircularScreen.tsx': { title: '📰 Circulars', grad: "['#F59E0B','#D97706']" },
  'PayFeesScreen.tsx': { title: '💳 Pay Fees', grad: "['#0D9488','#0F766E']" },
  'ExamScheduleScreen.tsx': { title: '📅 Exam Schedule', grad: "['#2563EB','#1D4ED8']" },
  'RemedialsScreen.tsx': { title: '⚡ Remedials', grad: "['#F59E0B','#D97706']" },
  'CBCProgressScreen.tsx': { title: '🎓 CBC Progress', grad: "['#7C3AED','#6D28D9']" },
  'ResultsScreen.tsx': { title: '📊 My Results', grad: "['#2563EB','#1D4ED8']" },
};

let fixed = 0;
for (const file of screens) {
  try {
    const filePath = file.replace(/\//g, path.sep);
    const base = path.basename(filePath);
    const cfg = configs[base];
    if (!cfg) { console.log('No config for', base); continue; }

    let content = fs.readFileSync(filePath, 'utf8');

    // Add navigation hook if needed
    if (!content.includes('const navigation') && !content.includes('navigation =')) {
      // Find the component function body start
      content = content.replace(
        /export default function \w+[^{]*{/,
        (match) => match + '\n    const navigation = useNavigation();'
      );
      // Also ensure useNavigation is imported
      if (!content.includes('useNavigation')) {
        content = content.replace(
          "import { useNavigation }",
          "import { useNavigation }"
        );
        if (!content.includes('useNavigation')) {
          content = content.replace(
            "import { LinearGradient }",
            "import { useNavigation } from '@react-navigation/native';\nimport { LinearGradient }"
          );
        }
      }
    }

    // Find the first return statement's outermost View/SafeAreaView and inject ScreenHeader after it
    // Strategy: find 'return (' then the first '<View' and inject ScreenHeader after it
    const screenHeaderJSX = `\n            {/* \u2500\u2500 PREMIUM BACK NAVIGATION \u2500\u2500 */}\n            <ScreenHeader\n                title="${cfg.title}"\n                onBack={() => navigation.goBack()}\n                gradient={${cfg.grad}}\n            />`;

    // Remove any old StatusBar + simple header text (without gradient)
    // Pattern: look for existing title header that's just text in View
    const viewHeaderPattern = /<View[^>]*style={[^}]*header[^}]*}[^>]*>[\s\S]*?<\/View>/;

    // Try to inject after the root View opening tag (but not replace the whole header)
    // First check if there's a View style={styles.container} or similar root
    const rootViewMatch = content.match(/(<View\s+style=\{\{?\s*flex:\s*1[^}]*\}?\}>\s*\n)/);
    if (rootViewMatch) {
      const insertPos = content.indexOf(rootViewMatch[0]) + rootViewMatch[0].length;
      content = content.slice(0, insertPos) + screenHeaderJSX + '\n' + content.slice(insertPos);
      console.log('✅ Injected after root View:', base);
      fixed++;
    } else {
      // Try after return (
      const returnMatch = content.match(/return \(\s*\n(\s*<View)/);
      if (returnMatch) {
        const idx = content.indexOf(returnMatch[0]) + returnMatch[0].length;
        content = content.slice(0, idx) + screenHeaderJSX + '\n' + content.slice(idx);
        console.log('✅ Injected after return View:', base);
        fixed++;
      } else {
        console.log('⚠️  Could not find injection point:', base);
      }
    }

    fs.writeFileSync(filePath, content, 'utf8');
  } catch (e) {
    console.log('❌ ERROR:', path.basename(file), '-', e.message);
  }
}

console.log('\nFixed:', fixed, '/', screens.length);
