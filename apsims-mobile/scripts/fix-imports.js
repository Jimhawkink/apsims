// Fix broken imports injected mid-block by batch fixer script
const fs = require('fs');
const path = require('path');

const fixes = [
    {
        file: 'E:/Res Pos/AlphaSchool/apsims-mobile/src/screens/parent/HomeworkScreen.tsx',
        broken: [
            // Remove duplicate React import line
            /^import React.*\r?\n/m,
            // Remove orphan teal line before const C
            /^\s*teal:.*\r?\n\s*text:.*\r?\n\};\r?\n/m,
        ],
        header: `import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    RefreshControl, ActivityIndicator, StatusBar, SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useSession } from '../../context/SessionContext';
import {
    getHomeworkWithSubmissions, acknowledgeHomework,
    HomeworkWithSubmission, formatDate,
} from '../../lib/supabase';
import ScreenHeader from '../../components/ScreenHeader';

const C = {
    bg: '#F8FAFF', card: '#ffffff', border: '#e2e8f0',
    primary: '#7c3aed', accent: '#059669', accentLight: '#d1fae5',
    danger: '#ef4444', dangerLight: '#fee2e2',
    warning: '#f59e0b', warningLight: '#fef3c7',
    teal: '#0d9488', tealLight: '#ccfbf1',
    text: '#0f172a', textSub: '#64748b', textDim: '#94a3b8',
};
`
    },
    {
        file: 'E:/Res Pos/AlphaSchool/apsims-mobile/src/screens/student/FeeBalanceScreen.tsx',
    },
    {
        file: 'E:/Res Pos/AlphaSchool/apsims-mobile/src/screens/teacher/HomeworkAssignmentScreen.tsx',
    }
];

// Generic fixer: finds the broken pattern where ScreenHeader import
// was inserted INSIDE a multi-line import { ... } block
function fixFile(filePath) {
    const fp = filePath.replace(/\//g, path.sep);
    if (!fs.existsSync(fp)) { console.log('NOT FOUND:', fp); return; }

    let content = fs.readFileSync(fp, 'utf8');

    // Pattern: import {\nimport ScreenHeader from ...\n    actualExport,
    // Fix: move ScreenHeader to after the closing } from '...'
    const brokenPattern = /(import \{[\s\S]*?)(\nimport ScreenHeader from '([^']+)';)([\s\S]*?\} from '[^']+';)/;

    if (brokenPattern.test(content)) {
        content = content.replace(brokenPattern, (match, before, screenImport, importPath, rest) => {
            return before + rest + '\nimport ScreenHeader from \'' + importPath + '\';';
        });
        console.log('✅ Fixed broken import in:', path.basename(fp));
    } else {
        // Deduplicate if React import appears twice
        const reactImportPattern = /^(import React[^\n]+\n)\1/m;
        if (reactImportPattern.test(content)) {
            content = content.replace(reactImportPattern, '$1');
            console.log('✅ Removed duplicate React import in:', path.basename(fp));
        } else {
            console.log('⚠️  No broken pattern found in:', path.basename(fp));
        }
    }

    fs.writeFileSync(fp, content, 'utf8');
}

// Fix HomeworkScreen manually since it's most corrupted
const hwFile = 'E:/Res Pos/AlphaSchool/apsims-mobile/src/screens/parent/HomeworkScreen.tsx'.replace(/\//g, path.sep);
let hw = fs.readFileSync(hwFile, 'utf8');

// Remove the duplicate React import
hw = hw.replace(/^import React\b.*\r?\nimport React\b/m, 'import React');

// Find and fix the orphan teal/text lines before export default
// These appear because the C = { ... } block was split
if (hw.includes("teal: '#0d9488', tealLight: '#ccfbf1',") && !hw.includes("const C = {")) {
    // The const C block was corrupted. Re-insert it properly
    hw = hw.replace(
        /import ScreenHeader from '\.\.\/\.\.\/components\/ScreenHeader';\s*\r?\n\s*teal:[^\n]+\r?\n\s*text:[^\n]+\r?\n\};\s*\r?\n/,
        `import ScreenHeader from '../../components/ScreenHeader';\n\nconst C = {\n    bg: '#F8FAFF', card: '#ffffff', border: '#e2e8f0',\n    primary: '#7c3aed', accent: '#059669', accentLight: '#d1fae5',\n    danger: '#ef4444', dangerLight: '#fee2e2',\n    warning: '#f59e0b', warningLight: '#fef3c7',\n    teal: '#0d9488', tealLight: '#ccfbf1',\n    text: '#0f172a', textSub: '#64748b', textDim: '#94a3b8',\n};\n\n`
    );
    console.log('✅ Restored C object in HomeworkScreen');
}
fs.writeFileSync(hwFile, hw, 'utf8');

// Fix FeeBalanceScreen and HomeworkAssignmentScreen
fixFile('E:/Res Pos/AlphaSchool/apsims-mobile/src/screens/student/FeeBalanceScreen.tsx');
fixFile('E:/Res Pos/AlphaSchool/apsims-mobile/src/screens/teacher/HomeworkAssignmentScreen.tsx');

console.log('\nAll fixes applied!');
