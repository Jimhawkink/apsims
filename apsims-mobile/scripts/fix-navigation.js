// Fix "Cannot find name 'navigation'" errors in screens that use ScreenHeader
// with onBack={() => navigation.goBack()} but missing const navigation = useNavigation()
const fs = require('fs');
const path = require('path');

const FILES = [
    'E:/Res Pos/AlphaSchool/apsims-mobile/src/screens/bursar/BursarAccountsScreen.tsx',
    'E:/Res Pos/AlphaSchool/apsims-mobile/src/screens/bursar/BursarExpensesScreen.tsx',
    'E:/Res Pos/AlphaSchool/apsims-mobile/src/screens/bursar/BursarFeesScreen.tsx',
    'E:/Res Pos/AlphaSchool/apsims-mobile/src/screens/bursar/BursarIncomeScreen.tsx',
    'E:/Res Pos/AlphaSchool/apsims-mobile/src/screens/bursar/BursarReportsScreen.tsx',
    'E:/Res Pos/AlphaSchool/apsims-mobile/src/screens/bursar/BursarStoresScreen.tsx',
    'E:/Res Pos/AlphaSchool/apsims-mobile/src/screens/principal/AcademicReportScreen.tsx',
    'E:/Res Pos/AlphaSchool/apsims-mobile/src/screens/principal/FinanceReportScreen.tsx',
];

let fixed = 0, skipped = 0;

for (const filePath of FILES) {
    const fp = filePath.replace(/\//g, path.sep);
    if (!fs.existsSync(fp)) { console.log('NOT FOUND:', fp); continue; }

    let content = fs.readFileSync(fp, 'utf8');

    // Skip if navigation is already declared
    if (/const navigation\s*=\s*useNavigation/.test(content)) {
        console.log('⏭  Already has navigation:', path.basename(fp));
        skipped++;
        continue;
    }

    // Ensure useNavigation is imported
    if (!content.includes('useNavigation')) {
        // Add to existing @react-navigation/native import if present
        if (content.includes("from '@react-navigation/native'")) {
            content = content.replace(
                /import \{([^}]+)\} from '@react-navigation\/native'/,
                (m, imports) => `import { ${imports.trim()}, useNavigation } from '@react-navigation/native'`
            );
        } else {
            // Add new import after last import line
            content = content.replace(
                /(import[^\n]+\n)(?!import)/,
                `$1import { useNavigation } from '@react-navigation/native';\n`
            );
        }
    }

    // Inject const navigation = useNavigation() inside the component function
    // Find the first export default function line, then the first opening brace
    content = content.replace(
        /(export default function \w+\([^)]*\)\s*\{)/,
        `$1\n    const navigation = useNavigation();`
    );

    fs.writeFileSync(fp, content, 'utf8');
    console.log('✅ Fixed navigation in:', path.basename(fp));
    fixed++;
}

console.log(`\nDone: ${fixed} fixed, ${skipped} skipped`);
