import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { Loader2, ArrowLeft, CheckCircle2, X, AlertCircle } from 'lucide-react';
import { isValidCPF, formatCPFInput, onlyNumbers } from '@/utils/validators';
import { getPreRegisteredEmployee } from '@/utils/auth-helpers';
import { supabase } from '@/lib/supabase';

const loginSchema = z.object({
  identifier: z.string().min(3, 'Digite CPF, e-mail ou telefone'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
});

const signupSchema = z.object({
  cpf: z.string().refine((val) => isValidCPF(val), 'CPF inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
});

type TabType = 'login' | 'signup';
type SignupStep = 'cpf' | 'password';

// Função para mascarar email: ab***@ex*****.com
function maskEmail(email: string): string {
  const [localPart, domain] = email.split('@');
  if (!localPart || !domain) return email;

  // Primeiras 2 letras do local + ***
  const maskedLocal = localPart.substring(0, 2) + '***';

  // Primeiras 2 letras do domínio + ***** + extensão
  const domainParts = domain.split('.');
  const maskedDomainName = domainParts[0].substring(0, 2) + '*****';
  const extension = domainParts.slice(1).join('.');

  return `${maskedLocal}@${maskedDomainName}.${extension}`;
}

export default function Auth() {
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('login');
  const [signupStep, setSignupStep] = useState<SignupStep>('cpf');

  const [loginData, setLoginData] = useState({ identifier: '', password: '' });
  const [signupData, setSignupData] = useState({
    cpf: '',
    password: '',
    confirmPassword: '',
  });
  const [employeeData, setEmployeeData] = useState<any>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Toast inline - controlado manualmente
  const [toastMessage, setToastMessage] = useState<{title: string, description: string, variant: 'default' | 'destructive'} | null>(null);

  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Auto-dismiss toast
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Change theme-color to green for auth page
  useEffect(() => {
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    const originalColor = metaThemeColor?.getAttribute('content');

    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', '#2db4af');
    }

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

    try {
      const { identifier, password } = loginData;
      let emailToLogin = identifier;
      let identifierType = 'email';
      let identifierFound = false;

      // Detectar tipo de identificador
      const cleanIdentifier = onlyNumbers(identifier);

      console.log('🔍 Login attempt:', { identifier, cleanIdentifier });

      // Se contém @ é email
      if (identifier.includes('@')) {
        identifierType = 'email';
        emailToLogin = identifier;
        identifierFound = true; // Email sempre é válido para tentar login
        console.log('📧 Detected as email');
      }
      // Se tem 11 dígitos numéricos, pode ser CPF ou telefone
      else if (cleanIdentifier.length === 11) {
        console.log('🔢 11 digits detected, trying CPF first...');
        // Tentar como CPF primeiro
        const { data: emailFromCPF, error: cpfError } = await supabase
          .rpc('get_email_by_cpf', { cpf_input: cleanIdentifier });

        console.log('CPF lookup result:', { emailFromCPF, cpfError });

        if (!cpfError && emailFromCPF) {
          identifierType = 'CPF';
          emailToLogin = emailFromCPF;
          identifierFound = true;
          console.log('✅ Found by CPF');
        } else {
          console.log('❌ Not found by CPF, trying as phone...');
          // Se não encontrou por CPF, tentar como telefone
          const { data: emailFromPhone, error: phoneError } = await supabase
            .rpc('get_email_by_phone', { phone_input: cleanIdentifier });

          console.log('Phone lookup result:', { emailFromPhone, phoneError });

          if (!phoneError && emailFromPhone) {
            identifierType = 'telefone';
            emailToLogin = emailFromPhone;
            identifierFound = true;
            console.log('✅ Found by phone');
          } else {
            console.log('❌ Not found by phone either');
          }
        }
      }
      // Se tem 10 dígitos, é telefone
      else if (cleanIdentifier.length === 10) {
        console.log('📱 10 digits detected, trying as phone...');
        const { data: emailFromPhone, error: phoneError } = await supabase
          .rpc('get_email_by_phone', { phone_input: cleanIdentifier });

        console.log('Phone lookup result:', { emailFromPhone, phoneError });

        if (!phoneError && emailFromPhone) {
          identifierType = 'telefone';
          emailToLogin = emailFromPhone;
          identifierFound = true;
          console.log('✅ Found by phone');
        } else {
          console.log('❌ Not found by phone');
        }
      }

      console.log('Final state:', { identifierFound, identifierType, emailToLogin });

      // Se não conseguiu converter para email e não é email
      if (!identifierFound || !emailToLogin.includes('@')) {
        let errorMessage = '';

        if (cleanIdentifier.length === 11) {
          errorMessage = 'CPF ou telefone não encontrado no sistema ou sem cadastro.';
        } else if (cleanIdentifier.length === 10) {
          errorMessage = 'Telefone não encontrado no sistema ou sem cadastro.';
        } else if (identifier.includes('@')) {
          errorMessage = 'Email não encontrado no sistema ou sem cadastro.';
        } else {
          errorMessage = 'CPF, telefone ou email não encontrado no sistema ou sem cadastro.';
        }

        console.log('🚫 Identifier not found, showing error:', errorMessage);

        setToastMessage({
          variant: 'destructive',
          title: 'Dados não encontrados',
          description: errorMessage,
        });

        setIsLoading(false);
        return;
      }

      console.log('🔐 Attempting login with email:', emailToLogin);
      const { error } = await signIn(emailToLogin, password);

      if (error) {
        setToastMessage({
          variant: 'destructive',
          title: 'Erro ao entrar',
          description: error.message === 'Invalid login credentials'
            ? `${identifierType === 'email' ? 'Email' : identifierType.toUpperCase()} ou senha incorretos`
            : error.message,
        });
      } else {
        setToastMessage({
          variant: 'default',
          title: 'Login realizado',
          description: `Bem-vindo de volta! (Login via ${identifierType})`,
        });
        navigate('/dashboard');
      }
    } catch (error: any) {
      console.error('Erro no login:', error);
      setToastMessage({
        variant: 'destructive',
        title: 'Erro ao entrar',
        description: error.message || 'Ocorreu um erro ao fazer login',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCPFSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!isValidCPF(signupData.cpf)) {
      setErrors({ cpf: 'CPF inválido' });
      return;
    }

    setIsLoading(true);

    try {
      const cleanCPF = onlyNumbers(signupData.cpf);

      // Verificar se já existe uma conta com este CPF
      const { data: emailData } = await supabase
        .rpc('get_email_by_cpf', { cpf_input: cleanCPF });

      if (emailData) {
        // Se encontrou email, significa que já existe conta criada
        const maskedEmailAddress = maskEmail(emailData);

        setToastMessage({
          variant: 'destructive',
          title: 'Conta já existe',
          description: `Este CPF já possui uma conta vinculada ao email ${maskedEmailAddress}. Use a opção "Entrar".`,
        });
        setIsLoading(false);

        // Mudar para aba de login após 1 segundo
        setTimeout(() => {
          setActiveTab('login');
          setLoginData({ ...loginData, identifier: signupData.cpf });
        }, 1000);
        return;
      }

      // Se não encontrou email, buscar dados do colaborador pré-cadastrado
      const employee = await getPreRegisteredEmployee(signupData.cpf);

      if (!employee) {
        setToastMessage({
          variant: 'destructive',
          title: 'CPF não encontrado',
          description: 'Este CPF não está cadastrado no sistema. Entre em contato com o administrador.',
        });
        setIsLoading(false);
        return;
      }

      // CPF válido e sem conta criada
      setEmployeeData(employee);
      setSignupStep('password');
      setToastMessage({
        variant: 'default',
        title: 'CPF encontrado!',
        description: `Bem-vindo, ${employee.full_name}! Agora crie sua senha de acesso.`,
      });
    } catch (error: any) {
      setToastMessage({
        variant: 'destructive',
        title: 'Erro',
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
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

    if (!employeeData) {
      setToastMessage({
        variant: 'destructive',
        title: 'Erro',
        description: 'Dados do colaborador não encontrados.',
      });
      return;
    }

    setIsLoading(true);

    try {
      // Criar conta no Supabase Auth
      // Como não temos o email ainda, vamos usar CPF@t3ntaculos.internal temporariamente
      // e depois atualizar para o email real se necessário
      const tempEmail = employeeData.email || `${onlyNumbers(signupData.cpf)}@t3ntaculos.internal`;

      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: tempEmail,
        password: signupData.password,
        options: {
          data: {
            full_name: employeeData.full_name,
          },
        },
      });

      if (signUpError) throw signUpError;

      if (!authData.user) {
        throw new Error('Erro ao criar usuário');
      }

      // Atualizar o perfil com o ID do usuário criado
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ id: authData.user.id })
        .eq('cpf', onlyNumbers(signupData.cpf));

      if (updateError) throw updateError;

      // Login automático já foi feito pelo signUp
      setToastMessage({
        variant: 'default',
        title: 'Conta criada com sucesso!',
        description: 'Bem-vindo ao T3ntaculos!',
      });

      navigate('/dashboard');
    } catch (error: any) {
      setToastMessage({
        variant: 'destructive',
        title: 'Erro ao criar conta',
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToCPF = () => {
    setSignupStep('cpf');
    setEmployeeData(null);
    setSignupData({ ...signupData, password: '', confirmPassword: '' });
    setErrors({});
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden px-4 py-8 bg-[#2db4af]">
        {/* Toast Inline */}
        {toastMessage && (
          <div
            className="fixed z-[100] flex max-h-screen w-full flex-col-reverse gap-2 p-4 md:max-w-[420px]"
            style={{
              top: 'env(safe-area-inset-top, 1rem)',
              right: '0',
              paddingTop: 'max(env(safe-area-inset-top), 1rem)',
            }}
          >
            <div
              className={`group pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-xl border p-4 shadow-lg transition-all animate-in slide-in-from-top-full ${
                toastMessage.variant === 'destructive'
                  ? 'bg-red-50 border-red-200 text-red-900'
                  : 'bg-white border-[#2db4af]/20 text-gray-900'
              }`}
            >
              <div className="flex-shrink-0 mt-0.5">
                {toastMessage.variant === 'destructive' ? (
                  <AlertCircle className="h-5 w-5 text-red-500" />
                ) : (
                  <CheckCircle2 className="h-5 w-5 text-[#2db4af]" />
                )}
              </div>
              <div className="flex-1 grid gap-1">
                {toastMessage.title && (
                  <div className="text-sm font-semibold leading-tight">
                    {toastMessage.title}
                  </div>
                )}
                {toastMessage.description && (
                  <div className="text-sm opacity-80 leading-tight">
                    {toastMessage.description}
                  </div>
                )}
              </div>
              <button
                onClick={() => setToastMessage(null)}
                className={`flex-shrink-0 rounded-md p-1 transition-colors ${
                  toastMessage.variant === 'destructive'
                    ? 'text-red-400 hover:text-red-600 hover:bg-red-100'
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                }`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

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
              onClick={() => {
                setActiveTab('login');
                setErrors({});
              }}
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
              onClick={() => {
                setActiveTab('signup');
                setSignupStep('cpf');
                setEmployeeData(null);
                setErrors({});
              }}
              className={`
                relative pb-2 text-sm font-medium transition-colors duration-150
                ${activeTab === 'signup'
                  ? 'text-[#2db4af]'
                  : 'text-gray-400 hover:text-gray-500'
                }
              `}
            >
              Primeiro acesso
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
                  htmlFor="login-identifier"
                  className="text-[11px] font-medium text-gray-400 uppercase tracking-wider"
                >
                  CPF, E-MAIL OU TELEFONE
                </Label>
                <Input
                  id="login-identifier"
                  type="text"
                  placeholder="Digite seu CPF, e-mail ou telefone"
                  value={loginData.identifier}
                  onChange={(e) => setLoginData({ ...loginData, identifier: e.target.value })}
                  className="h-11 rounded-lg border-gray-200 bg-white placeholder:text-gray-300 text-gray-700 transition-all duration-150 focus:border-[#2db4af] focus:ring-2 focus:ring-[#2db4af]/10"
                />
                {errors.identifier && (
                  <p className="text-[11px] text-destructive mt-1">{errors.identifier}</p>
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
            </form>
          ) : signupStep === 'cpf' ? (
            <form onSubmit={handleCPFSubmit} className="space-y-5">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-800">
                  <strong>Primeiro acesso?</strong> Digite seu CPF para criar sua conta.
                </p>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="signup-cpf"
                  className="text-[11px] font-medium text-gray-400 uppercase tracking-wider"
                >
                  CPF
                </Label>
                <Input
                  id="signup-cpf"
                  type="text"
                  placeholder="000.000.000-00"
                  value={signupData.cpf}
                  onChange={(e) => {
                    const formatted = formatCPFInput(e.target.value);
                    setSignupData({ ...signupData, cpf: formatted });
                  }}
                  className="h-11 rounded-lg border-gray-200 bg-white placeholder:text-gray-300 text-gray-700 transition-all duration-150 focus:border-[#2db4af] focus:ring-2 focus:ring-[#2db4af]/10"
                  maxLength={14}
                />
                {errors.cpf && (
                  <p className="text-[11px] text-destructive mt-1">{errors.cpf}</p>
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
                  'Continuar'
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={handlePasswordSubmit} className="space-y-5">
              {/* Colaborador encontrado */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-green-900">
                      Colaborador encontrado!
                    </p>
                    <p className="text-sm text-green-700 mt-1">
                      {employeeData?.full_name}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="signup-password"
                  className="text-[11px] font-medium text-gray-400 uppercase tracking-wider"
                >
                  CRIE SUA SENHA
                </Label>
                <Input
                  id="signup-password"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
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
                  placeholder="Digite a senha novamente"
                  value={signupData.confirmPassword}
                  onChange={(e) => setSignupData({ ...signupData, confirmPassword: e.target.value })}
                  className="h-11 rounded-lg border-gray-200 bg-white placeholder:text-gray-300 text-gray-700 transition-all duration-150 focus:border-[#2db4af] focus:ring-2 focus:ring-[#2db4af]/10"
                />
                {errors.confirmPassword && (
                  <p className="text-[11px] text-destructive mt-1">{errors.confirmPassword}</p>
                )}
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  onClick={handleBackToCPF}
                  variant="outline"
                  className="flex-1 h-11 rounded-full font-medium text-sm"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar
                </Button>
                <Button
                  type="submit"
                  className="flex-1 h-11 rounded-full font-medium text-sm bg-[#2db4af] hover:bg-[#28a39e] text-white transition-all duration-150 shadow-sm hover:shadow-md"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Criar conta'
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>
        </div>
      </div>
  );
}
