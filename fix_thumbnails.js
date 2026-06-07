const fs = require('fs');
const f = 'src/app/dashboard/learning/page.tsx';
const lines = fs.readFileSync(f, 'utf8').split('\n');

// FIX 1: Replace topic.videos.length with merged count (line 1699, index 1698)
// Replace: {topic.videos.length} video...
// With:    count from merged DB+static list
lines[1698] = `                                                     {(() => { const vids = getVideosForTopic(selectedSubject.id, activeGrade, topic.name, topic.videos); return <span className="text-[10px] font-bold text-gray-400">{vids.length} video{vids.length !== 1 ? 's' : ''}{vids.some(v=>v.isVerified) ? ' ✓' : ''}</span>; })()}`;

// FIX 2: Replace topic.videos.map( with merged getVideosForTopic (line 1702, index 1701)
lines[1701] = `                                                     {getVideosForTopic(selectedSubject.id, activeGrade, topic.name, topic.videos).map(vid => {`;

// FIX 3: Replace the thumbnail img with smart thumbnail (lines 1710-1712, indices 1709-1711)
// Show real thumbnail for verified videos, subject-colored gradient for unverified
lines[1709] = `                                                                 <div className="relative flex-shrink-0 w-24 rounded-lg overflow-hidden bg-gray-100" style={{minHeight:56}}>`;
lines[1710] = `                                                                     {vid.isVerified ? (`;
lines[1711] = `                                                                         <img src={ytThumb(vid.youtubeId)} alt={vid.title}`;

// Insert new lines after line 1711 (index 1711) - need to splice
const insertAfter1711 = [
    `                                                                             className="w-24 h-14 object-cover block"`,
    `                                                                             onError={(e: any) => { e.target.src=''; e.target.style.display='none'; }} />`,
    `                                                                     ) : (`,
    `                                                                         <div className="w-24 h-14 flex items-center justify-center text-2xl"`,
    `                                                                             style={{background: \`\${selectedSubject.color}22\`}}>`,
    `                                                                             {selectedSubject.icon}`,
    `                                                                         </div>`,
    `                                                                     )}`,
];

// Remove the old className and onError lines (they were on 1711-1712 = indices 1711-1712 in original)
// After our replacements, index 1711 is now the img tag opener
// We need to remove the old line 1712 (index 1712) className line and 1713 (index 1712) onError line
// Let's splice: remove lines at index 1712 and insert our new lines

const before  = lines.slice(0, 1712);  // up to and including the <img src= line
const removed = lines.slice(1714);      // skip old className="w-24..." and onError lines
const result  = before.concat(insertAfter1711).concat(removed);

fs.writeFileSync(f, result.join('\n'), 'utf8');
console.log('Done:', result.length, 'lines');
console.log('Checks:');
console.log('  line 1699:', result[1698].trim().substring(0, 60));
console.log('  line 1702:', result[1701].trim().substring(0, 60));
console.log('  line 1710:', result[1709].trim().substring(0, 60));
