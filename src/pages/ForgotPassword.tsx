import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { Loader2, ArrowLeft } from 'lucide-react';

const forgotPasswordSchema = z.object({
  email: z.string().email('E-mail inválido'),
});

export default function ForgotPassword() {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { resetPassword } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = forgotPasswordSchema.safeParse({ email });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);
    const { error } = await resetPassword(email);
    setIsLoading(false);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao enviar e-mail',
        description: error.message,
      });
    } else {
      setEmailSent(true);
      toast({
        title: 'E-mail enviado!',
        description: 'Verifique sua caixa de entrada para redefinir sua senha.',
      });
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
          <Link
            to="/auth"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 transition-colors mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para login
          </Link>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Esqueci minha senha
          </h2>
          <p className="text-sm text-gray-600 mb-6">
            Digite seu e-mail e enviaremos um link para redefinir sua senha.
          </p>

          {!emailSent ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="text-[11px] font-medium text-gray-400 uppercase tracking-wider"
                >
                  E-MAIL
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 rounded-lg border-gray-200 bg-white placeholder:text-gray-300 text-gray-700 transition-all duration-150 focus:border-[#2db4af] focus:ring-2 focus:ring-[#2db4af]/10"
                />
                {errors.email && (
                  <p className="text-[11px] text-destructive mt-1">{errors.email}</p>
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
                  'Enviar link de recuperação'
                )}
              </Button>
            </form>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-[#2db4af]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-[#2db4af]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                E-mail enviado!
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                Verifique sua caixa de entrada em <strong>{email}</strong> e clique no link para redefinir sua senha.
              </p>
              <Link
                to="/auth"
                className="text-sm text-[#2db4af] hover:text-[#28a39e] font-medium"
              >
                Voltar para o login
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
