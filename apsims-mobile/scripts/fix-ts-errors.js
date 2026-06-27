const fs = require('fs');
const path = require('path');

// 1. Fix LibraryReportScreen + StoresReportScreen + HomeworkAssignmentScreen
const navFiles = [
    'src/screens/principal/LibraryReportScreen.tsx',
    'src/screens/principal/StoresReportScreen.tsx',
    'src/screens/teacher/HomeworkAssignmentScreen.tsx',
];

for (const rel of navFiles) {
    const fp = path.join('E:\\Res Pos\\AlphaSchool\\apsims-mobile', rel);
    if (!fs.existsSync(fp)) { console.log('NOT FOUND:', fp); continue; }
    let c = fs.readFileSync(fp, 'utf8');
    if (!/const navigation\s*=/.test(c)) {
        // Ensure useNavigation is imported
        if (!c.includes('useNavigation')) {
            c = c.replace(
                /from '@react-navigation\/native'/,
                "from '@react-navigation/native'"
            );
            // Add import line if not present
            c = "import { useNavigation } from '@react-navigation/native';\n" + c;
        }
        // Inject const navigation inside component
        c = c.replace(
            /(export default function \w+\([^)]*\)\s*\{)/,
            '$1\n    const navigation = useNavigation();'
        );
        fs.writeFileSync(fp, c, 'utf8');
        console.log('Fixed navigation in:', path.basename(fp));
    } else {
        console.log('Already has navigation:', path.basename(fp));
    }
}

// 2. Fix ExamScheduleScreen — session.user_name -> session.username
const examFp = path.join('E:\\Res Pos\\AlphaSchool\\apsims-mobile', 'src\\screens\\teacher\\ExamScheduleScreen.tsx');
if (fs.existsSync(examFp)) {
    let c = fs.readFileSync(examFp, 'utf8');
    c = c.replace(/session\?\.user_name/g, 'session?.username');
    fs.writeFileSync(examFp, c, 'utf8');
    console.log('Fixed ExamScheduleScreen: user_name -> username');
}

// 3. Fix StudentDashboard — getCurrentTerm called with wrong args
const sdFp = path.join('E:\\Res Pos\\AlphaSchool\\apsims-mobile', 'src\\screens\\student\\StudentDashboard.tsx');
if (fs.existsSync(sdFp)) {
    let c = fs.readFileSync(sdFp, 'utf8');
    // Replace getCurrentTerm(anything) with getCurrentTerm()
    c = c.replace(/getCurrentTerm\([^)]+\)/g, 'getCurrentTerm()');
    fs.writeFileSync(sdFp, c, 'utf8');
    console.log('Fixed StudentDashboard: getCurrentTerm() args');
}

// 4. Fix PushNotificationService — trigger needs type field
const pushFp = path.join('E:\\Res Pos\\AlphaSchool\\apsims-mobile', 'src\\services\\PushNotificationService.ts');
if (fs.existsSync(pushFp)) {
    let c = fs.readFileSync(pushFp, 'utf8');
    // Replace { seconds: N } with proper typed trigger
    c = c.replace(/\{\s*seconds:\s*(\d+)\s*\}/g, function(match, secs) {
        return '{ type: \'timeInterval\', seconds: ' + secs + ', repeats: false }';
    });
    fs.writeFileSync(pushFp, c, 'utf8');
    console.log('Fixed PushNotificationService: trigger type');
}

// 5. Fix StudentTabNavigator — "Results" tab name
const stFp = path.join('E:\\Res Pos\\AlphaSchool\\apsims-mobile', 'src\\navigation\\StudentTabNavigator.tsx');
if (fs.existsSync(stFp)) {
    let c = fs.readFileSync(stFp, 'utf8');
    // Check what's there around line 75
    const lines = c.split('\n');
    console.log('StudentTabNavigator around line 73-77:');
    for (let i = 72; i < Math.min(78, lines.length); i++) {
        console.log((i + 1) + ':', lines[i]);
    }
}

// 6. Fix TeacherTabNavigator — "Schedule" tab name
const ttFp = path.join('E:\\Res Pos\\AlphaSchool\\apsims-mobile', 'src\\navigation\\TeacherTabNavigator.tsx');
if (fs.existsSync(ttFp)) {
    let c = fs.readFileSync(ttFp, 'utf8');
    const lines = c.split('\n');
    console.log('\nTeacherTabNavigator around line 92-122:');
    for (let i = 91; i < Math.min(122, lines.length); i++) {
        console.log((i + 1) + ':', lines[i]);
    }
}

console.log('\nDone!');
