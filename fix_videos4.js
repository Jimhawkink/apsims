const fs = require('fs');
const f = 'src/app/dashboard/learning/page.tsx';
const lines = fs.readFileSync(f, 'utf8').split('\n');

// Replace footer lines 1253-1263 (indices 1252-1262) with enhanced footer
const newFooter = [
    '                    <div className="flex items-center gap-2 flex-wrap">',
    '                        {/* Always visible MoE search button */}',
    '                        <a href={ytSearchUrl} target="_blank" rel="noopener noreferrer"',
    '                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 transition-all">',
    '                            \uD83C\uDF93 Search MoE YouTube',
    '                        </a>',
    '                        {/* Video unavailable fallback button — only for verified videos */}',
    '                        {isVerified && !useFallback && (',
    '                            <button onClick={() => { setUseFallback(true); setLoaded(false); setPlaying(true); }}',
    '                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-amber-600 bg-amber-50 hover:bg-amber-100 transition-all border border-amber-200">',
    '                                \u26A0\uFE0F Video Unavailable? Click Here',
    '                            </button>',
    '                        )}',
    '                        <a href={ytUrl} target="_blank" rel="noopener noreferrer"',
    '                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black text-white transition-all hover:opacity-90"',
    '                            style={{ background: \'#ef4444\' }}>',
    '                            <FiYoutube size={13} /> Open YouTube',
    '                        </a>',
    '                    </div>',
];

const before = lines.slice(0, 1252);
const after   = lines.slice(1263);
const result  = before.concat(newFooter).concat(after);

fs.writeFileSync(f, result.join('\n'), 'utf8');
console.log('Footer updated. Lines: ' + result.length);
