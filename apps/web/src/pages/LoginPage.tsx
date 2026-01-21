import { useState } from 'react';
import { HardHat, Eye, EyeOff, Lock, Mail, AlertCircle } from 'lucide-react';
import { useUserStore } from '../stores/userStore';
import { useAuditStore } from '../stores/auditStore';

interface LoginPageProps {
  onLogin: () => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const { login, users } = useUserStore();
  const { addLog } = useAuditStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // OPEN ACCESS: Accept any email and password for now
    // Check if user exists, if not create a guest account
    let user = users.find(u => u.email === email);
    
    if (!user) {
      // Create a temporary guest user
      const guestUser = {
        id: Date.now(),
        email: email,
        firstName: email.split('@')[0],
        lastName: 'Guest',
        role: 'Administrator' as const, // Give admin access to everyone
        permissions: ['all'] as string[],
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      
      // Login with the guest credentials
      const loginSuccess = login(email, password, guestUser);
      
      if (loginSuccess) {
        addLog({
          userId: guestUser.id,
          userName: `${guestUser.firstName} ${guestUser.lastName}`,
          userEmail: guestUser.email,
          action: 'LOGIN',
          entityType: 'System',
          details: 'Guest user logged into the system',
        });
        onLogin();
      }
    } else {
      // Existing user - accept any password
      const loginSuccess = login(email, password, user);
      
      if (loginSuccess) {
        addLog({
          userId: user.id,
          userName: `${user.firstName} ${user.lastName}`,
          userEmail: user.email,
          action: 'LOGIN',
          entityType: 'System',
          details: 'User logged into the system',
        });
        onLogin();
      }
    }
    
    setIsLoading(false);
  };

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

          {error && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-800 rounded-lg flex items-center gap-2 text-red-400">
              <AlertCircle size={18} />
              {error}
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

          {/* Open Access Notice */}
          <div className="mt-6 pt-6 border-t border-slate-700">
            <div className="p-3 bg-green-900/30 border border-green-800 rounded-lg">
              <p className="text-sm text-green-400 font-medium mb-1">🔓 Open Access Mode</p>
              <p className="text-xs text-green-500">
                Enter any email and password to access the system. All users are granted Administrator privileges for demonstration purposes.
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
