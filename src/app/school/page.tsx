import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

// Force dynamic rendering — data fetched at request time, not build time
export const dynamic = 'force-dynamic';

async function getData() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // Guard: if env vars missing (build time), return empty data
  if (!url || !key) return { school: {}, cfg: {}, news: [], forms: [] };

  const supabase = createClient(url, key);
  const [school, configRows, news, forms] = await Promise.all([
    supabase.from('school_details').select('*').single(),
    supabase.from('school_website_config').select('*'),
    supabase.from('school_news').select('*').eq('is_published', true).order('published_at', { ascending: false }).limit(6),
    supabase.from('school_forms').select('id,form_name').order('form_name'),
  ]);
  const cfg: Record<string, any> = {};
  for (const row of configRows.data || []) {
    try { cfg[row.section] = JSON.parse(row.content || '{}'); } catch { cfg[row.section] = {}; }
  }
  return {
    school: school.data || {},
    cfg,
    news: news.data || [],
    forms: forms.data || [],
  };
}

export default async function SchoolWebsitePage() {
  const { school, cfg, news, forms } = await getData();

  const hero     = cfg.hero     || {};
  const about    = cfg.about    || {};
  const academics= cfg.academics|| {};
  const achieve  = cfg.achievements || {};
  const contact  = cfg.contact  || {};
  const settings = cfg.settings || {};

  const theme    = hero.theme   || { primary: '#1d4ed8', secondary: '#0f172a' };
  const tagline  = hero.tagline || 'Nurturing Tomorrow\'s Leaders Today';
  const cta      = hero.cta     || 'Apply for Admission';
  const values   = (about.values || 'Integrity,Excellence,Teamwork').split(',').map((v: string) => v.trim()).filter(Boolean);
  const extras   = (academics.extracurricular || '').split(',').map((v: string) => v.trim()).filter(Boolean);

  if (!settings.published && settings.published !== undefined) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: 'white', fontFamily: 'system-ui' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 48, marginBottom: 16 }}>🚧</p>
          <h1 style={{ fontSize: 24, fontWeight: 900 }}>Website Coming Soon</h1>
          <p style={{ color: '#94a3b8', marginTop: 8 }}>This school website is currently being set up.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', system-ui, sans-serif; color: #1e293b; }
        .container { max-width: 1100px; margin: 0 auto; padding: 0 24px; }
        .fade-in { animation: fadeIn .8s ease both; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: none; } }
        .nav-link { color: rgba(255,255,255,.85); text-decoration: none; font-size: 14px; font-weight: 600; transition: color .2s; }
        .nav-link:hover { color: #fff; }
        .section { padding: 80px 0; }
        .section-alt { background: #f8fafc; }
        .section-title { font-size: 30px; font-weight: 900; color: #0f172a; margin-bottom: 12px; }
        .section-sub { color: #64748b; font-size: 16px; margin-bottom: 48px; }
        .card { background: #fff; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 1px 4px rgba(0,0,0,.06); padding: 24px; transition: box-shadow .2s; }
        .card:hover { box-shadow: 0 8px 32px rgba(0,0,0,.1); transform: translateY(-2px); transition: all .2s; }
        .badge { display: inline-block; padding: 4px 12px; border-radius: 999px; font-size: 11px; font-weight: 700; }
        .btn { display: inline-flex; align-items: center; gap: 8px; padding: 14px 28px; border-radius: 12px; font-weight: 700; font-size: 15px; text-decoration: none; transition: all .2s; cursor: pointer; border: none; }
        .btn-primary { color: #fff; }
        .btn-outline { background: rgba(255,255,255,.15); color: #fff; border: 2px solid rgba(255,255,255,.4); }
        .btn-outline:hover { background: rgba(255,255,255,.25); }
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; align-items: center; }
        .grid-3 { display: grid; grid-template-columns: repeat(3,1fr); gap: 24px; }
        .grid-4 { display: grid; grid-template-columns: repeat(4,1fr); gap: 16px; }
        @media (max-width: 768px) {
          .grid-2,.grid-3,.grid-4 { grid-template-columns: 1fr; }
          .hero-actions { flex-direction: column; }
          .nav-links { display: none; }
        }
      `}</style>

      {/* ── NAVBAR ── */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: theme.secondary, boxShadow: '0 2px 12px rgba(0,0,0,.3)' }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: theme.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 16 }}>
              {(school.school_name || 'S').charAt(0)}
            </div>
            <span style={{ color: '#fff', fontWeight: 900, fontSize: 15 }}>{school.school_name || 'Our School'}</span>
          </div>
          <div className="nav-links" style={{ display: 'flex', gap: 32 }}>
            {['Home','About','Academics','News','Gallery','Contact'].map(l => (
              <a key={l} href={`#${l.toLowerCase()}`} className="nav-link">{l}</a>
            ))}
          </div>
          <a href="/portal/login" className="btn btn-primary" style={{ background: theme.primary, padding: '10px 20px', fontSize: 13 }}>
            Apply Now →
          </a>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section id="home" style={{ minHeight: '92vh', background: `linear-gradient(135deg, ${theme.secondary} 0%, ${theme.primary} 100%)`, display: 'flex', alignItems: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,.07) 1px, transparent 0)', backgroundSize: '28px 28px' }} />
        <div className="container fade-in" style={{ textAlign: 'center', position: 'relative' }}>
          <div style={{ display: 'inline-block', padding: '6px 16px', borderRadius: 999, background: 'rgba(255,255,255,.15)', color: 'rgba(255,255,255,.9)', fontSize: 12, fontWeight: 700, marginBottom: 24, letterSpacing: 2 }}>
            🎓 {academics.curriculum || 'CBC'} CURRICULUM · EXCELLENCE IN EDUCATION
          </div>
          <h1 style={{ fontSize: 'clamp(36px,6vw,72px)', fontWeight: 900, color: '#fff', lineHeight: 1.1, marginBottom: 20 }}>
            {school.school_name || 'Welcome to Our School'}
          </h1>
          <p style={{ fontSize: 20, color: 'rgba(255,255,255,.8)', maxWidth: 600, margin: '0 auto 40px' }}>
            {tagline}
          </p>

          {/* Stats strip */}
          <div style={{ display: 'flex', gap: 24, justifyContent: 'center', marginBottom: 48, flexWrap: 'wrap' }}>
            {[
              { val: '1,200+', lbl: 'Students' },
              { val: '80+', lbl: 'Teachers' },
              { val: academics.kcse_mean ? `${academics.kcse_mean}` : 'A', lbl: 'Mean Grade' },
              { val: '30+', lbl: 'Years of Excellence' },
            ].map((s, i) => (
              <div key={i} style={{ textAlign: 'center', padding: '16px 24px', background: 'rgba(255,255,255,.12)', borderRadius: 16, backdropFilter: 'blur(10px)' }}>
                <p style={{ fontSize: 28, fontWeight: 900, color: '#fff' }}>{s.val}</p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,.7)', fontWeight: 600 }}>{s.lbl}</p>
              </div>
            ))}
          </div>

          <div className="hero-actions" style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/portal/login" className="btn btn-primary" style={{ background: '#fff', color: theme.primary, fontSize: 15 }}>
              🎓 {cta}
            </a>
            <a href="#about" className="btn btn-outline">Learn More ↓</a>
          </div>
        </div>
      </section>

      {/* ── ABOUT ── */}
      <section id="about" className="section">
        <div className="container grid-2">
          <div>
            <p style={{ color: theme.primary, fontWeight: 700, fontSize: 13, letterSpacing: 2, marginBottom: 12 }}>ABOUT US</p>
            <h2 className="section-title">Our Story & Mission</h2>
            <p style={{ color: '#475569', lineHeight: 1.8, marginBottom: 24 }}>{about.history || `${school.school_name} is committed to providing quality education that prepares students for the challenges of tomorrow.`}</p>
            {about.mission && (
              <div style={{ padding: '16px 20px', background: '#f0f9ff', borderLeft: `4px solid ${theme.primary}`, borderRadius: '0 12px 12px 0', marginBottom: 16 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: theme.primary, marginBottom: 4 }}>MISSION</p>
                <p style={{ color: '#374151', fontSize: 14 }}>{about.mission}</p>
              </div>
            )}
            {about.vision && (
              <div style={{ padding: '16px 20px', background: '#f0fdf4', borderLeft: '4px solid #10b981', borderRadius: '0 12px 12px 0' }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#10b981', marginBottom: 4 }}>VISION</p>
                <p style={{ color: '#374151', fontSize: 14 }}>{about.vision}</p>
              </div>
            )}
          </div>
          <div>
            {values.length > 0 && (
              <div className="card">
                <p style={{ fontWeight: 900, fontSize: 16, marginBottom: 16 }}>🌟 Our Core Values</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {values.map((v: string, i: number) => (
                    <span key={i} className="badge" style={{ background: `${theme.primary}15`, color: theme.primary, fontSize: 13, padding: '8px 16px' }}>✓ {v}</span>
                  ))}
                </div>
                {about.principal_msg && (
                  <div style={{ marginTop: 24, padding: 20, background: '#f8fafc', borderRadius: 12 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 8 }}>PRINCIPAL'S MESSAGE</p>
                    <p style={{ fontStyle: 'italic', color: '#475569', fontSize: 14, lineHeight: 1.7 }}>"{about.principal_msg}"</p>
                    <p style={{ fontWeight: 700, fontSize: 13, color: '#1e293b', marginTop: 12 }}>— The Principal, {school.school_name}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── ACADEMICS ── */}
      <section id="academics" className="section section-alt">
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <p style={{ color: theme.primary, fontWeight: 700, fontSize: 13, letterSpacing: 2, marginBottom: 12 }}>CURRICULUM</p>
            <h2 className="section-title">Academic Excellence</h2>
            <p className="section-sub">{academics.curriculum || 'CBC'} curriculum · {academics.type || 'Day'} school</p>
          </div>
          <div className="grid-3" style={{ marginBottom: 40 }}>
            {forms.map((f: any) => (
              <div key={f.id} className="card" style={{ textAlign: 'center' }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: `${theme.primary}15`, margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>📚</div>
                <p style={{ fontWeight: 700, fontSize: 15 }}>{f.form_name}</p>
                <p style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>{academics.curriculum || 'CBC'} Curriculum</p>
              </div>
            ))}
          </div>
          {extras.length > 0 && (
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontWeight: 700, marginBottom: 16 }}>Extra-Curricular Activities</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
                {extras.map((e: string, i: number) => (
                  <span key={i} className="badge" style={{ background: '#f1f5f9', color: '#475569', fontSize: 13, padding: '8px 16px', borderRadius: 10 }}>⭐ {e}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── ACHIEVEMENTS ── */}
      {(achieve.items || []).length > 0 && (
        <section id="achievements" className="section">
          <div className="container">
            <div style={{ textAlign: 'center', marginBottom: 48 }}>
              <p style={{ color: theme.primary, fontWeight: 700, fontSize: 13, letterSpacing: 2, marginBottom: 12 }}>ACHIEVEMENTS</p>
              <h2 className="section-title">Our Pride & Glory</h2>
            </div>
            <div className="grid-3">
              {(achieve.items || []).map((item: any, i: number) => (
                <div key={i} className="card" style={{ textAlign: 'center' }}>
                  <span style={{ fontSize: 40 }}>{item.icon || '🏆'}</span>
                  <p style={{ fontWeight: 900, fontSize: 16, marginTop: 12 }}>{item.title}</p>
                  <p style={{ color: theme.primary, fontWeight: 700, fontSize: 13, marginTop: 4 }}>{item.year}</p>
                  <p style={{ color: '#64748b', fontSize: 13, marginTop: 8 }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── NEWS ── */}
      {news.length > 0 && (
        <section id="news" className="section section-alt">
          <div className="container">
            <div style={{ textAlign: 'center', marginBottom: 48 }}>
              <p style={{ color: theme.primary, fontWeight: 700, fontSize: 13, letterSpacing: 2, marginBottom: 12 }}>LATEST</p>
              <h2 className="section-title">News & Events</h2>
            </div>
            <div className="grid-3">
              {news.slice(0, 3).map((n: any) => (
                <div key={n.id} className="card">
                  {n.image_url && <img src={n.image_url} alt={n.title} style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 10, marginBottom: 16 }} />}
                  <span className="badge" style={{ background: `${theme.primary}15`, color: theme.primary, marginBottom: 12, fontSize: 11 }}>{n.category}</span>
                  <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8, lineHeight: 1.4 }}>{n.title}</h3>
                  <p style={{ color: '#64748b', fontSize: 13, lineHeight: 1.6 }}>{n.excerpt || n.content?.slice(0, 100)}...</p>
                  <p style={{ color: '#94a3b8', fontSize: 11, marginTop: 12, fontWeight: 600 }}>{new Date(n.published_at).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── CONTACT ── */}
      <section id="contact" className="section" style={{ background: theme.secondary }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <p style={{ color: 'rgba(255,255,255,.6)', fontWeight: 700, fontSize: 13, letterSpacing: 2, marginBottom: 12 }}>GET IN TOUCH</p>
            <h2 style={{ fontSize: 30, fontWeight: 900, color: '#fff', marginBottom: 12 }}>Contact Us</h2>
          </div>
          <div className="grid-3">
            {[
              { icon: '📍', label: 'Address', val: school.address || school.county || 'Kenya' },
              { icon: '📞', label: 'Phone', val: school.phone || '+254 700 000 000' },
              { icon: '✉️', label: 'Email', val: school.email || 'info@school.ac.ke' },
            ].map((c, i) => (
              <div key={i} style={{ textAlign: 'center', padding: 32, background: 'rgba(255,255,255,.08)', borderRadius: 16, backdropFilter: 'blur(10px)' }}>
                <p style={{ fontSize: 36, marginBottom: 12 }}>{c.icon}</p>
                <p style={{ color: 'rgba(255,255,255,.6)', fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>{c.label}</p>
                <p style={{ color: '#fff', fontWeight: 600, fontSize: 15 }}>{c.val}</p>
              </div>
            ))}
          </div>
          {contact.maps_url && (
            <div style={{ marginTop: 40, borderRadius: 16, overflow: 'hidden', height: 300 }}>
              <iframe src={contact.maps_url} width="100%" height="300" style={{ border: 0 }} allowFullScreen loading="lazy" />
            </div>
          )}
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: '#020617', padding: '32px 0' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <p style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>{school.school_name}</p>
            <p style={{ color: '#475569', fontSize: 12, marginTop: 4 }}>© {new Date().getFullYear()} All rights reserved</p>
          </div>
          <div style={{ display: 'flex', gap: 24 }}>
            {['Home','About','Academics','News','Contact'].map(l => (
              <a key={l} href={`#${l.toLowerCase()}`} style={{ color: '#64748b', fontSize: 13, textDecoration: 'none', fontWeight: 600 }}>{l}</a>
            ))}
          </div>
          <div style={{ padding: '6px 14px', background: '#0f172a', borderRadius: 8, border: '1px solid #1e293b' }}>
            <p style={{ color: '#475569', fontSize: 11, fontWeight: 600 }}>Powered by <span style={{ color: '#6366f1' }}>APSIMS</span></p>
          </div>
        </div>
      </footer>
    </>
  );
}
