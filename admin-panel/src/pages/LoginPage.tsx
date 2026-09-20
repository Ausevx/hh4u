import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Activity, AlertCircle, Loader2, Lock, Mail, Key } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fromPath = (location.state as any)?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    setIsSubmitting(true);
    const result = await login(email.trim(), password);
    setIsSubmitting(false);

    if (result.success) {
      navigate(fromPath, { replace: true });
    } else {
      setErrorMessage(result.error || 'Invalid credentials');
    }
  };

  const handleFillDemoCredentials = () => {
    setEmail('admin@healinghands4u.com');
    setPassword('Admin@123456');
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-[#F7F9FB] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-[#0E7C86] flex items-center justify-center text-white shadow-lg shadow-teal-900/10">
            <Activity className="w-8 h-8" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-[#0F2027]">
          Healing Hands4U
        </h2>
        <p className="mt-1 text-center text-sm font-medium text-[#5C7480]">
          Clinical Knowledge Base Portal
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 shadow-sm rounded-2xl border border-slate-200/80 sm:px-10">
          {errorMessage && (
            <div className="mb-6 rounded-xl bg-[#FFF0EC] p-4 border border-rose-200 flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-[#A14A2A] flex-shrink-0 mt-0.5" />
              <div className="text-sm text-[#A14A2A] font-medium">{errorMessage}</div>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#5C7480] mb-1.5">
                Staff Email Address
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@healinghands4u.com"
                  className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[#0F2027] text-sm focus:outline-none focus:ring-2 focus:ring-[#0E7C86] focus:border-transparent transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#5C7480] mb-1.5">
                Password
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[#0F2027] text-sm focus:outline-none focus:ring-2 focus:ring-[#0E7C86] focus:border-transparent transition-colors"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-xl text-sm font-semibold text-white bg-[#0E7C86] hover:bg-[#0A5C63] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0E7C86] transition-colors shadow-sm disabled:opacity-60 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In to Dashboard'
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col space-y-3">
            <button
              type="button"
              onClick={handleFillDemoCredentials}
              className="w-full flex items-center justify-center py-2 px-3 text-xs font-medium text-[#0E7C86] bg-[#EAF5F6] hover:bg-[#d8edef] rounded-lg transition-colors cursor-pointer"
            >
              <Key className="w-3.5 h-3.5 mr-1.5" />
              Fill Demo Admin Credentials
            </button>
            <p className="text-center text-xs text-[#5C7480]">
              Authorized Clinic Personnel Only • End-to-End Encrypted
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
