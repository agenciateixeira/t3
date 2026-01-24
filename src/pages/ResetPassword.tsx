import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToastContext } from '@/contexts/ToastContext';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';

const resetPasswordSchema = z.object({
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
});

export default function ResetPassword() {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { updatePassword } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToastContext();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = resetPasswordSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);
    const { error } = await updatePassword(formData.password);
    setIsLoading(false);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao redefinir senha',
        description: error.message,
      });
    } else {
      toast({
        title: 'Senha redefinida!',
        description: 'Sua senha foi alterada com sucesso.',
      });
      navigate('/auth');
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
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Redefinir senha
          </h2>
          <p className="text-sm text-gray-600 mb-6">
            Digite sua nova senha abaixo.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label
                htmlFor="password"
                className="text-[11px] font-medium text-gray-400 uppercase tracking-wider"
              >
                NOVA SENHA
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="h-11 rounded-lg border-gray-200 bg-white placeholder:text-gray-300 text-gray-700 transition-all duration-150 focus:border-[#2db4af] focus:ring-2 focus:ring-[#2db4af]/10"
              />
              {errors.password && (
                <p className="text-[11px] text-destructive mt-1">{errors.password}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="confirmPassword"
                className="text-[11px] font-medium text-gray-400 uppercase tracking-wider"
              >
                CONFIRMAR NOVA SENHA
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
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
                'Redefinir senha'
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
