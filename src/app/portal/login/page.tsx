'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiUser, FiLock, FiLogIn, FiEye, FiEyeOff } from 'react-icons/fi';

export default function PortalLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return toast.error('🚫 Enter username & password!', { icon: '⚠️' });
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('school_portal_users')
        .select('*, school_students(id, first_name, last_name, admission_number, form_id, status, school_forms(id, form_name))')
        .eq('username', username.trim())
        .eq('is_active', true)
        .single();

      if (error || !data) { toast.error('❌ Account not found or inactive', { icon: '🔒' }); setLoading(false); return; }

      // Password verification (direct comparison — upgrade to bcrypt in production)
      if (data.password_hash !== password) {
        toast.error('❌ Invalid credentials', { icon: '🔒' }); setLoading(false); return;
      }

      // Update last login
      await supabase.from('school_portal_users').update({
        last_login: new Date().toISOString(),
        login_count: (data.login_count || 0) + 1,
      }).eq('id', data.id);

      // Log activity
      await supabase.from('school_portal_activity_logs').insert([{
        portal_user_id: data.id,
        action: 'login',
        details: { user_type: data.user_type },
      }]);

      // Store session
      localStorage.setItem('portal_session', JSON.stringify({
        id: data.id,
        user_type: data.user_type,
        full_name: data.full_name || data.username,
        student_id: data.linked_student_id,
        student: data.school_students,
        avatar: data.avatar_url,
      }));

      toast.success(`👋 Welcome, ${data.full_name || data.username}!`, { icon: '✅' });

      if (data.user_type === 'parent') {
        router.push('/portal/parent');
      } else {
        router.push('/portal/student');
      }
    } catch (err: any) {
      toast.error(err.message);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
      <div className="w-full max-w-md">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-3xl mx-auto flex items-center justify-center text-4xl shadow-xl" style={{ background: 'linear-gradient(135deg,#2563eb,#7c3aed)' }}>🏫</div>
          <h1 className="text-2xl font-extrabold text-gray-900 mt-4" style={{ fontFamily: 'Outfit,sans-serif', letterSpacing: '-0.03em' }}>AlphaSchool Portal</h1>
          <p className="text-sm text-gray-500 mt-1">Parent & Student Self-Service</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="p-8 space-y-5">
            <div>
              <label className="text-xs font-bold text-gray-600 mb-1.5 block uppercase tracking-wider">Username</label>
              <div className="relative">
                <FiUser className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16}/>
                <input
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-blue-400 transition-all"
                  placeholder="Enter your username"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-600 mb-1.5 block uppercase tracking-wider">Password</label>
              <div className="relative">
                <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16}/>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLogin(e)}
                  className="w-full pl-11 pr-11 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-blue-400 transition-all"
                  placeholder="Enter your password"
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPw ? <FiEyeOff size={16}/> : <FiEye size={16}/>}
                </button>
              </div>
            </div>

            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white shadow-lg transition-all hover:shadow-xl hover:scale-[1.02] disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg,#2563eb,#7c3aed)' }}
            >
              {loading ? <div className="spinner" style={{ width: 18, height: 18 }}/> : <FiLogIn size={16}/>}
              Sign In
            </button>

            <div className="text-center">
              <button className="text-xs text-blue-600 hover:underline">Forgot Password?</button>
            </div>
          </div>

          <div className="px-8 py-4 bg-gray-50 border-t border-gray-100 text-center">
            <p className="text-[10px] text-gray-400">Contact school admin for portal access credentials</p>
          </div>
        </div>

        <p className="text-center text-[10px] text-gray-400 mt-6">© 2025 AlphaSchool Management System</p>
      </div>
    </div>
  );
}
