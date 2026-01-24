import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
});

const signupSchema = z.object({
  fullName: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
});

type TabType = 'login' | 'signup';

export default function Auth() {
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('login');
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [signupData, setSignupData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Change theme-color to green for auth page
  useEffect(() => {
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    const originalColor = metaThemeColor?.getAttribute('content');

    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', '#2db4af');
    }

    // Also set body background for overscroll
    document.body.style.backgroundColor = '#2db4af';
    document.documentElement.style.backgroundColor = '#2db4af';

    return () => {
      if (metaThemeColor && originalColor) {
        metaThemeColor.setAttribute('content', originalColor);
      }
      document.body.style.backgroundColor = '';
      document.documentElement.style.backgroundColor = '';
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = loginSchema.safeParse(loginData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);
    const { error } = await signIn(loginData.email, loginData.password);
    setIsLoading(false);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao entrar',
        description: error.message === 'Invalid login credentials'
          ? 'E-mail ou senha incorretos'
          : error.message,
      });
    } else {
      toast({
        title: 'Login realizado',
        description: 'Você foi autenticado com sucesso!',
      });
      navigate('/dashboard');
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = signupSchema.safeParse(signupData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);
    const { error } = await signUp(signupData.email, signupData.password, signupData.fullName);
    setIsLoading(false);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao criar conta',
        description: error.message.includes('already registered')
          ? 'Este e-mail já está cadastrado'
          : error.message,
      });
    } else {
      toast({
        title: 'Conta criada!',
        description: 'Você foi conectado automaticamente.',
      });
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden px-4 py-8 bg-[#2db4af]">
      {/* Subtle gradient overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(135deg, rgba(45, 180, 175, 0.95) 0%, rgba(40, 163, 158, 0.95) 100%)',
        }}
      />

      <div className="w-full max-w-[380px] relative z-10">
        {/* Logo & Brand */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center mb-4">
            <img
              src="/logo-sidebar.png"
              alt="T3ntaculos"
              className="h-40 w-auto object-contain"
            />
          </div>
          <p className="text-sm text-white/80 tracking-wide font-medium">
            Ferramenta interna de gestão
          </p>
        </div>

        {/* Card - Glassmorphism style */}
        <div
          className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 sm:p-8"
          style={{
            boxShadow: '0 8px 60px rgba(0, 0, 0, 0.08), 0 2px 20px rgba(45, 180, 175, 0.06)',
          }}
        >
          {/* Tabs - Centered */}
          <div className="flex justify-center gap-6 mb-8 relative">
            <button
              type="button"
              onClick={() => setActiveTab('login')}
              className={`
                relative pb-2 text-sm font-medium transition-colors duration-150
                ${activeTab === 'login'
                  ? 'text-[#2db4af]'
                  : 'text-gray-400 hover:text-gray-500'
                }
              `}
            >
              Entrar
              {activeTab === 'login' && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#2db4af] rounded-full" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('signup')}
              className={`
                relative pb-2 text-sm font-medium transition-colors duration-150
                ${activeTab === 'signup'
                  ? 'text-[#2db4af]'
                  : 'text-gray-400 hover:text-gray-500'
                }
              `}
            >
              Criar conta
              {activeTab === 'signup' && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#2db4af] rounded-full" />
              )}
            </button>
          </div>

          {/* Forms */}
          {activeTab === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label
                  htmlFor="login-email"
                  className="text-[11px] font-medium text-gray-400 uppercase tracking-wider"
                >
                  E-MAIL
                </Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="seu@email.com"
                  value={loginData.email}
                  onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                  className="h-11 rounded-lg border-gray-200 bg-white placeholder:text-gray-300 text-gray-700 transition-all duration-150 focus:border-[#2db4af] focus:ring-2 focus:ring-[#2db4af]/10"
                />
                {errors.email && (
                  <p className="text-[11px] text-destructive mt-1">{errors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="login-password"
                  className="text-[11px] font-medium text-gray-400 uppercase tracking-wider"
                >
                  SENHA
                </Label>
                <Input
                  id="login-password"
                  type="password"
                  placeholder="••••••••"
                  value={loginData.password}
                  onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                  className="h-11 rounded-lg border-gray-200 bg-white placeholder:text-gray-300 text-gray-700 transition-all duration-150 focus:border-[#2db4af] focus:ring-2 focus:ring-[#2db4af]/10"
                />
                {errors.password && (
                  <p className="text-[11px] text-destructive mt-1">{errors.password}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-11 rounded-full font-medium text-sm mt-4 bg-[#2db4af] hover:bg-[#28a39e] text-white transition-all duration-150 shadow-sm hover:shadow-md"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Entrar'
                )}
              </Button>

              <div className="text-center mt-4">
                <Link
                  to="/forgot-password"
                  className="text-sm text-gray-600 hover:text-[#2db4af] transition-colors"
                >
                  Esqueci minha senha
                </Link>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label
                  htmlFor="signup-name"
                  className="text-[11px] font-medium text-gray-400 uppercase tracking-wider"
                >
                  NOME COMPLETO
                </Label>
                <Input
                  id="signup-name"
                  type="text"
                  placeholder="Seu nome"
                  value={signupData.fullName}
                  onChange={(e) => setSignupData({ ...signupData, fullName: e.target.value })}
                  className="h-11 rounded-lg border-gray-200 bg-white placeholder:text-gray-300 text-gray-700 transition-all duration-150 focus:border-[#2db4af] focus:ring-2 focus:ring-[#2db4af]/10"
                />
                {errors.fullName && (
                  <p className="text-[11px] text-destructive mt-1">{errors.fullName}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="signup-email"
                  className="text-[11px] font-medium text-gray-400 uppercase tracking-wider"
                >
                  E-MAIL
                </Label>
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="seu@email.com"
                  value={signupData.email}
                  onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                  className="h-11 rounded-lg border-gray-200 bg-white placeholder:text-gray-300 text-gray-700 transition-all duration-150 focus:border-[#2db4af] focus:ring-2 focus:ring-[#2db4af]/10"
                />
                {errors.email && (
                  <p className="text-[11px] text-destructive mt-1">{errors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="signup-password"
                  className="text-[11px] font-medium text-gray-400 uppercase tracking-wider"
                >
                  SENHA
                </Label>
                <Input
                  id="signup-password"
                  type="password"
                  placeholder="••••••••"
                  value={signupData.password}
                  onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                  className="h-11 rounded-lg border-gray-200 bg-white placeholder:text-gray-300 text-gray-700 transition-all duration-150 focus:border-[#2db4af] focus:ring-2 focus:ring-[#2db4af]/10"
                />
                {errors.password && (
                  <p className="text-[11px] text-destructive mt-1">{errors.password}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="signup-confirm"
                  className="text-[11px] font-medium text-gray-400 uppercase tracking-wider"
                >
                  CONFIRMAR SENHA
                </Label>
                <Input
                  id="signup-confirm"
                  type="password"
                  placeholder="••••••••"
                  value={signupData.confirmPassword}
                  onChange={(e) => setSignupData({ ...signupData, confirmPassword: e.target.value })}
                  className="h-11 rounded-lg border-gray-200 bg-white placeholder:text-gray-300 text-gray-700 transition-all duration-150 focus:border-[#2db4af] focus:ring-2 focus:ring-[#2db4af]/10"
                />
                {errors.confirmPassword && (
                  <p className="text-[11px] text-destructive mt-1">{errors.confirmPassword}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-11 rounded-full font-medium text-sm mt-4 bg-[#2db4af] hover:bg-[#28a39e] text-white transition-all duration-150 shadow-sm hover:shadow-md"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Criar conta'
                )}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
