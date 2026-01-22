import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings as SettingsIcon } from 'lucide-react';

export default function Settings() {
  return (
    <Layout>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              Configurações
            </h1>
            <p className="text-sm sm:text-base text-gray-600">
              Gerencie as configurações do sistema
            </p>
          </div>

          <Card>
            <CardContent className="p-12 text-center">
              <SettingsIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Configurações em Desenvolvimento
              </h3>
              <p className="text-gray-600">
                As configurações do sistema estarão disponíveis em breve.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
