const fs = require('fs');
const f = 'src/app/dashboard/learning/page.tsx';
const lines = fs.readFileSync(f, 'utf8').split('\n');

// Replace lines 1692-1737 (indices 1691-1736) with a clean rewrite
const newSection = [
`                                        {topics.map((topic, ti) => {`,
`                                            const mergedVids = getVideosForTopic(selectedSubject.id, activeGrade, topic.name, topic.videos);`,
`                                            const hasVerified = mergedVids.some(v => v.isVerified);`,
`                                            return (`,
`                                            <div key={ti} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">`,
`                                                <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between" style={{ background: \`\${selectedSubject.color}08\` }}>`,
`                                                    <div className="flex items-center gap-2">`,
`                                                        <span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black text-white" style={{ background: selectedSubject.gradient }}>{ti + 1}</span>`,
`                                                        <h4 className="text-sm font-black text-gray-800">{topic.name}</h4>`,
`                                                        {hasVerified && <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-green-100 text-green-700">✓ Verified</span>}`,
`                                                    </div>`,
`                                                    <span className="text-[10px] font-bold text-gray-400">{mergedVids.length} video{mergedVids.length !== 1 ? 's' : ''}</span>`,
`                                                </div>`,
`                                                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">`,
`                                                    {mergedVids.map(vid => {`,
`                                                        const isWatched = progress[selectedSubject.id]?.watched?.includes(vid.id);`,
`                                                        return (`,
`                                                            <button key={vid.id} onClick={() => setSelectedVideo(vid)}`,
`                                                                className="group flex items-start gap-3 p-3 rounded-xl border text-left transition-all hover:shadow-md"`,
`                                                                style={{ border: \`1.5px solid \${isWatched ? selectedSubject.color+'40' : '#e5e7eb'}\`, background: isWatched ? \`\${selectedSubject.color}08\` : '#fafafa' }}>`,
`                                                                {/* Thumbnail */}`,
`                                                                <div className="relative flex-shrink-0 w-24 h-14 rounded-lg overflow-hidden">`,
`                                                                    {vid.isVerified ? (`,
`                                                                        <img src={ytThumb(vid.youtubeId)} alt={vid.title}`,
`                                                                            className="w-24 h-14 object-cover block"`,
`                                                                            onError={(e: any) => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }} />`,
`                                                                    ) : null}`,
`                                                                    <div className="w-24 h-14 items-center justify-center text-2xl rounded-lg"`,
`                                                                        style={{ background: \`\${selectedSubject.color}22\`, display: vid.isVerified ? 'none' : 'flex' }}>`,
`                                                                        {selectedSubject.icon}`,
`                                                                    </div>`,
`                                                                    {/* Hover play overlay */}`,
`                                                                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-all rounded-lg">`,
`                                                                        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: selectedSubject.gradient }}>`,
`                                                                            <FiPlay size={12} className="text-white ml-0.5" />`,
`                                                                        </div>`,
`                                                                    </div>`,
`                                                                    <div className="absolute bottom-0.5 right-0.5 bg-black/80 text-white text-[9px] font-bold px-1 rounded">{vid.duration}</div>`,
`                                                                </div>`,
`                                                                {/* Info */}`,
`                                                                <div className="flex-1 min-w-0">`,
`                                                                    <p className="text-xs font-bold text-gray-800 leading-tight line-clamp-2 mb-1">{vid.title}</p>`,
`                                                                    <p className="text-[10px] text-gray-400">{vid.channel}</p>`,
`                                                                    {vid.isVerified && <span className="inline-flex items-center gap-1 text-[9px] font-bold mt-0.5 px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">✓ Verified</span>}`,
`                                                                    {isWatched && <span className="inline-flex items-center gap-1 text-[9px] font-bold mt-0.5 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 ml-1"><FiCheck size={8} /> Watched</span>}`,
`                                                                </div>`,
`                                                            </button>`,
`                                                        );`,
`                                                    })}`,
`                                                </div>`,
`                                            </div>`,
`                                            );`,
`                                        })}`,
];

const before = lines.slice(0, 1691);
const after   = lines.slice(1737);
const result  = before.concat(newSection).concat(after);

fs.writeFileSync(f, result.join('\n'), 'utf8');
console.log('Done:', result.length, 'lines total');
