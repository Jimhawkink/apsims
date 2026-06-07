const fs = require('fs');
const f = 'src/app/dashboard/learning/page.tsx';
const lines = fs.readFileSync(f, 'utf8').split('\n');

// Fix line 1412 (index 1411) — handle missing table gracefully
lines[1411] = "            .order('sort_order').then(({ data, error }) => { if (data && !error) setDbVideos(data); });";

fs.writeFileSync(f, lines.join('\n'), 'utf8');
console.log('Done — DB error now handled silently');
