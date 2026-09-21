'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import toast, { Toaster } from 'react-hot-toast';
import { FiUser, FiLock, FiLogIn, FiEye, FiEyeOff, FiX, FiMail, FiPhone } from 'react-icons/fi';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default function PortalLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [schoolDetails, setSchoolDetails] = useState<any>(null);
  const [sdLoading, setSdLoading] = useState(true);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    sb.from('school_details').select('school_name,school_motto,logo_url,phone_number,email,postal_address').limit(1).maybeSingle()
      .then(({ data }) => { setSchoolDetails(data); setSdLoading(false); });
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return toast.error('Enter username & password', { icon: '⚠️' });
    setLoading(true);
    try {
      const res = await fetch('/api/auth/portal-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Login failed', { icon: '⚠️', duration: 6000 }); setLoading(false); return; }
      localStorage.setItem('portal_session', JSON.stringify({
        id: data.user.id,
        user_type: data.user.user_type_portal,
        full_name: data.user.full_name,
        student_id: data.user.student_id,
        student: data.student,
        avatar: data.user.avatar_url,
      }));
      toast.success(`👋 Welcome, ${data.user.full_name}!`);
      if (data.user.user_type_portal === 'parent') router.push('/portal/parent');
      else router.push('/portal/student');
    } catch (err: any) { toast.error(err.message || 'Login failed'); }
    setLoading(false);
  };

  const schoolName = schoolDetails?.school_name || 'APSIMS School';
  const schoolMotto = schoolDetails?.school_motto || 'Excellence in Education';

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 40%, #312e81 100%)' }}>
      <Toaster position="top-right" />

      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-20 blur-3xl" style={{ background: 'radial-gradient(circle, #7c3aed, transparent)' }} />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full opacity-20 blur-3xl" style={{ background: 'radial-gradient(circle, #2563eb, transparent)' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-5 blur-3xl" style={{ background: 'radial-gradient(circle, #fff, transparent)' }} />
        {/* Floating icons */}
        {['📚', '🎓', '✏️', '📐', '🔬', '🌍'].map((icon, i) => (
          <div key={i} className="absolute text-2xl opacity-10 select-none"
            style={{ top: `${10 + i * 15}%`, left: `${5 + i * 16}%`, animation: `float ${3 + i * 0.5}s ease-in-out infinite alternate` }}>
            {icon}
          </div>
        ))}
      </div>

      <div className="relative w-full max-w-md">
        {/* School Branding */}
        <div className="text-center mb-8">
          {sdLoading ? (
            <div className="w-20 h-20 rounded-3xl mx-auto mb-4 animate-pulse" style={{ background: 'rgba(255,255,255,0.1)' }} />
          ) : schoolDetails?.logo_url ? (
            <img src={schoolDetails.logo_url} alt="School Logo" className="w-20 h-20 rounded-3xl mx-auto mb-4 object-cover shadow-2xl border-2 border-white/20" />
          ) : (
            <div className="w-20 h-20 rounded-3xl mx-auto flex items-center justify-center text-4xl shadow-2xl border-2 border-white/20 mb-4"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#2563eb)' }}>🏫</div>
          )}
          {sdLoading ? (
            <div className="space-y-2">
              <div className="h-6 w-48 mx-auto rounded-lg animate-pulse" style={{ background: 'rgba(255,255,255,0.1)' }} />
              <div className="h-3 w-36 mx-auto rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.06)' }} />
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-black text-white" style={{ letterSpacing: '-0.03em' }}>{schoolName}</h1>
              <p className="text-sm text-blue-300 mt-1 italic">"{schoolMotto}"</p>
            </>
          )}
          <div className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full text-xs font-bold"
            style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}>
            🔐 Parent &amp; Student Self-Service Portal
          </div>
        </div>

        {/* Login Card */}
        <div className="rounded-3xl overflow-hidden shadow-2xl border border-white/10"
          style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(20px)' }}>
          <div className="px-8 pt-8 pb-2">
            <h2 className="text-lg font-black text-white mb-1">Sign In</h2>
            <p className="text-xs text-blue-300 mb-6">Use credentials provided by school administration</p>

            <form onSubmit={handleLogin} className="space-y-4">
              {/* Username */}
              <div>
                <label className="text-xs font-bold mb-1.5 block uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.5)' }}>Username</label>
                <div className="relative">
                  <FiUser className="absolute left-4 top-1/2 -translate-y-1/2" size={15} style={{ color: 'rgba(255,255,255,0.3)' }} />
                  <input
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 rounded-xl text-sm text-white placeholder-white/30 focus:outline-none transition-all"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', caretColor: '#a78bfa' }}
                    onFocus={e => { e.target.style.background = 'rgba(255,255,255,0.1)'; e.target.style.borderColor = '#7c3aed'; }}
                    onBlur={e => { e.target.style.background = 'rgba(255,255,255,0.06)'; e.target.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                    placeholder="Enter your username"
                    autoFocus
                    autoComplete="username"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="text-xs font-bold mb-1.5 block uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.5)' }}>Password</label>
                <div className="relative">
                  <FiLock className="absolute left-4 top-1/2 -translate-y-1/2" size={15} style={{ color: 'rgba(255,255,255,0.3)' }} />
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleLogin(e as any)}
                    className="w-full pl-11 pr-11 py-3.5 rounded-xl text-sm text-white placeholder-white/30 focus:outline-none transition-all"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', caretColor: '#a78bfa' }}
                    onFocus={e => { e.target.style.background = 'rgba(255,255,255,0.1)'; e.target.style.borderColor = '#7c3aed'; }}
                    onBlur={e => { e.target.style.background = 'rgba(255,255,255,0.06)'; e.target.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: 'rgba(255,255,255,0.3)' }}>
                    {showPw ? <FiEyeOff size={15} /> : <FiEye size={15} />}
                  </button>
                </div>
              </div>

              {/* Login Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-black text-white shadow-xl transition-all hover:scale-[1.02] disabled:opacity-50 disabled:scale-100 mt-2"
                style={{ background: loading ? 'rgba(124,58,237,0.5)' : 'linear-gradient(135deg,#7c3aed,#2563eb)', boxShadow: '0 8px 32px rgba(124,58,237,0.4)' }}>
                {loading
                  ? <><div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />Signing In…</>
                  : <><FiLogIn size={15} />Sign In</>}
              </button>
            </form>

            <div className="flex items-center justify-center mt-4">
              <button onClick={() => setShowHelp(true)} className="text-xs font-semibold transition-colors hover:text-blue-200" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Need Help? Contact Admin
              </button>
            </div>
          </div>

          {/* Footer info */}
          <div className="px-8 py-4 mt-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.1)' }}>
            <div className="flex items-center justify-between text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
              <span>🔒 Secured by APSIMS</span>
              <span>© {new Date().getFullYear()} AlphaSchool</span>
            </div>
          </div>
        </div>

        {/* Quick info cards */}
        <div className="mt-6 grid grid-cols-2 gap-3">
          {[
            { icon: '👨‍👩‍👧', title: 'Parents', desc: 'View fees, results & attendance' },
            { icon: '🎓', title: 'Students', desc: 'Access your portal & results' },
          ].map((card, i) => (
            <div key={i} className="rounded-2xl p-4 border border-white/5" style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(10px)' }}>
              <div className="text-2xl mb-2">{card.icon}</div>
              <div className="text-xs font-black text-white">{card.title}</div>
              <div className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{card.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl" style={{ background: 'linear-gradient(135deg,#1e1b4b,#312e81)' }}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-black text-white text-lg">Need Help?</h3>
                <button onClick={() => setShowHelp(false)} className="p-1.5 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-all"><FiX size={16} /></button>
              </div>
              <div className="space-y-3 text-sm text-blue-200">
                <p className="font-semibold text-white">Your login credentials are provided by the school office.</p>
                <div className="space-y-2">
                  <p>📋 <strong className="text-white">Username:</strong> Usually your student's admission number or a code given by the school.</p>
                  <p>🔑 <strong className="text-white">Password:</strong> Set by the school administrator. Ask them to reset it if forgotten.</p>
                </div>
                {(schoolDetails?.phone_number || schoolDetails?.email) && (
                  <div className="mt-4 p-3 rounded-xl space-y-2" style={{ background: 'rgba(255,255,255,0.08)' }}>
                    <p className="text-xs font-bold text-white/70 uppercase tracking-wider">Contact School</p>
                    {schoolDetails.phone_number && (
                      <div className="flex items-center gap-2 text-white"><FiPhone size={13} /><span>{schoolDetails.phone_number}</span></div>
                    )}
                    {schoolDetails.email && (
                      <div className="flex items-center gap-2 text-white"><FiMail size={13} /><span>{schoolDetails.email}</span></div>
                    )}
                  </div>
                )}
              </div>
              <button onClick={() => setShowHelp(false)}
                className="w-full mt-5 py-3 rounded-xl text-sm font-black text-white"
                style={{ background: 'linear-gradient(135deg,#7c3aed,#2563eb)' }}>
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes float { from { transform: translateY(0px) rotate(0deg); } to { transform: translateY(-15px) rotate(5deg); } }
      `}</style>
    </div>
  );
}
