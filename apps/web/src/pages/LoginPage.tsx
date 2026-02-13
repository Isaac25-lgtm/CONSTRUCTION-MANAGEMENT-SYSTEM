import { useState } from 'react';
import { HardHat, Eye, EyeOff, Lock, Mail, AlertCircle } from 'lucide-react';
import { useUserStore } from '../stores/userStore';

interface LoginPageProps {
  onLogin?: () => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const { login } = useUserStore();
  const [email, setEmail] = useState('admin@buildpro.ug');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    setIsLoading(true);

    // Build a guest user in case the email isn't in the system
    const guestUser = {
      id: Date.now(),
      email,
      firstName: email.split('@')[0],
      lastName: 'User',
      role: 'Administrator' as const,
      isActive: true,
      createdAt: new Date().toISOString().split('T')[0],
    };

    // userStore.login accepts any password for known users,
    // and creates a new user from guestUser for unknown emails
    const success = login(email, password, guestUser);

    if (success) {
      if (onLogin) onLogin();
    } else {
      setLocalError('Login failed. Please try again.');
    }
    setIsLoading(false);
  };

  const displayError = localError;

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl mb-4">
            <HardHat size={40} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">BuildPro</h1>
          <p className="text-slate-400 mt-1">Construction Project Management</p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-800 rounded-2xl p-8 shadow-xl border border-slate-700">

          <h2 className="text-xl font-semibold text-white mb-6">Sign in to your account</h2>

          {displayError && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-800 rounded-lg flex items-center gap-2 text-red-400">
              <AlertCircle size={18} />
              {displayError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Demo Credentials Notice */}
          <div className="mt-6 pt-6 border-t border-slate-700">
            <div className="p-3 bg-blue-900/30 border border-blue-800 rounded-lg">
              <p className="text-sm text-blue-400 font-medium mb-1">🔓 Open Access Mode</p>
              <p className="text-xs text-blue-500">
                Enter any email &amp; password to sign in.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-slate-500 text-sm mt-6">
          © 2025 BuildPro - Uganda's Construction PM Solution
        </p>
      </div>
    </div>
  );
}
