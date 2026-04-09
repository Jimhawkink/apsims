const fs = require('fs');
const path = 'd:/Res Pos/AlphaSchool/src/app/dashboard/reports/page.tsx';
let c = fs.readFileSync(path, 'utf8');
const lines = c.split('\n');

// Find start and end of renderReportCards function
let startLine = -1, endLine = -1, braceCount = 0, inFunc = false;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('renderReportCards') && lines[i].includes('const') && startLine === -1) {
        startLine = i;
        inFunc = true;
    }
    if (inFunc) {
        for (const ch of lines[i]) {
            if (ch === '{') braceCount++;
            if (ch === '}') braceCount--;
        }
        if (braceCount === 0 && startLine !== -1 && i > startLine) {
            endLine = i;
            break;
        }
    }
}

console.log(`renderReportCards: lines ${startLine+1} to ${endLine+1}`);

// New renderReportCards function
const newFunc = `    const renderReportCards = () => {
        const selectedExams = selExams.length > 0 ? exams.filter((e) => selExams.includes(e.id)) : (selExam ? [exams.find((e) => e.id === selExam)].filter(Boolean) : []);
        const reportStudents = selStudent ? filteredStudents.filter(s => s.id === selStudent) : filteredStudents;
        const genCode = (sid) => { let h = 0; const r = 'APSIMS'+sid+selExams.join('')+Date.now(); for (let i = 0; i < r.length; i++) { h = ((h << 5) - h) + r.charCodeAt(i); h |= 0; } return 'APS-'+Math.abs(h).toString(36).toUpperCase().slice(0,8); };
        const toggleExam = (eid) => setSelExams(prev => prev.includes(eid) ? prev.filter(x => x !== eid) : [...prev, eid]);

        const getProgress = (sid) => exams.slice(0,6).map((ex) => {
            const sm = marks.filter((m) => m.student_id === sid && m.exam_id === ex.id && m.score != null);
            return sm.length > 0 ? { name: ex.exam_name, term: ex.term, year: ex.year, mean: Math.round(sm.reduce((a, m) => a + m.score, 0) / sm.length) } : null;
        }).filter(Boolean).reverse();

        const getOverallRank = (sid) => {
            const st = students.find((s) => s.id === sid);
            const classAll = students.filter((s) => s.form_id === st?.form_id && s.status === 'Active');
            const calcMean = (list) => list.map(s => {
                let total = 0, cnt = 0;
                selectedExams.forEach((ex) => {
                    const sm = marks.filter((m) => m.student_id === s.id && m.exam_id === ex.id && m.score != null);
                    sm.forEach((m) => { total += m.score; cnt++; });
                });
                return { id: s.id, mean: cnt > 0 ? total / cnt : 0 };
            }).sort((a, b) => b.mean - a.mean);
            const classRanked = calcMean(classAll);
            const cp = classRanked.findIndex(r => r.id === sid) + 1;
            return { rank: cp || '-', of: classAll.length };
        };

        return (
            <div className="space-y-4">
                <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-700 text-white">
                    <h3 className="font-bold text-lg flex items-center gap-2"><FiBookOpen size={20} /> Comprehensive Report Card Generator</h3>
                    <p className="text-indigo-200 text-sm mt-1">Zeraki-style Kenyan report card | Select multiple exams for combined reports with individual + overall marks</p>
                </div>
                <div className="flex flex-wrap gap-3 items-end">
                    <div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Form *</label>
                        <select value={selForm} onChange={e => setSelForm(Number(e.target.value))} className="select-modern text-sm px-3 py-2.5 min-w-[130px]"><option value={0}>Select Form</option>{forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}</select></div>
                    <div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Stream</label>
                        <select value={selStream} onChange={e => setSelStream(Number(e.target.value))} className="select-modern text-sm px-3 py-2.5 min-w-[130px]"><option value={0}>All Streams</option>{streams.map(s => <option key={s.id} value={s.id}>{s.stream_name}</option>)}</select></div>
                    <div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Student</label>
                        <select value={selStudent} onChange={e => setSelStudent(Number(e.target.value))} className="select-modern text-sm px-3 py-2.5 min-w-[200px]"><option value={0}>All Students (Bulk)</option>{filteredStudents.map(s => <option key={s.id} value={s.id}>{s.admission_number} - {s.first_name} {s.last_name}</option>)}</select></div>
                    {selForm > 0 && selectedExams.length > 0 && <button onClick={printReport} className="btn-primary flex items-center gap-2 text-sm h-[42px]"><FiPrinter size={14} /> Print ({reportStudents.length})</button>}
                </div>
                {/* Multi-Exam Checkboxes */}
                <div className="bg-white rounded-xl border border-gray-200 p-3">
                    <p className="text-[10px] font-bold text-gray-500 uppercase mb-2">Select Exam(s) - tick multiple for combined report</p>
                    <div className="flex flex-wrap gap-2">{exams.map((ex) => (
                        <button key={ex.id} onClick={() => toggleExam(ex.id)} className={'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ' + (selExams.includes(ex.id) ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300')}>
                            {selExams.includes(ex.id) ? <FiCheckSquare size={13} /> : <FiSquare size={13} />} {ex.exam_name} ({ex.term} {ex.year})
                        </button>))}</div>
                    {selExams.length > 1 && <p className="text-xs text-indigo-600 mt-2 font-semibold"><FiTrendingUp className="inline mr-1" size={13} /> Combined report: each exam shown separately + Overall Mean + Overall Position</p>}
                </div>
                {selForm > 0 && selectedExams.length > 0 && <div className="p-3 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm font-medium">{reportStudents.length} report card{reportStudents.length !== 1 ? 's' : ''} ready | {selectedExams.length} exam(s): {selectedExams.map((e) => e.exam_name).join(' + ')}</div>}

                {selForm > 0 && selectedExams.length > 0 && (
                    <div id="report-print-area">{reportStudents.map(student => {
                            const activeSubs = subjects.filter((s) => s.is_active !== false);
                            const examData = selectedExams.map((ex) => {
                                const sMarks = getStudentMarks(student.id, ex.id);
                                let total = 0, count = 0, totalPts = 0;
                                const subScores = {};
                                activeSubs.forEach(sub => {
                                    const mark = sMarks.find((m) => m.subject_id === sub.id);
                                    const score = mark?.score ?? null;
                                    if (score !== null) { const g = getGrade(score); subScores[sub.id] = { score, grade: g.grade, pts: g.pts }; total += score; count++; totalPts += g.pts; }
                                });
                                const mean = count > 0 ? Math.round(total / count) : 0;
                                return { ex, subScores, total, count, totalPts, mean, grade: getGrade(mean) };
                            });
                            let combTotal = 0, combCount = 0;
                            const combSubScores = {};
                            activeSubs.forEach(sub => {
                                let subTotal = 0, subN = 0;
                                examData.forEach(ed => { if (ed.subScores[sub.id]) { subTotal += ed.subScores[sub.id].score; subN++; } });
                                if (subN > 0) { combSubScores[sub.id] = Math.round(subTotal / subN); combTotal += combSubScores[sub.id]; combCount++; }
                            });
                            const combMean = combCount > 0 ? Math.round(combTotal / combCount) : 0;
                            const combGrade = getGrade(combMean);
                            const form = forms.find((f) => f.id === student.form_id);
                            const stream = streams.find((s) => s.id === student.stream_id);
                            const progress = getProgress(student.id);
                            const rank = getOverallRank(student.id);
                            const vCode = genCode(student.id);
                            const examLabel = selectedExams.map((e) => e.exam_name).join(' + ');
                            const qrData = encodeURIComponent('APSIMS|'+student.first_name+' '+student.last_name+'|'+student.admission_number+'|'+examLabel+'|Mean:'+combMean+'|Grade:'+combGrade.grade+'|'+vCode);
                            const gradeDist = {};
                            KCSE_GRADES.forEach(g => { gradeDist[g.grade] = 0; });
                            activeSubs.forEach(sub => { if (combSubScores[sub.id]) gradeDist[getGrade(combSubScores[sub.id]).grade]++; });

                            return (
                                <div key={student.id} className="bg-white border-2 border-gray-400 mb-8 text-[11px]" style={{ pageBreakAfter: 'always', fontFamily: "'Segoe UI', Arial, sans-serif" }}>
                                    {/* HEADER */}
                                    <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b-2 border-indigo-800">
                                        <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-indigo-700"><img src="/school_logo.png" alt="Logo" className="w-full h-full object-cover" /></div>
                                        <div className="text-center flex-1 px-4">
                                            <h1 className="text-lg font-black text-indigo-900 uppercase tracking-wider">ALPHA SCHOOL</h1>
                                            <p className="text-[9px] text-gray-500">P.O. Box XXX, Town | Tel: 0720316175 | Email: info@alphaschool.co.ke</p>
                                            <p className="text-[9px] text-gray-400 italic">Motto: &quot;Excellence in Education&quot;</p>
                                            <div className="mt-1 bg-indigo-800 text-white font-bold px-4 py-1 rounded text-xs inline-block">{examLabel} REPORT - {selectedExams[0]?.term || 'Term'} {selectedExams[0]?.year || new Date().getFullYear()}</div>
                                        </div>
                                        <div className="text-right"><img src={'https://api.qrserver.com/v1/create-qr-code/?size=70x70&data='+qrData} alt="QR" className="w-14 h-14" /><p className="text-[6px] text-gray-400 mt-0.5 font-mono">{vCode}</p></div>
                                    </div>
                                    {/* STUDENT BIO */}
                                    <div className="grid grid-cols-6 gap-0 border-b border-gray-300 text-[10px]">
                                        <div className="col-span-2 px-3 py-1.5 border-r border-gray-200"><span className="text-gray-400">Student Name: </span><span className="font-bold text-gray-800">{student.first_name} {student.middle_name || ''} {student.last_name}</span></div>
                                        <div className="px-3 py-1.5 border-r border-gray-200"><span className="text-gray-400">Adm No: </span><span className="font-bold text-gray-800">{student.admission_number || '-'}</span></div>
                                        <div className="px-3 py-1.5 border-r border-gray-200"><span className="text-gray-400">KCPE: </span><span className="font-bold text-gray-800">{student.kcpe_marks || student.kcpe_index || '-'}</span></div>
                                        <div className="px-3 py-1.5 border-r border-gray-200"><span className="text-gray-400">Form: </span><span className="font-bold text-gray-800">{form?.form_name || '-'}</span></div>
                                        <div className="px-3 py-1.5"><span className="text-gray-400">Stream: </span><span className="font-bold text-gray-800">{stream?.stream_name || '-'}</span></div>
                                    </div>
                                    {/* MARKS TABLE */}
                                    <table className="w-full border-collapse"><thead><tr className="bg-indigo-900 text-white text-[9px]">
                                                <th className="border border-indigo-800 px-1.5 py-1 text-left w-6">#</th>
                                                <th className="border border-indigo-800 px-1.5 py-1 text-left">SUBJECT</th>
                                                <th className="border border-indigo-800 px-1.5 py-1 text-center w-10">CODE</th>
                                                {examData.map(ed => (<th key={ed.ex.id} className="border border-indigo-800 px-1 py-1 text-center w-16"><div className="text-[8px]">{ed.ex.exam_name}</div><div className="text-[7px] opacity-70">Score | Grd</div></th>))}
                                                {selectedExams.length > 1 && <th className="border border-indigo-800 px-1 py-1 text-center bg-indigo-700 w-12"><div className="text-[8px]">MEAN</div><div className="text-[7px]">Combined</div></th>}
                                                <th className="border border-indigo-800 px-1.5 py-1 text-center w-8">GRD</th>
                                                <th className="border border-indigo-800 px-1.5 py-1 text-center w-8">PTS</th>
                                                <th className="border border-indigo-800 px-1.5 py-1 text-left">REMARKS</th>
                                            </tr></thead><tbody>{activeSubs.map((sub, idx) => {
                                            const combScore = combSubScores[sub.id] || null;
                                            const g = combScore !== null ? getGrade(combScore) : null;
                                            return (
                                            <tr key={sub.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                                <td className="border border-gray-300 px-1.5 py-0.5 text-gray-400">{idx + 1}</td>
                                                <td className="border border-gray-300 px-1.5 py-0.5 font-semibold">{sub.subject_name}</td>
                                                <td className="border border-gray-300 px-1.5 py-0.5 text-center text-indigo-600 font-bold text-[9px]">{sub.subject_code || '-'}</td>
                                                {examData.map(ed => { const s = ed.subScores[sub.id]; return (
                                                    <td key={ed.ex.id} className="border border-gray-300 px-1 py-0.5 text-center text-[10px]">{s ? <span>{s.score} <span className={'font-bold text-[8px] '+gradeColor(s.grade)+' px-0.5 rounded'}>{s.grade}</span></span> : <span className="text-gray-300">-</span>}</td>
                                                );})}
                                                {selectedExams.length > 1 && <td className="border border-gray-300 px-1 py-0.5 text-center font-bold bg-indigo-50">{combScore ?? '-'}</td>}
                                                <td className="border border-gray-300 px-1.5 py-0.5 text-center"><span className={'font-bold text-[9px] px-1 rounded '+(g ? gradeColor(g.grade) : '')}>{g ? g.grade : '-'}</span></td>
                                                <td className="border border-gray-300 px-1.5 py-0.5 text-center font-semibold">{g ? g.pts : '-'}</td>
                                                <td className="border border-gray-300 px-1.5 py-0.5 text-[9px] text-gray-500">{combScore !== null ? (combScore >= 80 ? 'Excellent' : combScore >= 60 ? 'Good' : combScore >= 40 ? 'Average' : combScore >= 30 ? 'Below Avg' : 'Weak') : ''}</td>
                                            </tr>);
                                        })}</tbody><tfoot><tr className="bg-indigo-100 font-bold text-[10px]">
                                                <td colSpan={3} className="border border-gray-300 px-1.5 py-1">AGGREGATE</td>
                                                {examData.map(ed => (<td key={ed.ex.id} className="border border-gray-300 px-1 py-1 text-center text-[9px]">{ed.mean} ({ed.grade.grade})</td>))}
                                                {selectedExams.length > 1 && <td className="border border-gray-300 px-1 py-1 text-center bg-indigo-200 text-indigo-800">{combMean}</td>}
                                                <td className="border border-gray-300 px-1.5 py-1 text-center"><span className={'px-1 rounded '+gradeColor(combGrade.grade)}>{combGrade.grade}</span></td>
                                                <td className="border border-gray-300 px-1.5 py-1 text-center">{combGrade.pts}</td>
                                                <td className="border border-gray-300 px-1.5 py-1 text-indigo-700">Pos: {rank.rank}/{rank.of}</td>
                                            </tr></tfoot></table>
                                    {/* GRADE DISTRIBUTION + PROGRESS */}
                                    <div className="flex gap-0 border-y border-gray-300">
                                        <div className="flex-1 p-2 border-r border-gray-300"><p className="text-[8px] font-bold text-gray-600 uppercase mb-1">Grade Distribution</p><div className="flex gap-0.5">{KCSE_GRADES.map(g => (
                                                    <div key={g.grade} className="flex-1 text-center"><div className="text-[7px] font-bold text-gray-500">{g.grade}</div><div className={'text-[9px] font-bold rounded py-0.5 '+(gradeDist[g.grade] > 0 ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-50 text-gray-300')}>{gradeDist[g.grade]}</div></div>))}</div></div>
                                        <div className="w-64 p-2"><p className="text-[8px] font-bold text-gray-600 uppercase mb-1">Performance Trend</p>{progress.length > 0 ? (
                                                <div className="flex items-end gap-1 h-14">{progress.map((p, i) => {
                                                        const h = Math.max(8, (p.mean / 100) * 100);
                                                        const clr = p.mean >= 60 ? '#059669' : p.mean >= 40 ? '#d97706' : '#dc2626';
                                                        return (<div key={i} className="flex-1 flex flex-col items-center"><span className="text-[7px] font-bold" style={{ color: clr }}>{p.mean}</span><div className="w-full rounded-t" style={{ height: h+'%', background: clr, minHeight: 4 }} /><span className="text-[6px] text-gray-400 mt-0.5">{p.term}</span></div>);
                                                    })}</div>) : <p className="text-[8px] text-gray-400 h-14 flex items-center">No history</p>}
                                        </div>
                                    </div>
                                    {/* CONDUCT & ACTIVITIES */}
                                    <div className="grid grid-cols-2 gap-0 border-b border-gray-300"><div className="border-r border-gray-300 p-2"><p className="text-[8px] font-bold text-gray-600 uppercase mb-1">Conduct &amp; Behavior</p><div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[9px]">{['Discipline', 'Punctuality', 'Neatness', 'Respect', 'Effort', 'Attitude'].map(item => (
                                                    <div key={item} className="flex justify-between"><span className="text-gray-500">{item}:</span><span className="font-semibold text-gray-400">____</span></div>))}</div></div>
                                        <div className="p-2"><p className="text-[8px] font-bold text-gray-600 uppercase mb-1">Co-Curricular Activities &amp; Clubs</p><div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[9px]">{['Sports', 'Music/Drama', 'Clubs/Societies', 'Leadership'].map(item => (
                                                    <div key={item} className="flex justify-between"><span className="text-gray-500">{item}:</span><span className="font-semibold text-gray-400">____</span></div>))}</div>
                                            <div className="mt-1 flex gap-4 text-[9px]"><div><span className="text-gray-500">Days Present:</span> <span className="font-bold">___</span></div><div><span className="text-gray-500">Days Absent:</span> <span className="font-bold">___</span></div><div><span className="text-gray-500">Total Days:</span> <span className="font-bold">___</span></div></div></div></div>
                                    {/* REMARKS & SIGNATURES */}
                                    <div className="border-b border-gray-300 p-2"><div className="grid grid-cols-2 gap-4"><div><p className="text-[8px] font-bold text-gray-600 uppercase">Class Teacher&apos;s Remarks</p><div className="border-b border-dotted border-gray-300 h-3 mt-1"></div><div className="border-b border-dotted border-gray-300 h-3"></div><div className="flex justify-between items-end mt-2 text-[9px]"><div><span className="text-gray-500">Name:</span> <span className="font-bold">_____________________</span></div><div><span className="text-gray-500">Sign:</span> ____________ <span className="text-gray-500 ml-2">Date:</span> ___/___/____</div></div></div>
                                            <div><p className="text-[8px] font-bold text-gray-600 uppercase">Principal&apos;s Remarks</p><div className="border-b border-dotted border-gray-300 h-3 mt-1"></div><div className="border-b border-dotted border-gray-300 h-3"></div><div className="flex justify-between items-end mt-2 text-[9px]"><div><span className="text-gray-500">Name:</span> <span className="font-bold">_____________________</span></div><div><span className="text-gray-500">Sign &amp; Stamp:</span> ____________</div></div></div></div></div>
                                    {/* PARENT + FEES */}
                                    <div className="grid grid-cols-2 gap-0 border-b border-gray-300"><div className="border-r border-gray-300 p-2"><p className="text-[8px] font-bold text-gray-600 uppercase">Parent / Guardian&apos;s Comments</p><div className="border-b border-dotted border-gray-300 h-3 mt-1"></div><div className="flex justify-between items-end mt-2 text-[9px]"><div><span className="text-gray-500">Name:</span> ___________________</div><div><span className="text-gray-500">Sign:</span> ____________ <span className="text-gray-500 ml-2">Date:</span> ___/___/____</div></div></div>
                                        <div className="p-2"><p className="text-[8px] font-bold text-gray-600 uppercase mb-1">Fee Statement</p><div className="grid grid-cols-4 gap-1 text-[9px]"><div className="bg-red-50 rounded p-1 text-center"><p className="text-[7px] text-gray-500">Arrears</p><p className="font-bold text-red-600">KSh ______</p></div><div className="bg-blue-50 rounded p-1 text-center"><p className="text-[7px] text-gray-500">Next Term</p><p className="font-bold text-blue-600">KSh ______</p></div><div className="bg-amber-50 rounded p-1 text-center"><p className="text-[7px] text-gray-500">Total Due</p><p className="font-bold text-amber-700">KSh ______</p></div><div className="bg-green-50 rounded p-1 text-center"><p className="text-[7px] text-gray-500">Opens</p><p className="font-bold text-green-700">__/__/____</p></div></div></div></div>
                                    {/* FOOTER */}
                                    <div className="px-5 py-1.5 bg-gray-50 text-center text-[7px] text-gray-400 flex justify-between items-center"><span>APSIMS - Alpha Plus School Information Management System</span><span>Verified: {vCode} | {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span><span>This is a computer-generated document</span></div>
                                </div>
                            );
                        })}
                    </div>)}

                {(!selForm || selectedExams.length === 0) && (
                    <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-gray-400"><FiBookOpen size={48} className="mx-auto mb-3 text-indigo-300" /><p className="font-medium text-gray-600">Select a Form and tick exam(s) to generate comprehensive report cards</p><p className="text-sm mt-1">Zeraki-style layout with marks, grade distribution, progress chart, conduct, fees &amp; QR verification</p><p className="text-xs mt-2 text-indigo-500 font-semibold">TIP: Select multiple exams (e.g. CAT 1 + CAT 2) for combined report with individual marks and overall mean</p></div>)}
            </div>);
    };`;

// Replace lines
const before = lines.slice(0, startLine);
const after = lines.slice(endLine + 1);
const result = [...before, newFunc, ...after].join('\n');
fs.writeFileSync(path, result, 'utf8');
console.log('Replaced renderReportCards! New file length:', result.length);
