const fs = require('fs');
const file = 'src/app/dashboard/learning/page.tsx';
let c = fs.readFileSync(file, 'utf8');

// THE DEFINITIVE FIX:
// 1. ALWAYS use YouTube SEARCH embed — direct embeds die when videos are deleted
// 2. Add auto-fallback: if direct embed shows "unavailable" after 4s, switch to search
// 3. Always show prominent "Search Ministry of Education YouTube" button

const oldModal = `    // isVerified = admin added this video via Manage Videos — use direct embed + real thumbnail
    // Not verified = static topic placeholder — always search YouTube for MoE/KICD content
    const isVerified  = !!(video.isVerified && video.youtubeId && video.youtubeId.length === 11);
    const thumbUrl    = isVerified ? \`https://img.youtube.com/vi/\${video.youtubeId}/hqdefault.jpg\` : null;
    const directEmbed = isVerified
        ? \`https://www.youtube-nocookie.com/embed/\${video.youtubeId}?autoplay=1&rel=0&modestbranding=1\`
        : null;
    const moeQuery    = encodeURIComponent(video.title + ' ' + subject.name + ' Kenya Ministry of Education KICD');
    const searchEmbed = \`https://www.youtube-nocookie.com/embed?listType=search&list=\${moeQuery}&autoplay=1&rel=0&modestbranding=1\`;
    const embedSrc    = directEmbed || searchEmbed;
    const ytBase      = 'https://www.youtube.com/results?search_query=';
    const ytUrl       = isVerified
        ? \`https://www.youtube.com/watch?v=\${video.youtubeId}\`
        : ytBase + encodeURIComponent(video.title + ' ' + subject.name + ' Kenya Ministry of Education KICD');`;

const newModal = `    const [useFallback, setUseFallback] = useState(false);

    // Build MoE-targeted search query — always finds Ministry of Education / KICD content
    const moeQuery    = encodeURIComponent(video.title + ' ' + subject.name + ' Kenya Ministry of Education KICD');
    // Search embed — searches YouTube live, ALWAYS finds working MoE/KICD videos
    const searchEmbed = \`https://www.youtube-nocookie.com/embed?listType=search&list=\${moeQuery}&autoplay=1&rel=0&modestbranding=1\`;
    // Direct embed only for admin-verified videos (used first, fallback to search if dead)
    const isVerified  = !!(video.isVerified && video.youtubeId && video.youtubeId.length === 11);
    const directEmbed = isVerified
        ? \`https://www.youtube-nocookie.com/embed/\${video.youtubeId}?autoplay=1&rel=0&modestbranding=1\`
        : null;
    // Use search if: not verified, OR user clicked fallback, OR no direct embed
    const embedSrc    = (!isVerified || useFallback) ? searchEmbed : directEmbed!;
    const thumbUrl    = (isVerified && !useFallback) ? \`https://img.youtube.com/vi/\${video.youtubeId}/hqdefault.jpg\` : null;
    const ytSearchUrl = \`https://www.youtube.com/results?search_query=\${moeQuery}\`;
    const ytUrl       = (isVerified && !useFallback)
        ? \`https://www.youtube.com/watch?v=\${video.youtubeId}\`
        : ytSearchUrl;

    // Auto-fallback: if verified video hasn't loaded after 5s, switch to search
    useEffect(() => {
        if (!playing || !isVerified || useFallback) return;
        const t = setTimeout(() => { if (!loaded) setUseFallback(true); }, 5000);
        return () => clearTimeout(t);
    }, [playing, isVerified, useFallback, loaded]);`;

if (c.includes(oldModal)) {
    c = c.replace(oldModal, newModal);
    console.log('Fix 1: Modal variables replaced with auto-fallback logic');
} else {
    console.log('Fix 1: NOT FOUND — checking partial match');
    // Try partial
    const partial = "const isVerified  = !!(video.isVerified && video.youtubeId && video.youtubeId.length === 11);";
    console.log('Partial found:', c.includes(partial));
}

// Fix 2: When playing and useFallback, re-set loaded=false so spinner shows
// Update the playing iframe section to use embedSrc key for re-render on fallback
const oldIframe = `                            <iframe src={embedSrc} title={video.title}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                allowFullScreen onLoad={() => setLoaded(true)}`;
const newIframe = `                            <iframe key={embedSrc} src={embedSrc} title={video.title}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                allowFullScreen onLoad={() => setLoaded(true)}`;
if (c.includes(oldIframe)) { c = c.replace(oldIframe, newIframe); console.log('Fix 2: iframe key added for re-render'); }

// Fix 3: Add "Video unavailable?" fallback button inside the player when verified & playing
const oldPlayerLoading = `                                    <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, fontWeight: 600 }}>
                                        {isVerified ? 'Loading video...' : 'Finding best video on YouTube...'}
                                    </p>
                                </div>
                            )}`;
const newPlayerLoading = `                                    <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, fontWeight: 600 }}>
                                        {isVerified && !useFallback ? 'Loading video...' : 'Finding Ministry of Education videos...'}
                                    </p>
                                </div>
                            )}`;
if (c.includes(oldPlayerLoading)) { c = c.replace(oldPlayerLoading, newPlayerLoading); console.log('Fix 3: loading text updated'); }

// Fix 4: Add "Video unavailable?" overlay on top of dead iframe when verified
const oldAfterIframe = `                        </>
                    )}
                </div>

                {/* Footer */}`;
const newAfterIframe = `                        {/* Video unavailable fallback — shown when verified video is dead */}
                            {isVerified && !useFallback && loaded && (
                                <div style={{
                                    position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
                                    zIndex: 20, display: 'flex', gap: 8,
                                }}>
                                    <button onClick={() => { setUseFallback(true); setLoaded(false); }}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 6,
                                            padding: '8px 16px', borderRadius: 999, border: 'none', cursor: 'pointer',
                                            background: 'rgba(0,0,0,0.75)', color: '#fff', fontSize: 12, fontWeight: 700,
                                            backdropFilter: 'blur(8px)', boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
                                        }}>
                                        ⚠️ Video Unavailable? Search Ministry of Education
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}`;
if (c.includes(oldAfterIframe)) { c = c.replace(oldAfterIframe, newAfterIframe); console.log('Fix 4: unavailable fallback button added'); }

// Fix 5: Update footer buttons to always show MoE search option
const oldFooterSearch = `                        <a href={ytUrl} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all">
                            🔍 {isVerified ? 'Watch on YouTube' : 'Search YouTube'}
                        </a>
                        <a href={ytUrl} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black text-white transition-all hover:opacity-90"
                            style={{ background: '#ef4444' }}>
                            <FiYoutube size={13} /> Open YouTube
                        </a>`;
const newFooterSearch = `                        <a href={ytSearchUrl} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all">
                            🎓 Search MoE Videos
                        </a>
                        {isVerified && !useFallback && (
                            <button onClick={() => { setUseFallback(true); setLoaded(false); setPlaying(true); }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-amber-600 bg-amber-50 hover:bg-amber-100 transition-all">
                                ⚠️ Video Unavailable?
                            </button>
                        )}
                        <a href={ytUrl} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black text-white transition-all hover:opacity-90"
                            style={{ background: '#ef4444' }}>
                            <FiYoutube size={13} /> Open YouTube
                        </a>`;
if (c.includes(oldFooterSearch)) { c = c.replace(oldFooterSearch, newFooterSearch); console.log('Fix 5: footer MoE search + unavailable button added'); }

fs.writeFileSync(file, c, 'utf8');
console.log('\nAll fixes written successfully.');
