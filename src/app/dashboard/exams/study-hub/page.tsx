'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { FiSearch, FiBook, FiVideo, FiFileText, FiDownload, FiPlay, FiStar, FiExternalLink } from 'react-icons/fi';

// ── Kenya curriculum subject resources ────────────────────────────────────────
const SUBJECT_NOTES: Record<string, { topic: string; form: string; content: string; tags: string[] }[]> = {
  Mathematics: [
    { topic: 'Quadratic Equations', form: 'Form 3', content: `A quadratic equation has the form ax² + bx + c = 0.\n\n**Methods of Solving:**\n1. **Factorisation** — Find two numbers that multiply to ac and add to b\n2. **Quadratic Formula** — x = (−b ± √(b²−4ac)) / 2a\n3. **Completing the Square** — Rewrite as (x+p)² = q\n\n**Discriminant:** b²−4ac\n- If > 0: Two real roots\n- If = 0: One repeated root\n- If < 0: No real roots\n\n**KCSE Tip:** Always show working for full marks. State the formula before using it.`, tags: ['algebra', 'kcse', 'form3'] },
    { topic: 'Trigonometry', form: 'Form 3', content: `**SOH-CAH-TOA:**\n- Sin θ = Opposite/Hypotenuse\n- Cos θ = Adjacent/Hypotenuse\n- Tan θ = Opposite/Adjacent\n\n**Special Angles:**\n| Angle | Sin | Cos | Tan |\n|-------|-----|-----|-----|\n| 0° | 0 | 1 | 0 |\n| 30° | ½ | √3/2 | 1/√3 |\n| 45° | √2/2 | √2/2 | 1 |\n| 60° | √3/2 | ½ | √3 |\n| 90° | 1 | 0 | — |\n\n**KCSE Tip:** Learn the unit circle. Negative angles and angles >90° appear frequently.`, tags: ['trigonometry', 'kcse', 'form3'] },
    { topic: 'Logarithms', form: 'Form 2', content: `**Definition:** logₐ(x) = y means aʸ = x\n\n**Laws of Logarithms:**\n1. log(AB) = log A + log B\n2. log(A/B) = log A − log B\n3. log(Aⁿ) = n·log A\n4. log₁₀(10) = 1, ln(e) = 1\n\n**Change of Base:** logₐ(x) = log(x)/log(a)\n\n**KCSE Tip:** Most questions test the three laws. Practice simplifying expressions before solving equations.`, tags: ['logarithms', 'form2', 'kcse'] },
    { topic: 'Differentiation', form: 'Form 4', content: `**Basic Rules:**\n- d/dx (xⁿ) = nxⁿ⁻¹\n- d/dx (constant) = 0\n- d/dx (sin x) = cos x\n- d/dx (cos x) = −sin x\n- d/dx (eˣ) = eˣ\n\n**Chain Rule:** d/dx [f(g(x))] = f'(g(x)) · g'(x)\n\n**Applications:** Gradient of curve, maximum/minimum points, rates of change\n\n**KCSE Tip:** Stationary points: set dy/dx = 0. Max if d²y/dx² < 0, min if > 0.`, tags: ['calculus', 'form4', 'kcse'] },
  ],
  Biology: [
    { topic: 'Cell Biology', form: 'Form 1', content: `**Cell Theory:**\n1. All living things are made of cells\n2. Cells are the basic units of life\n3. All cells come from pre-existing cells\n\n**Plant vs Animal Cells:**\n| Feature | Plant | Animal |\n|---------|-------|--------|\n| Cell wall | ✅ Cellulose | ❌ |\n| Chloroplasts | ✅ | ❌ |\n| Large vacuole | ✅ | Small/none |\n| Centrioles | ❌ | ✅ |\n\n**KCSE Tip:** Cell diagrams are very common. Label all organelles and state their functions.`, tags: ['cells', 'form1', 'kcse'] },
    { topic: 'Photosynthesis', form: 'Form 2', content: `**Equation:** 6CO₂ + 6H₂O + Light energy → C₆H₁₂O₆ + 6O₂\n\n**Two Stages:**\n1. **Light Stage (Thylakoids)** — Photolysis of water, production of ATP and NADPH\n2. **Dark Stage/Calvin Cycle (Stroma)** — CO₂ fixation, production of glucose\n\n**Factors Affecting Rate:** Light intensity, CO₂ concentration, Temperature, Water availability\n\n**KCSE Tip:** Draw and label a chloroplast. Know the limiting factors and their effects.`, tags: ['photosynthesis', 'form2', 'kcse'] },
    { topic: 'Genetics', form: 'Form 4', content: `**Key Terms:**\n- **Genotype** — Genetic makeup (e.g., Aa, BB)\n- **Phenotype** — Physical appearance\n- **Dominant** — Expressed in heterozygote (uppercase)\n- **Recessive** — Masked in heterozygote (lowercase)\n\n**Monohybrid Cross (Mendel):**\nTt × Tt → 1TT : 2Tt : 1tt (3:1 phenotype ratio)\n\n**Sex-linked Inheritance:** Genes on X chromosome. Colour blindness, haemophilia.\n\n**KCSE Tip:** Always draw a full Punnett square. State the genotype AND phenotype ratios.`, tags: ['genetics', 'form4', 'kcse'] },
  ],
  Chemistry: [
    { topic: 'Chemical Bonding', form: 'Form 2', content: `**Types of Bonds:**\n1. **Ionic** — Transfer of electrons (metal + non-metal). e.g., NaCl\n2. **Covalent** — Sharing of electrons (non-metals). e.g., H₂O, CO₂\n3. **Metallic** — Sea of electrons in metal lattice\n\n**Ionic vs Covalent:**\n| Property | Ionic | Covalent |\n|----------|-------|----------|\n| Melting point | High | Low |\n| Solubility in water | Yes | Mostly no |\n| Conducts electricity | Yes (dissolved) | No |\n\n**KCSE Tip:** Dot-and-cross diagrams for covalent bonds are frequently tested.`, tags: ['bonding', 'form2', 'kcse'] },
    { topic: 'Organic Chemistry', form: 'Form 4', content: `**Homologous Series:**\n- **Alkanes:** CₙH₂ₙ₊₂ (single bonds) — methane, ethane, propane\n- **Alkenes:** CₙH₂ₙ (one double bond) — ethene, propene\n- **Alcohols:** CₙH₂ₙ₊₁OH — ethanol\n\n**Reactions:**\n- Alkanes: Combustion, Substitution\n- Alkenes: Addition (H₂, Br₂, H₂O), Polymerisation\n\n**Fermentation:** C₆H₁₂O₆ → 2C₂H₅OH + 2CO₂\n\n**KCSE Tip:** Know IUPAC naming rules. Structural formulae are commonly tested.`, tags: ['organic', 'form4', 'kcse'] },
  ],
  Physics: [
    { topic: 'Mechanics — Newton\'s Laws', form: 'Form 2', content: `**Newton's Three Laws:**\n1. **Inertia** — Object at rest/motion stays unless acted on by force\n2. **F = ma** — Force = mass × acceleration\n3. **Action-Reaction** — Equal and opposite forces\n\n**Key Equations:**\n- v = u + at\n- s = ut + ½at²\n- v² = u² + 2as\n- F = ma\n- W = mg\n\n**KCSE Tip:** Define each law clearly. Always include units (m/s², N, kg).`, tags: ['mechanics', 'form2', 'kcse', 'newton'] },
    { topic: 'Electricity', form: 'Form 3', content: `**Ohm's Law:** V = IR\n\n**Series Circuit:** R_total = R₁ + R₂ + R₃; I is same everywhere\n**Parallel Circuit:** 1/R_total = 1/R₁ + 1/R₂; V is same across all\n\n**Power:** P = IV = I²R = V²/R\n\n**Energy:** E = Pt = VIt\n\n**KCSE Tip:** Draw circuit diagrams neatly. Label all components. Show all substitution steps.`, tags: ['electricity', 'form3', 'kcse'] },
  ],
  English: [
    { topic: 'Essay Writing', form: 'Form 3', content: `**Types of Essays:**\n1. **Descriptive** — Describe a scene/person using vivid language\n2. **Narrative** — Tell a story with beginning, middle, end\n3. **Argumentative** — Present and defend a position\n4. **Expository** — Explain/inform on a topic\n\n**Structure:**\n- **Introduction** — Hook + thesis statement\n- **Body Paragraphs** — Topic sentence + evidence + explanation\n- **Conclusion** — Restate thesis + final thought\n\n**KCSE Tip:** KCSE awards marks for content (10), language accuracy (10), and organization (10). Do not exceed 450 words.`, tags: ['writing', 'form3', 'kcse'] },
    { topic: 'Grammar — Tenses', form: 'Form 1', content: `**Simple Tenses:**\n- Present: I walk / He walks\n- Past: I walked\n- Future: I will walk\n\n**Continuous Tenses:**\n- Present: I am walking\n- Past: I was walking\n- Future: I will be walking\n\n**Perfect Tenses:**\n- Present Perfect: I have walked\n- Past Perfect: I had walked\n- Future Perfect: I will have walked\n\n**KCSE Tip:** Tense consistency in essays is critical. Shift in tense = marks lost.`, tags: ['grammar', 'form1', 'tenses'] },
  ],
  Kiswahili: [
    { topic: 'Fasihi — Riwaya', form: 'Form 3', content: `**Vipengele vya Riwaya:**\n- **Maudhui** — Wazo kuu la riwaya\n- **Dhamira** — Madhumuni ya mwandishi\n- **Wahusika** — Watu/viumbe ndani ya hadithi\n- **Msuko (Plot)** — Mtiririko wa matukio\n- **Mandhari** — Mahali na wakati wa hadithi\n\n**Mbinu za Lugha:** Tashibiha (simile), istiari (metaphor), tashihisi (personification)\n\n**Kidokezo cha KCSE:** Jibu maswali ukitoa ushahidi kutoka kwenye riwaya. Andika kwa lugha safi ya Kiswahili sanifu.`, tags: ['fasihi', 'riwaya', 'form3', 'kcse'] },
  ],
  History: [
    { topic: 'Colonialism in Africa', form: 'Form 2', content: `**The Scramble for Africa (1884-1885):**\nBerlin Conference divided Africa among European powers without African consent.\n\n**Causes of Colonialism:**\n1. Industrial Revolution — need for raw materials and markets\n2. Missionary activities — "3 Cs": Christianity, Commerce, Civilization\n3. Balance of power competition among European states\n\n**Effects on Africa:**\n- Loss of political independence\n- Introduction of cash crop farming\n- Disruption of traditional structures\n- Introduction of formal education and Christianity\n\n**KCSE Tip:** "Discuss the effects" questions are most common. Use PEEL format: Point, Evidence, Explanation, Link.`, tags: ['history', 'colonialism', 'form2', 'kcse'] },
  ],
};

// ── Video resources (YouTube-linked, Kenya curriculum) ────────────────────────
const VIDEO_RESOURCES = [
  { id: 1, subject: 'Mathematics', topic: 'Quadratic Equations', form: 'Form 3', duration: '18:24', youtubeId: 'IlgMVlJOXiQ', thumb: '🔢', views: 12400, rating: 4.8 },
  { id: 2, subject: 'Mathematics', topic: 'Differentiation Basics', form: 'Form 4', duration: '22:10', youtubeId: 'rAof9Ld5sOg', thumb: '📐', views: 9800, rating: 4.7 },
  { id: 3, subject: 'Biology', topic: 'Photosynthesis Explained', form: 'Form 2', duration: '15:30', youtubeId: 'bkzrSKCMPdI', thumb: '🌿', views: 18200, rating: 4.9 },
  { id: 4, subject: 'Biology', topic: 'Genetics & Inheritance', form: 'Form 4', duration: '25:18', youtubeId: 'CBezq1fFUEA', thumb: '🧬', views: 14300, rating: 4.8 },
  { id: 5, subject: 'Chemistry', topic: 'Organic Chemistry Overview', form: 'Form 4', duration: '30:45', youtubeId: 'HSMFJPlLCiI', thumb: '⚗️', views: 11200, rating: 4.6 },
  { id: 6, subject: 'Chemistry', topic: 'Chemical Bonding', form: 'Form 2', duration: '19:52', youtubeId: 'QXT4YDLIQWQ', thumb: '🔗', views: 8900, rating: 4.7 },
  { id: 7, subject: 'Physics', topic: 'Newton\'s Laws of Motion', form: 'Form 2', duration: '21:05', youtubeId: 'kKKM8Y-u7ds', thumb: '⚡', views: 16700, rating: 4.8 },
  { id: 8, subject: 'Physics', topic: 'Electricity & Circuits', form: 'Form 3', duration: '28:33', youtubeId: 'MC0tq6fNRwU', thumb: '💡', views: 13400, rating: 4.7 },
  { id: 9, subject: 'English', topic: 'Essay Writing Mastery', form: 'Form 3', duration: '16:40', youtubeId: 'G2N3XSQer2E', thumb: '✍️', views: 21000, rating: 4.9 },
  { id: 10, subject: 'History', topic: 'Scramble for Africa', form: 'Form 2', duration: '20:15', youtubeId: 'wJt_WNjfTlU', thumb: '🌍', views: 9200, rating: 4.6 },
];

// ── KCSE Past Papers ─────────────────────────────────────────────────────────
const PAST_PAPERS = [
  { year: 2023, subject: 'Mathematics', paper: 'Paper 1', type: 'KCSE', url: 'https://kenyapastpapers.com/kcse-2023-mathematics-paper-1/', size: '1.2 MB' },
  { year: 2023, subject: 'Mathematics', paper: 'Paper 2', type: 'KCSE', url: 'https://kenyapastpapers.com/kcse-2023-mathematics-paper-2/', size: '1.0 MB' },
  { year: 2023, subject: 'Biology', paper: 'Paper 1', type: 'KCSE', url: 'https://kenyapastpapers.com/kcse-2023-biology-paper-1/', size: '0.9 MB' },
  { year: 2023, subject: 'Biology', paper: 'Paper 2', type: 'KCSE', url: 'https://kenyapastpapers.com/kcse-2023-biology-paper-2/', size: '1.1 MB' },
  { year: 2023, subject: 'Biology', paper: 'Paper 3 (Practical)', type: 'KCSE', url: 'https://kenyapastpapers.com/kcse-2023-biology-paper-3/', size: '0.8 MB' },
  { year: 2023, subject: 'Chemistry', paper: 'Paper 1', type: 'KCSE', url: 'https://kenyapastpapers.com/kcse-2023-chemistry-paper-1/', size: '0.9 MB' },
  { year: 2023, subject: 'Chemistry', paper: 'Paper 2', type: 'KCSE', url: 'https://kenyapastpapers.com/kcse-2023-chemistry-paper-2/', size: '1.1 MB' },
  { year: 2023, subject: 'Physics', paper: 'Paper 1', type: 'KCSE', url: 'https://kenyapastpapers.com/kcse-2023-physics-paper-1/', size: '1.0 MB' },
  { year: 2023, subject: 'Physics', paper: 'Paper 2', type: 'KCSE', url: 'https://kenyapastpapers.com/kcse-2023-physics-paper-2/', size: '1.2 MB' },
  { year: 2023, subject: 'English', paper: 'Paper 1', type: 'KCSE', url: 'https://kenyapastpapers.com/kcse-2023-english-paper-1/', size: '0.7 MB' },
  { year: 2023, subject: 'Kiswahili', paper: 'Paper 1', type: 'KCSE', url: 'https://kenyapastpapers.com/kcse-2023-kiswahili-paper-1/', size: '0.8 MB' },
  { year: 2022, subject: 'Mathematics', paper: 'Paper 1', type: 'KCSE', url: 'https://kenyapastpapers.com/kcse-2022-mathematics-paper-1/', size: '1.1 MB' },
  { year: 2022, subject: 'Mathematics', paper: 'Paper 2', type: 'KCSE', url: 'https://kenyapastpapers.com/kcse-2022-mathematics-paper-2/', size: '1.0 MB' },
  { year: 2022, subject: 'Biology', paper: 'Paper 1', type: 'KCSE', url: 'https://kenyapastpapers.com/kcse-2022-biology-paper-1/', size: '0.9 MB' },
  { year: 2022, subject: 'Chemistry', paper: 'Paper 1', type: 'KCSE', url: 'https://kenyapastpapers.com/kcse-2022-chemistry-paper-1/', size: '0.8 MB' },
  { year: 2022, subject: 'Physics', paper: 'Paper 1', type: 'KCSE', url: 'https://kenyapastpapers.com/kcse-2022-physics-paper-1/', size: '1.0 MB' },
  { year: 2021, subject: 'Mathematics', paper: 'Paper 1', type: 'KCSE', url: 'https://kenyapastpapers.com/kcse-2021-mathematics-paper-1/', size: '1.2 MB' },
  { year: 2021, subject: 'Mathematics', paper: 'Paper 2', type: 'KCSE', url: 'https://kenyapastpapers.com/kcse-2021-mathematics-paper-2/', size: '1.1 MB' },
  { year: 2021, subject: 'Biology', paper: 'Paper 2', type: 'KCSE', url: 'https://kenyapastpapers.com/kcse-2021-biology-paper-2/', size: '1.0 MB' },
  { year: 2020, subject: 'Mathematics', paper: 'Paper 1', type: 'KCSE', url: 'https://kenyapastpapers.com/kcse-2020-mathematics-paper-1/', size: '1.1 MB' },
  { year: 2019, subject: 'Mathematics', paper: 'Paper 1', type: 'KCSE', url: 'https://kenyapastpapers.com/kcse-2019-mathematics-paper-1/', size: '1.0 MB' },
  { year: 2019, subject: 'Biology', paper: 'Paper 1', type: 'KCSE', url: 'https://kenyapastpapers.com/kcse-2019-biology-paper-1/', size: '0.9 MB' },
];

type SHTab = 'notes' | 'videos' | 'papers';

export default function StudyHubPage() {
  const [tab, setTab] = useState<SHTab>('notes');
  const [search, setSearch] = useState('');
  const [selSubject, setSelSubject] = useState('');
  const [selForm, setSelForm] = useState('');
  const [selNote, setSelNote] = useState<any>(null);
  const [playVideo, setPlayVideo] = useState<any>(null);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [forms, setForms] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      supabase.from('school_subjects').select('*').eq('is_active', true).order('subject_name'),
      supabase.from('school_forms').select('*').order('form_level'),
    ]).then(([s, f]) => { setSubjects(s.data || []); setForms(f.data || []); });
  }, []);

  // Filter notes
  const allNotes = Object.entries(SUBJECT_NOTES).flatMap(([subj, notes]) =>
    notes.map(n => ({ ...n, subject: subj }))
  ).filter(n =>
    (!selSubject || n.subject.toLowerCase().includes(selSubject.toLowerCase()) || subjects.find(s => String(s.id) === selSubject)?.subject_name?.toLowerCase() === n.subject.toLowerCase()) &&
    (!selForm || n.form === selForm) &&
    (!search || n.topic.toLowerCase().includes(search.toLowerCase()) || n.subject.toLowerCase().includes(search.toLowerCase()) || n.tags.some(t => t.includes(search.toLowerCase())))
  );

  // Filter videos
  const allVideos = VIDEO_RESOURCES.filter(v =>
    (!selSubject || (subjects.find(s => String(s.id) === selSubject)?.subject_name?.toLowerCase() === v.subject.toLowerCase() || !selSubject)) &&
    (!selForm || v.form === selForm) &&
    (!search || v.subject.toLowerCase().includes(search.toLowerCase()) || v.topic.toLowerCase().includes(search.toLowerCase()))
  );

  // Filter papers
  const allPapers = PAST_PAPERS.filter(p =>
    (!selSubject || (subjects.find(s => String(s.id) === selSubject)?.subject_name?.toLowerCase() === p.subject.toLowerCase() || !selSubject)) &&
    (!search || p.subject.toLowerCase().includes(search.toLowerCase()) || p.paper.toLowerCase().includes(search.toLowerCase()))
  );

  const TABS = [
    { id: 'notes', label: '📖 Study Notes', count: allNotes.length },
    { id: 'videos', label: '🎥 Video Lessons', count: allVideos.length },
    { id: 'papers', label: '📄 KCSE Past Papers', count: allPapers.length },
  ] as const;

  const subjectsList = [...new Set([...Object.keys(SUBJECT_NOTES), ...VIDEO_RESOURCES.map(v => v.subject), ...PAST_PAPERS.map(p => p.subject)])];
  const formsList = [...new Set([...allNotes.map(n => n.form), ...allVideos.map(v => v.form)])].sort();

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: 24 }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#1e40af,#3b82f6)', borderRadius: 16, padding: '20px 28px', marginBottom: 24, color: '#fff' }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>📚 Kenya Student Study Hub</h1>
        <p style={{ margin: '4px 0 0', opacity: 0.85, fontSize: 13 }}>KCSE & CBC Notes · Video Lessons · Past Papers 2019–2023 · Kenya Curriculum Aligned</p>
        <div style={{ display: 'flex', gap: 16, marginTop: 14, flexWrap: 'wrap' }}>
          {[
            { label: 'Study Notes', value: Object.values(SUBJECT_NOTES).flat().length, icon: '📖' },
            { label: 'Video Lessons', value: VIDEO_RESOURCES.length, icon: '🎥' },
            { label: 'KCSE Papers', value: PAST_PAPERS.length, icon: '📄' },
            { label: 'Subjects Covered', value: subjectsList.length, icon: '📚' },
          ].map((s, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: '10px 18px', textAlign: 'center', minWidth: 90 }}>
              <div style={{ fontSize: 18 }}>{s.icon}</div>
              <div style={{ fontSize: 20, fontWeight: 900 }}>{s.value}</div>
              <div style={{ fontSize: 10, opacity: 0.85 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Search + filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <FiSearch style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={15} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search notes, videos, topics..."
            style={{ width: '100%', paddingLeft: 36, paddingRight: 12, paddingTop: 10, paddingBottom: 10, border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 13, boxSizing: 'border-box' }} />
        </div>
        <select value={selSubject} onChange={e => setSelSubject(e.target.value)}
          style={{ padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 13, fontWeight: 600, background: '#fff' }}>
          <option value="">All Subjects</option>
          {subjectsList.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={selForm} onChange={e => setSelForm(e.target.value)}
          style={{ padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 13, fontWeight: 600, background: '#fff' }}>
          <option value="">All Forms</option>
          {formsList.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '2px solid #e2e8f0', paddingBottom: 8 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id as SHTab)}
            style={{ background: tab === t.id ? '#1e40af' : 'transparent', color: tab === t.id ? '#fff' : '#475569', border: 'none', borderRadius: 10, padding: '8px 18px', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            {t.label} <span style={{ background: tab === t.id ? 'rgba(255,255,255,0.25)' : '#e2e8f0', color: tab === t.id ? '#fff' : '#64748b', borderRadius: 10, padding: '0 7px', fontSize: 10, fontWeight: 900 }}>{t.count}</span>
          </button>
        ))}
      </div>

      {/* ── NOTES TAB ── */}
      {tab === 'notes' && (
        <div>
          {selNote ? (
            <div style={{ background: '#fff', borderRadius: 14, border: '1.5px solid #e2e8f0', padding: 24 }}>
              <button onClick={() => setSelNote(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 11, fontWeight: 700, cursor: 'pointer', marginBottom: 16, color: '#475569' }}>← Back to Notes</button>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                <span style={{ background: '#1e40af', color: '#fff', borderRadius: 6, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>{selNote.subject}</span>
                <span style={{ background: '#e0f2fe', color: '#0369a1', borderRadius: 6, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>{selNote.form}</span>
                <span style={{ background: '#fef9c3', color: '#92400e', borderRadius: 6, padding: '2px 8px', fontSize: 10, fontWeight: 700 }}>📌 KCSE</span>
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 900, color: '#1e293b', marginBottom: 16 }}>{selNote.topic}</h2>
              <div style={{ background: '#f8fafc', borderRadius: 10, padding: 18, fontSize: 13, lineHeight: 1.8, color: '#334155', whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{selNote.content}</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 14, flexWrap: 'wrap' }}>
                {selNote.tags.map((t: string) => <span key={t} style={{ background: '#f1f5f9', color: '#64748b', borderRadius: 6, padding: '2px 8px', fontSize: 10, fontWeight: 600 }}>#{t}</span>)}
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 14 }}>
              {allNotes.map((n, i) => (
                <div key={i} onClick={() => setSelNote(n)} style={{ background: '#fff', borderRadius: 12, border: '1.5px solid #e2e8f0', padding: 16, cursor: 'pointer', transition: 'box-shadow 0.2s' }}
                  onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(30,64,175,0.12)')}
                  onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <span style={{ background: '#dbeafe', color: '#1e40af', borderRadius: 6, padding: '2px 8px', fontSize: 10, fontWeight: 700 }}>{n.subject}</span>
                    <span style={{ background: '#f1f5f9', color: '#475569', borderRadius: 6, padding: '2px 8px', fontSize: 10, fontWeight: 700 }}>{n.form}</span>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 14, color: '#1e293b', marginBottom: 6 }}>{n.topic}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.5 }}>{n.content.substring(0, 100)}...</div>
                  <div style={{ marginTop: 10, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {n.tags.slice(0, 3).map(t => <span key={t} style={{ background: '#f8fafc', color: '#64748b', borderRadius: 4, padding: '1px 6px', fontSize: 9, fontWeight: 600 }}>#{t}</span>)}
                  </div>
                </div>
              ))}
              {allNotes.length === 0 && <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 40, color: '#94a3b8', fontSize: 13 }}>No notes match your search. Try different filters.</div>}
            </div>
          )}
        </div>
      )}

      {/* ── VIDEOS TAB ── */}
      {tab === 'videos' && (
        <div>
          {playVideo && (
            <div style={{ marginBottom: 20, background: '#000', borderRadius: 14, overflow: 'hidden', position: 'relative' }}>
              <button onClick={() => setPlayVideo(null)} style={{ position: 'absolute', top: 12, right: 12, zIndex: 10, background: 'rgba(0,0,0,0.7)', border: 'none', borderRadius: 8, padding: '6px 12px', color: '#fff', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>✕ Close</button>
              <iframe src={`https://www.youtube.com/embed/${playVideo.youtubeId}?autoplay=1`}
                style={{ width: '100%', height: 420, border: 'none' }} allowFullScreen allow="autoplay" />
              <div style={{ background: '#1e293b', padding: '14px 20px', color: '#fff' }}>
                <div style={{ fontWeight: 800, fontSize: 15 }}>{playVideo.topic}</div>
                <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>{playVideo.subject} · {playVideo.form} · {playVideo.duration}</div>
              </div>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 14 }}>
            {allVideos.map(v => (
              <div key={v.id} style={{ background: '#fff', borderRadius: 12, border: '1.5px solid #e2e8f0', overflow: 'hidden', cursor: 'pointer' }}
                onClick={() => setPlayVideo(v)}>
                <div style={{ background: 'linear-gradient(135deg,#1e293b,#334155)', height: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                  <span style={{ fontSize: 42 }}>{v.thumb}</span>
                  <div style={{ position: 'absolute', bottom: 8, right: 8, background: 'rgba(0,0,0,0.7)', borderRadius: 6, padding: '2px 8px', color: '#fff', fontSize: 10, fontWeight: 700 }}>{v.duration}</div>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0)', transition: 'background 0.2s' }}>
                    <div style={{ width: 44, height: 44, background: 'rgba(255,255,255,0.9)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FiPlay size={18} style={{ color: '#dc2626', marginLeft: 3 }} />
                    </div>
                  </div>
                </div>
                <div style={{ padding: '12px 14px' }}>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                    <span style={{ background: '#dbeafe', color: '#1e40af', borderRadius: 5, padding: '1px 7px', fontSize: 9, fontWeight: 700 }}>{v.subject}</span>
                    <span style={{ background: '#f1f5f9', color: '#475569', borderRadius: 5, padding: '1px 7px', fontSize: 9, fontWeight: 700 }}>{v.form}</span>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 13, color: '#1e293b', marginBottom: 4 }}>{v.topic}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#94a3b8' }}>
                    <span>👁️ {v.views.toLocaleString()} views</span>
                    <span>⭐ {v.rating}</span>
                  </div>
                </div>
              </div>
            ))}
            {allVideos.length === 0 && <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 40, color: '#94a3b8', fontSize: 13 }}>No videos match your search.</div>}
          </div>
        </div>
      )}

      {/* ── PAST PAPERS TAB ── */}
      {tab === 'papers' && (
        <div>
          <div style={{ background: '#fef3c7', border: '1.5px solid #f59e0b', borderRadius: 10, padding: '10px 16px', marginBottom: 16, fontSize: 12, color: '#92400e', fontWeight: 600 }}>
            📌 KNEC official past papers 2019–2023. Click links to access — some may redirect to the KNEC website or approved archive. Always verify source authenticity.
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            {[...new Set(allPapers.map(p => p.year))].sort((a, b) => b - a).map(year => (
              <div key={year}>
                <div style={{ fontWeight: 900, fontSize: 13, color: '#1e293b', padding: '8px 0', borderBottom: '2px solid #e2e8f0', marginBottom: 8 }}>📅 {year} KCSE Examinations</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 8, marginBottom: 14 }}>
                  {allPapers.filter(p => p.year === year).map((p, i) => (
                    <a key={i} href={p.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                      <div style={{ background: '#fff', borderRadius: 10, border: '1.5px solid #e2e8f0', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, transition: 'box-shadow 0.2s' }}
                        onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)')}
                        onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}>
                        <div style={{ fontSize: 22, flexShrink: 0 }}>📄</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 800, fontSize: 12, color: '#1e293b' }}>{p.subject}</div>
                          <div style={{ fontSize: 11, color: '#64748b' }}>{p.paper} · {p.size}</div>
                        </div>
                        <FiExternalLink size={14} style={{ color: '#94a3b8', flexShrink: 0 }} />
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            ))}
            {allPapers.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8', fontSize: 13 }}>No papers match your search.</div>}
          </div>
        </div>
      )}
    </div>
  );
}
