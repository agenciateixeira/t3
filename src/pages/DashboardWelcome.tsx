import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function DashboardWelcome() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Bem-vindo ao Tentáculo Flow
              </h1>
              <p className="text-gray-600">
                Olá, {user?.user_metadata?.full_name || user?.email}!
              </p>
            </div>
            <Button
              onClick={handleSignOut}
              variant="outline"
              className="border-[#2db4af] text-[#2db4af] hover:bg-[#2db4af] hover:text-white"
            >
              Sair
            </Button>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div className="p-6 bg-gradient-to-br from-[#2db4af]/10 to-[#2db4af]/5 rounded-xl border border-[#2db4af]/20">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Área Logada
              </h3>
              <p className="text-sm text-gray-600">
                Esta é a área logada do sistema. Os componentes da área logada serão adicionados em breve.
              </p>
            </div>

            <div className="p-6 bg-gradient-to-br from-gray-100 to-gray-50 rounded-xl border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Em Desenvolvimento
              </h3>
              <p className="text-sm text-gray-600">
                Aguardando envio dos códigos da área logada para integração.
              </p>
            </div>

            <div className="p-6 bg-gradient-to-br from-gray-100 to-gray-50 rounded-xl border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Próximos Passos
              </h3>
              <p className="text-sm text-gray-600">
                Integração completa com os módulos existentes do sistema.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
