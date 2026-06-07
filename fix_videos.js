const fs = require('fs');
const file = 'src/app/dashboard/learning/page.tsx';
let c = fs.readFileSync(file, 'utf8');

let changed = 0;

// Fix 1: Add isVerified to Video interface
const old1 = 'interface Video { id: string; title: string; duration: string; youtubeId: string; channel: string; }';
const new1 = 'interface Video { id: string; title: string; duration: string; youtubeId: string; channel: string; isVerified?: boolean; }';
if (c.includes(old1)) { c = c.replace(old1, new1); changed++; console.log('Fix 1: Video interface updated'); }
else { console.log('Fix 1: already done or not found'); }

// Fix 2: Mark DB videos as isVerified=true in getVideosForTopic
const old2 = "channel: v.channel || 'Custom' }));";
const new2 = "channel: v.channel || 'Custom', isVerified: true }));";
if (c.includes(old2)) { c = c.replace(old2, new2); changed++; console.log('Fix 2: DB videos marked isVerified'); }
else { console.log('Fix 2: already done'); }

// Fix 3: Return static videos as fallback  
const old3 = 'return dbMatches; // Return only DB videos if available';
const new3 = 'return dbMatches.length > 0 ? dbMatches : staticVideos;';
if (c.includes(old3)) { c = c.replace(old3, new3); changed++; console.log('Fix 3: fallback to static videos added'); }
else { console.log('Fix 3: already done'); }

// Fix 4: Add staticVideos param to getVideosForTopic
const old4 = 'const getVideosForTopic = (subjectId: string, formLevel: string, topicName: string): Video[] => {';
const new4 = 'const getVideosForTopic = (subjectId: string, formLevel: string, topicName: string, staticVideos: Video[] = []): Video[] => {';
if (c.includes(old4)) { c = c.replace(old4, new4); changed++; console.log('Fix 4: staticVideos param added'); }
else { console.log('Fix 4: already done'); }

// Fix 5: Replace MoE search query — change old searchQ to use MoE keywords
const old5 = "encodeURIComponent(video.title + ' ' + subject.name + ' Kenya');";
const new5 = "encodeURIComponent(video.title + ' ' + subject.name + ' Kenya Ministry of Education KICD');";
if (c.includes(old5)) { c = c.replace(old5, new5); changed++; console.log('Fix 5: MoE search query added'); }
else { console.log('Fix 5: already done'); }

// Fix 6: Replace ytUrl fallback search query to use MoE keywords  
const old6 = "encodeURIComponent(video.title + ' ' + subject.name + ' Kenya KICD')";
const new6 = "encodeURIComponent(video.title + ' ' + subject.name + ' Kenya Ministry of Education KICD')";
if (c.includes(old6)) { c = c.replace(old6, new6); changed++; console.log('Fix 6: ytUrl MoE query updated'); }
else { console.log('Fix 6: already done'); }

// Fix 7: Replace hasRealId with isVerified everywhere
const count7 = (c.match(/hasRealId/g) || []).length;
c = c.replace(/hasRealId/g, 'isVerified');
if (count7 > 0) { changed++; console.log('Fix 7: replaced ' + count7 + ' occurrences of hasRealId -> isVerified'); }
else { console.log('Fix 7: no hasRealId found (already done)'); }

fs.writeFileSync(file, c, 'utf8');
console.log('\nDone! ' + changed + ' fixes applied.');
