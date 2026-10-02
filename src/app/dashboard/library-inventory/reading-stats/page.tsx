'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import toast, { Toaster } from 'react-hot-toast';
import { FiDownload, FiRefreshCw, FiSearch, FiBook, FiBarChart2, FiTrendingUp, FiStar, FiUsers } from 'react-icons/fi';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const SUBJECT_COLORS = ['#0d9488','#0891b2','#6366f1','#f59e0b','#dc2626','#16a34a','#7c3aed','#db2777','#ea580c','#065f46'];

export default function LibraryReadingStatsPage() {
  const [books, setBooks] = useState<any[]>([]);
  const [checkouts, setCheckouts] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [forms, setForms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'trending' | 'bystudent' | 'byclass' | 'categories'>('dashboard');
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());
  const [search, setSearch] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [bR, cR, sR, fR] = await Promise.all([
      supabase.from('school_library_books').select('*').order('title'),
      supabase.from('school_library_checkouts').select('*, school_library_books(title,author,category,isbn), school_students(first_name,last_name,admission_no,form_id)').order('checkout_date', { ascending: false }),
      supabase.from('school_students').select('id,first_name,last_name,admission_no,form_id').order('first_name'),
      supabase.from('school_forms').select('id,form_name,form_level').order('form_level'),
    ]);
    setBooks(bR.data || []);
    setCheckouts(cR.data || []);
    setStudents(sR.data || []);
    setForms(fR.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const yearCheckouts = useMemo(() => checkouts.filter(c => (c.checkout_date || '').startsWith(filterYear)), [checkouts, filterYear]);

  // Most borrowed books
  const bookBorrowCount = useMemo(() => {
    const map: Record<number, { title: string; author: string; category: string; count: number; returnRate: number; returned: number }> = {};
    yearCheckouts.forEach(c => {
      const id = c.book_id;
      if (!map[id]) map[id] = { title: c.school_library_books?.title || '?', author: c.school_library_books?.author || '', category: c.school_library_books?.category || 'General', count: 0, returned: 0, returnRate: 0 };
      map[id].count++;
      if (c.return_date) map[id].returned++;
    });
    return Object.entries(map).map(([id, v]) => ({ id, ...v, returnRate: v.count > 0 ? Math.round(v.returned / v.count * 100) : 0 })).sort((a, b) => b.count - a.count);
  }, [yearCheckouts]);

  // Most active readers
  const studentReads = useMemo(() => {
    const map: Record<number, { name: string; adm: string; form_id: number; count: number; returned: number; overdue: number }> = {};
    yearCheckouts.forEach(c => {
      const id = c.student_id;
      const st = c.school_students;
      if (!id || !st) return;
      if (!map[id]) map[id] = { name: `${st.first_name} ${st.last_name}`, adm: st.admission_no || '', form_id: st.form_id, count: 0, returned: 0, overdue: 0 };
      map[id].count++;
      if (c.return_date) map[id].returned++;
      if (!c.return_date && c.due_date && c.due_date < new Date().toISOString().split('T')[0]) map[id].overdue++;
    });
    return Object.entries(map).map(([id, v]) => ({ id, ...v })).sort((a, b) => b.count - a.count);
  }, [yearCheckouts]);

  // By category
  const categoryStats = useMemo(() => {
    const map: Record<string, number> = {};
    yearCheckouts.forEach(c => { const cat = c.school_library_books?.category || 'General'; map[cat] = (map[cat] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([cat, count], i) => ({ cat, count, color: SUBJECT_COLORS[i % SUBJECT_COLORS.length] }));
  }, [yearCheckouts]);

  // By class
  const classStats = useMemo(() => forms.map(f => {
    const classStudentIds = students.filter(s => s.form_id === f.id).map(s => s.id);
    const classCheckouts = yearCheckouts.filter(c => classStudentIds.includes(c.student_id));
    const readers = new Set(classCheckouts.map(c => c.student_id)).size;
    return { form: f.form_name, count: classCheckouts.length, readers, total: classStudentIds.length, participation: classStudentIds.length > 0 ? Math.round(readers / classStudentIds.length * 100) : 0 };
  }).filter(c => c.count > 0).sort((a, b) => b.count - a.count), [forms, students, yearCheckouts]);

  // Monthly trend
  const monthlyData = useMemo(() => MONTHS.map((m, i) => {
    const count = yearCheckouts.filter(c => new Date(c.checkout_date).getMonth() === i).length;
    return { m, count };
  }), [yearCheckouts]);
  const maxMonthly = Math.max(...monthlyData.map(m => m.count), 1);

  // KPIs
  const totalBorrows = yearCheckouts.length;
  const uniqueReaders = new Set(yearCheckouts.map(c => c.student_id)).size;
  const returnRate = totalBorrows > 0 ? Math.round(yearCheckouts.filter(c => c.return_date).length / totalBorrows * 100) : 0;
  const overdue = yearCheckouts.filter(c => !c.return_date && c.due_date && c.due_date < new Date().toISOString().split('T')[0]).length;
  const avgPerReader = uniqueReaders > 0 ? (totalBorrows / uniqueReaders).toFixed(1) : '0';

  const exportReport = () => {
    const rows = [['Book','Author','Category','Times Borrowed','Return Rate']];
    bookBorrowCount.forEach(b => rows.push([b.title, b.author, b.category, String(b.count), `${b.returnRate}%`]));
    const blob = new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `library_reading_stats_${filterYear}.csv`; a.click();
    toast.success('Statistics exported!');
  };

  const TABS = [
    { id: 'dashboard', label: '📊 Dashboard' },
    { id: 'trending', label: '🔥 Trending Books' },
    { id: 'bystudent', label: '🏆 Top Readers' },
    { id: 'byclass', label: '🎓 By Class' },
    { id: 'categories', label: '📚 Categories' },
  ] as const;

  const filteredBooks = bookBorrowCount.filter(b => !search || b.title.toLowerCase().includes(search.toLowerCase()) || b.author.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-5 pb-10">
      <Toaster position="top-right" />

      {/* HERO */}
      <div className="rounded-2xl overflow-hidden shadow-xl" style={{ background: 'linear-gradient(135deg,#1e1b4b,#3730a3,#4f46e5)' }}>
        <div className="px-6 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-3xl shadow-lg">📊</div>
            <div>
              <h1 className="text-2xl font-extrabold text-white tracking-tight">Library Reading Statistics</h1>
              <p className="text-indigo-200 text-sm mt-0.5">{books.length} books in collection · {totalBorrows} borrows · {uniqueReaders} readers · {overdue} overdue</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            {['2024','2025','2026'].map(y => <button key={y} onClick={() => setFilterYear(y)} className={`px-4 py-2 rounded-xl text-sm font-black transition border ${filterYear===y?'bg-white text-indigo-800 border-white':'bg-white/20 border-white/30 text-white hover:bg-white/30'}`}>{y}</button>)}
            <button onClick={exportReport} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-400 text-indigo-900 font-black text-sm hover:bg-amber-300"><FiDownload size={14}/> Export</button>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 px-6 pb-6">
          {[
            { icon: '📖', label: 'Total Borrows', val: totalBorrows.toLocaleString(), sub: filterYear },
            { icon: '👥', label: 'Unique Readers', val: uniqueReaders.toLocaleString(), sub: `${Math.round(uniqueReaders / Math.max(students.length,1)*100)}% of students` },
            { icon: '📚', label: 'Books in Library', val: books.length.toLocaleString(), sub: 'Total catalog' },
            { icon: '✅', label: 'Return Rate', val: `${returnRate}%`, sub: `${yearCheckouts.filter(c=>c.return_date).length} returned` },
            { icon: '⚠️', label: 'Overdue Now', val: overdue.toString(), sub: 'Not returned' },
          ].map(s => (
            <div key={s.label} className="bg-white/10 rounded-xl p-3 text-center border border-white/10">
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className="text-base font-black text-white leading-tight">{s.val}</div>
              <div className="text-[9px] text-indigo-200 font-bold uppercase tracking-wide mt-0.5">{s.label}</div>
              <div className="text-[8px] text-indigo-300 mt-0.5">{s.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* TABS */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map(t => <button key={t.id} onClick={() => setActiveTab(t.id)} className={`px-5 py-2.5 text-sm font-bold rounded-xl border transition ${activeTab===t.id?'bg-indigo-700 text-white border-indigo-700 shadow-md':'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>{t.label}</button>)}
      </div>

      {loading ? <div className="flex items-center justify-center py-24"><div className="w-12 h-12 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"/></div>
      : activeTab === 'dashboard' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Monthly trend chart */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-black text-gray-800 text-base mb-5">📅 Monthly Reading Trend — {filterYear}</h3>
            <div className="flex items-end gap-1.5 h-40 mb-2">
              {monthlyData.map((m, i) => (
                <div key={m.m} className="flex-1 flex flex-col items-center gap-0.5 group relative">
                  <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[9px] font-black px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-10">{m.count} borrows</div>
                  <div className="w-full rounded-t-lg transition-all duration-500 hover:opacity-80 cursor-pointer" style={{ height: `${Math.max(m.count/maxMonthly*100, 2)}%`, background: m.count > 0 ? 'linear-gradient(to top,#1e1b4b,#4f46e5)' : '#e5e7eb', minHeight: 4 }} />
                </div>
              ))}
            </div>
            <div className="flex gap-1.5">{MONTHS.map(m => <span key={m} className="flex-1 text-center text-[9px] font-bold text-gray-400">{m}</span>)}</div>
            <div className="mt-4 grid grid-cols-3 gap-2 pt-4 border-t">
              {[['Term 1',0,3],['Term 2',4,7],['Term 3',8,11]].map(([term, s, e]) => {
                const val = monthlyData.slice(s as number, (e as number)+1).reduce((a,m)=>a+m.count,0);
                return <div key={term as string} className="text-center bg-gray-50 rounded-xl p-2"><p className="text-[10px] text-gray-500 font-bold">{term as string}</p><p className="font-black text-indigo-700">{val}</p></div>;
              })}
            </div>
          </div>

          {/* Stats panel */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-black text-gray-800 mb-4">📊 Reading Insights</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { l: 'Avg Books/Reader', v: avgPerReader, c: '#4f46e5' },
                  { l: 'Most Active Month', v: MONTHS[monthlyData.reduce((m,x,i)=>x.count>monthlyData[m].count?i:m,0)], c: '#0d9488' },
                  { l: 'Top Category', v: categoryStats[0]?.cat || '—', c: '#d97706' },
                  { l: 'Top Book', v: bookBorrowCount[0]?.title?.slice(0,20) || '—', c: '#dc2626' },
                  { l: 'Student Participation', v: `${Math.round(uniqueReaders/Math.max(students.length,1)*100)}%`, c: '#16a34a' },
                  { l: 'Overdue Books', v: overdue.toString(), c: overdue > 0 ? '#dc2626' : '#16a34a' },
                ].map(s => (
                  <div key={s.l} className="bg-gray-50 rounded-xl p-3">
                    <p className="text-[9px] text-gray-400 font-bold uppercase">{s.l}</p>
                    <p className="font-black mt-1 text-sm" style={{color:s.c}}>{s.v}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-black text-gray-800 mb-3">🏆 Top 5 Readers</h3>
              {studentReads.slice(0,5).map((s,i)=>(
                <div key={s.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                  <span className="text-base w-8 text-center">{['🥇','🥈','🥉','4️⃣','5️⃣'][i]}</span>
                  <div className="flex-1 min-w-0"><p className="font-black text-gray-800 text-sm truncate">{s.name}</p><p className="text-[10px] text-gray-400">{s.adm} · {forms.find(f=>f.id===s.form_id)?.form_name||'—'}</p></div>
                  <div className="text-right flex-shrink-0"><span className="font-black text-indigo-700 text-base">{s.count}</span><p className="text-[9px] text-gray-400">books</p></div>
                </div>
              ))}
              {studentReads.length===0&&<p className="text-gray-400 text-sm text-center py-4">No reading data for {filterYear}</p>}
            </div>
          </div>
        </div>
      ) : activeTab === 'trending' ? (
        <>
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5 shadow-sm">
            <FiSearch className="text-gray-400" size={15}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by title or author…" className="flex-1 text-sm outline-none"/>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b bg-gray-50/60 flex items-center justify-between">
              <div><h3 className="font-black text-gray-800">🔥 Most Borrowed Books — {filterYear}</h3><p className="text-xs text-gray-400">{filteredBooks.length} books with checkouts</p></div>
            </div>
            {filteredBooks.length===0?<div className="py-16 text-center"><div className="text-5xl mb-3">📚</div><p className="font-black text-gray-600">No checkout data for {filterYear}</p></div>:(
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-gray-50">{['Rank','Title','Author','Category','Borrows','Return Rate','Popularity'].map(h=><th key={h} className="px-4 py-3 text-left text-[10px] font-black text-gray-500 uppercase whitespace-nowrap">{h}</th>)}</tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredBooks.map((b,i)=>(
                      <tr key={b.id} className="hover:bg-indigo-50/20 transition">
                        <td className="px-4 py-3 text-center font-black">{i<3?['🥇','🥈','🥉'][i]:`${i+1}`}</td>
                        <td className="px-4 py-3"><p className="font-black text-gray-800 text-sm">{b.title}</p></td>
                        <td className="px-4 py-3 text-xs text-gray-600 italic">{b.author||'—'}</td>
                        <td className="px-4 py-3"><span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">{b.category}</span></td>
                        <td className="px-4 py-3 text-center"><span className="font-black text-xl text-indigo-700">{b.count}</span></td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2"><div className="flex-1 h-2 bg-gray-100 rounded-full"><div className="h-2 rounded-full" style={{width:`${b.returnRate}%`,background:b.returnRate>=80?'#16a34a':b.returnRate>=50?'#d97706':'#dc2626'}}/></div><span className="text-xs font-black" style={{color:b.returnRate>=80?'#16a34a':b.returnRate>=50?'#d97706':'#dc2626'}}>{b.returnRate}%</span></div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 min-w-[80px]"><div className="flex-1 h-2 bg-gray-100 rounded-full"><div className="h-2 bg-indigo-500 rounded-full" style={{width:`${Math.round(b.count/Math.max(bookBorrowCount[0]?.count||1,1)*100)}%`}}/></div></div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : activeTab === 'bystudent' ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b bg-gray-50/60 flex items-center justify-between">
            <div><h3 className="font-black text-gray-800">🏆 Top Readers — {filterYear}</h3><p className="text-xs text-gray-400">{studentReads.length} students with checkouts</p></div>
          </div>
          {studentReads.length===0?<div className="py-16 text-center"><div className="text-5xl mb-3">🎓</div><p className="font-black text-gray-600">No student checkout data for {filterYear}</p></div>:(
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-gray-50">{['Rank','Student','Adm No','Class','Books Read','Returned','Overdue','Reading Score'].map(h=><th key={h} className="px-4 py-3 text-left text-[10px] font-black text-gray-500 uppercase whitespace-nowrap">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {studentReads.map((s,i)=>{
                    const formName=forms.find(f=>f.id===s.form_id)?.form_name||'—';
                    const score=Math.round((s.returned/Math.max(s.count,1)*50)+(s.count/Math.max(studentReads[0]?.count||1,1)*50));
                    return(
                      <tr key={s.id} className="hover:bg-indigo-50/20 transition">
                        <td className="px-4 py-3 text-center font-black">{i<3?['🥇','🥈','🥉'][i]:i<10?<span className="text-indigo-500 font-black">#{i+1}</span>:`${i+1}`}</td>
                        <td className="px-4 py-3"><div className="flex items-center gap-2"><div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center font-black text-indigo-700 text-xs flex-shrink-0">{s.name.charAt(0)}</div><p className="font-black text-gray-800 text-sm">{s.name}</p></div></td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-600">{s.adm||'—'}</td>
                        <td className="px-4 py-3 text-xs text-gray-600">{formName}</td>
                        <td className="px-4 py-3 text-center font-black text-xl text-indigo-700">{s.count}</td>
                        <td className="px-4 py-3 text-center font-bold text-green-700">{s.returned}</td>
                        <td className="px-4 py-3 text-center"><span className={`font-black ${s.overdue>0?'text-red-600':'text-gray-400'}`}>{s.overdue}</span></td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2"><div className="flex-1 h-2 bg-gray-100 rounded-full"><div className="h-2 rounded-full" style={{width:`${score}%`,background:score>=70?'#16a34a':score>=50?'#d97706':'#dc2626'}}/></div><span className="text-xs font-black">{score}</span></div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : activeTab === 'byclass' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {classStats.length===0?<div className="col-span-3 py-16 text-center bg-white rounded-2xl"><div className="text-5xl mb-3">🎓</div><p className="font-black text-gray-600">No class data for {filterYear}</p></div>:
          classStats.map((c,i)=>(
            <div key={c.form} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-5" style={{background:['linear-gradient(135deg,#eff6ff,#dbeafe)','linear-gradient(135deg,#f0fdf4,#dcfce7)','linear-gradient(135deg,#fdf4ff,#f3e8ff)','linear-gradient(135deg,#fff7ed,#fed7aa)','linear-gradient(135deg,#fef2f2,#fee2e2)'][i%5]}}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-black text-gray-800 text-lg">{c.form}</h3>
                  <div className="text-3xl font-black text-indigo-700">{c.count}</div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-white/70 rounded-xl p-2"><p className="text-[9px] text-gray-400 font-bold">BORROWS</p><p className="font-black text-gray-800">{c.count}</p></div>
                  <div className="bg-white/70 rounded-xl p-2"><p className="text-[9px] text-gray-400 font-bold">READERS</p><p className="font-black text-gray-800">{c.readers}</p></div>
                  <div className="bg-white/70 rounded-xl p-2"><p className="text-[9px] text-gray-400 font-bold">PART.</p><p className="font-black text-gray-800">{c.participation}%</p></div>
                </div>
              </div>
              <div className="px-5 py-3">
                <div className="flex justify-between items-center mb-1"><span className="text-xs text-gray-500">Class Participation</span><span className="text-xs font-black text-indigo-700">{c.readers}/{c.total} students</span></div>
                <div className="h-2.5 bg-gray-100 rounded-full"><div className="h-2.5 rounded-full" style={{width:`${c.participation}%`,background:c.participation>=60?'#4f46e5':c.participation>=30?'#d97706':'#dc2626'}}/></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* CATEGORIES */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-black text-gray-800 text-base mb-5">📚 Borrowing by Category — {filterYear}</h3>
            <div className="space-y-4">
              {categoryStats.map(c=>(
                <div key={c.cat}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{background:c.color}}/><span className="text-sm font-bold text-gray-700">{c.cat}</span></div>
                    <span className="font-black text-sm text-gray-800">{c.count} borrows <span className="text-gray-400 font-normal text-xs">({Math.round(c.count/Math.max(totalBorrows,1)*100)}%)</span></span>
                  </div>
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden"><div className="h-3 rounded-full" style={{width:`${Math.round(c.count/Math.max(categoryStats[0]?.count||1,1)*100)}%`,background:c.color}}/></div>
                </div>
              ))}
              {categoryStats.length===0&&<p className="text-gray-400 text-sm text-center py-8">No category data for {filterYear}</p>}
            </div>
          </div>
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-black text-gray-800 mb-4">📦 Books Available per Category</h3>
              {SUBJECT_COLORS.map((color, i) => {
                const categories = [...new Set(books.map(b => b.category).filter(Boolean))];
                const cat = categories[i];
                if (!cat) return null;
                const booksInCat = books.filter(b => b.category === cat).length;
                const available = books.filter(b => b.category === cat && b.available_copies > 0).length;
                return (
                  <div key={cat} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full" style={{background:color}}/><span className="text-sm text-gray-700">{cat}</span></div>
                    <div className="text-right"><span className="font-black text-sm text-gray-800">{booksInCat}</span><span className="text-xs text-gray-400 ml-1">books</span><span className="font-bold text-green-600 text-xs ml-2">({available} avail)</span></div>
                  </div>
                );
              })}
            </div>
            <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5">
              <h3 className="font-black text-indigo-800 mb-3">💡 Reading Programme Insights</h3>
              <ul className="space-y-2 text-sm text-indigo-700">
                <li className="flex items-start gap-2"><span>📌</span><span><b>{Math.round(uniqueReaders/Math.max(students.length,1)*100)}%</b> of students borrowed at least one book in {filterYear}</span></li>
                <li className="flex items-start gap-2"><span>📌</span><span>Average reader borrowed <b>{avgPerReader}</b> books</span></li>
                <li className="flex items-start gap-2"><span>📌</span><span>Best reading month: <b>{MONTHS[monthlyData.reduce((m,x,i)=>x.count>monthlyData[m].count?i:m,0)]}</b></span></li>
                <li className="flex items-start gap-2"><span>📌</span><span>Most popular genre: <b>{categoryStats[0]?.cat || '—'}</b></span></li>
                {overdue > 0 && <li className="flex items-start gap-2 text-red-600"><span>⚠️</span><span><b>{overdue}</b> books are currently overdue — send reminders!</span></li>}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
