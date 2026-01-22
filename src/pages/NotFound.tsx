import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Home } from 'lucide-react';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center">
        <h1 className="text-9xl font-bold text-[#2db4af]">404</h1>
        <h2 className="text-3xl font-semibold text-gray-900 mt-4 mb-2">
          Página não encontrada
        </h2>
        <p className="text-gray-600 mb-8">
          Desculpe, não conseguimos encontrar a página que você está procurando.
        </p>
        <Button
          onClick={() => navigate('/dashboard')}
          className="bg-[#2db4af] hover:bg-[#28a39e]"
        >
          <Home className="h-4 w-4 mr-2" />
          Voltar para o Dashboard
        </Button>
      </div>
    </div>
  );
}
