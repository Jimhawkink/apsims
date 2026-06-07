const fs = require('fs');
const f = 'src/app/dashboard/learning/page.tsx';
const lines = fs.readFileSync(f, 'utf8').split('\n');

const newVars = [
    '    const [playing,    setPlaying]    = useState(false);',
    '    const [loaded,     setLoaded]     = useState(false);',
    '    const [thumbError, setThumbError] = useState(false);',
    '    const [useFallback, setUseFallback] = useState(false);',
    '',
    '    // isVerified = ONLY admin DB videos have this flag — static topic videos always use search',
    '    const isVerified   = !!(video.isVerified && video.youtubeId && video.youtubeId.length === 11);',
    '    const useSearch    = !isVerified || useFallback;',
    '    const thumbUrl     = (!useSearch) ? `https://img.youtube.com/vi/${video.youtubeId}/hqdefault.jpg` : null;',
    '    const directEmbed  = (!useSearch)',
    '        ? `https://www.youtube-nocookie.com/embed/${video.youtubeId}?autoplay=1&rel=0&modestbranding=1`',
    '        : null;',
    '    const moeQuery     = encodeURIComponent(video.title + \' \' + subject.name + \' Kenya Ministry of Education KICD\');',
    '    const searchEmbed  = `https://www.youtube-nocookie.com/embed?listType=search&list=${moeQuery}&autoplay=1&rel=0&modestbranding=1`;',
    '    const embedSrc     = directEmbed || searchEmbed;',
    '    const ytSearchUrl  = `https://www.youtube.com/results?search_query=${moeQuery}`;',
    '    const ytUrl        = (!useSearch)',
    '        ? `https://www.youtube.com/watch?v=${video.youtubeId}`',
    '        : ytSearchUrl;',
    '',
    '    // Auto-fallback: if verified video not loaded after 5s, switch to MoE search embed',
    '    useEffect(() => {',
    '        if (!playing || useSearch) return;',
    '        const t = setTimeout(() => { if (!loaded) { setUseFallback(true); setLoaded(false); } }, 5000);',
    '        return () => clearTimeout(t);',
    '    }, [playing, useSearch, loaded]);',
    '',
];

// Remove old lines 1126-1141 (indices 1125 to 1140 inclusive), insert new
const before = lines.slice(0, 1125);
const after   = lines.slice(1141);
const result  = before.concat(newVars).concat(after);

fs.writeFileSync(f, result.join('\n'), 'utf8');
console.log('Done: ' + result.length + ' lines written');
