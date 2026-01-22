import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Loader2, User, Upload, Lock, Globe, Bell, LogOut, Camera, Shield } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

interface UserPreferences {
  locale: string;
  timezone: string;
  email_notifications: boolean;
}

export default function Profile() {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isLoadingPreferences, setIsLoadingPreferences] = useState(false);
  const [isLoadingPassword, setIsLoadingPassword] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [hasProfileChanges, setHasProfileChanges] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const [profileForm, setProfileForm] = useState({
    full_name: '',
    avatar_url: '',
  });

  const [preferences, setPreferences] = useState<UserPreferences>({
    locale: 'pt-BR',
    timezone: 'America/Sao_Paulo',
    email_notifications: true,
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchPreferences();
    }
  }, [user]);

  useEffect(() => {
    if (profile) {
      const initialForm = {
        full_name: profile.full_name || '',
        avatar_url: profile.avatar_url || '',
      };
      setProfileForm(initialForm);
    }
  }, [profile]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setProfileForm({
          full_name: data.full_name || '',
          avatar_url: data.avatar_url || '',
        });
      }
    } catch (error: any) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      // Ignore "not found" errors - use defaults
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching preferences:', error);
        return;
      }

      if (data) {
        setPreferences({
          locale: data.locale || 'pt-BR',
          timezone: data.timezone || 'America/Sao_Paulo',
          email_notifications: data.email_notifications ?? true,
        });
      }
    } catch (error: any) {
      console.error('Error fetching preferences:', error);
    }
  };

  const handleAvatarClick = () => {
    console.log('🎯 Avatar clicked, opening file selector...');
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    console.log('📁 File selected:', file?.name, file?.type, file?.size);

    if (!file || !user) {
      console.log('❌ No file or no user');
      return;
    }

    // Validate file type
    if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
      toast({
        variant: 'destructive',
        title: 'Tipo de arquivo inválido',
        description: 'Use apenas PNG, JPG ou JPEG',
      });
      return;
    }

    // Validate file size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        variant: 'destructive',
        title: 'Arquivo muito grande',
        description: 'O tamanho máximo é 2MB',
      });
      return;
    }

    setIsUploadingAvatar(true);
    console.log('⏳ Starting upload...');

    try {
      // Delete old avatar if exists
      if (profileForm.avatar_url) {
        const oldPath = profileForm.avatar_url.split('/').slice(-2).join('/');
        console.log('🗑️ Deleting old avatar:', oldPath);
        await supabase.storage.from('avatars').remove([oldPath]);
      }

      // Upload new avatar
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;
      console.log('📤 Uploading to:', filePath);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      console.log('📤 Upload result:', { data: uploadData, error: uploadError });

      if (uploadError) {
        console.error('❌ Upload error:', uploadError);
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      console.log('🔗 Public URL:', publicUrl);

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          avatar_url: publicUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('❌ Profile update error:', updateError);
        throw updateError;
      }

      console.log('✅ Profile updated successfully!');

      setProfileForm({ ...profileForm, avatar_url: publicUrl });
      await refreshProfile();

      toast({
        title: 'Avatar atualizado!',
        description: 'Sua foto de perfil foi alterada com sucesso.',
      });
    } catch (error: any) {
      console.error('❌ Error in upload process:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao fazer upload',
        description: error.message || 'Verifique se o bucket "avatars" foi criado no Supabase',
      });
    } finally {
      setIsUploadingAvatar(false);
      console.log('🏁 Upload process finished');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoadingProfile(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profileForm.full_name,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user?.id);

      if (error) throw error;

      await refreshProfile();
      setHasProfileChanges(false);

      toast({
        title: 'Perfil atualizado!',
        description: 'Suas informações foram salvas com sucesso.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar perfil',
        description: error.message,
      });
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const handlePreferencesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoadingPreferences(true);

    try {
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user?.id,
          locale: preferences.locale,
          timezone: preferences.timezone,
          email_notifications: preferences.email_notifications,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast({
        title: 'Preferências salvas!',
        description: 'Suas preferências foram atualizadas com sucesso.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar preferências',
        description: error.message,
      });
    } finally {
      setIsLoadingPreferences(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        variant: 'destructive',
        title: 'Senhas não coincidem',
        description: 'A nova senha e a confirmação devem ser iguais.',
      });
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast({
        variant: 'destructive',
        title: 'Senha muito curta',
        description: 'A senha deve ter no mínimo 6 caracteres.',
      });
      return;
    }

    setIsLoadingPassword(true);

    try {
      // First verify current password by trying to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: passwordForm.currentPassword,
      });

      if (signInError) {
        throw new Error('Senha atual incorreta');
      }

      // Update password
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword,
      });

      if (error) throw error;

      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setIsPasswordDialogOpen(false);

      toast({
        title: 'Senha alterada!',
        description: 'Sua senha foi atualizada com sucesso.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao alterar senha',
        description: error.message,
      });
    } finally {
      setIsLoadingPassword(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Layout>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Configurações</h1>
            <p className="text-gray-600">
              Gerencie seu perfil, preferências e segurança
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* CARD 1: PERFIL */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-gradient-to-br from-[#2db4af] to-[#1d8f8a] rounded-lg flex items-center justify-center">
                    <User className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle>Perfil</CardTitle>
                    <CardDescription>
                      Informações básicas e foto de perfil
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleProfileSubmit} className="space-y-6">
                  {/* Avatar Section */}
                  <div className="flex flex-col items-center gap-4 p-6 bg-gray-50 rounded-lg">
                    <div className="relative group">
                      <Avatar className="h-32 w-32 border-4 border-white shadow-lg">
                        <AvatarImage src={profileForm.avatar_url || undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-[#2db4af] to-[#28a39e] text-white text-4xl">
                          {getInitials(profileForm.full_name || user?.email)}
                        </AvatarFallback>
                      </Avatar>
                      {isUploadingAvatar && (
                        <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                          <Loader2 className="h-8 w-8 text-white animate-spin" />
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={handleAvatarClick}
                        disabled={isUploadingAvatar}
                        className="absolute bottom-0 right-0 p-2.5 bg-[#2db4af] hover:bg-[#28a39e] text-white rounded-full shadow-lg transition-all duration-200 hover:scale-110 disabled:opacity-50"
                      >
                        <Camera className="h-4 w-4" />
                      </button>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/jpg"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-900">
                        {profileForm.full_name || 'Sem nome'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Clique no ícone para alterar a foto
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        PNG, JPG ou JPEG (máx. 2MB)
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="full_name">Nome Completo</Label>
                      <Input
                        id="full_name"
                        value={profileForm.full_name}
                        onChange={(e) => {
                          setProfileForm({ ...profileForm, full_name: e.target.value });
                          setHasProfileChanges(true);
                        }}
                        placeholder="Seu nome completo"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">E-mail</Label>
                      <Input
                        id="email"
                        value={user?.email || ''}
                        disabled
                        className="bg-gray-50"
                      />
                      <p className="text-xs text-gray-500">
                        O e-mail não pode ser alterado
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Cargo/Hierarquia</Label>
                      <Input
                        value={profile?.hierarchy || 'Não definido'}
                        disabled
                        className="bg-gray-50"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Time Atual</Label>
                      <Input
                        value={profile?.team_name || 'Sem time'}
                        disabled
                        className="bg-gray-50"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      disabled={isLoadingProfile || !hasProfileChanges}
                      className="bg-[#2db4af] hover:bg-[#28a39e]"
                    >
                      {isLoadingProfile && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Salvar Alterações
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* CARD 2: PREFERÊNCIAS */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                    <Globe className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle>Preferências</CardTitle>
                    <CardDescription>
                      Idioma, fuso horário e notificações
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePreferencesSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="locale">Idioma</Label>
                    <Select
                      value={preferences.locale}
                      onValueChange={(value) =>
                        setPreferences({ ...preferences, locale: value })
                      }
                    >
                      <SelectTrigger id="locale">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
                        <SelectItem value="en-US">English (US)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="timezone">Fuso Horário</Label>
                    <Select
                      value={preferences.timezone}
                      onValueChange={(value) =>
                        setPreferences({ ...preferences, timezone: value })
                      }
                    >
                      <SelectTrigger id="timezone">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="America/Sao_Paulo">
                          Brasília (GMT-3)
                        </SelectItem>
                        <SelectItem value="America/New_York">
                          Nova York (GMT-5)
                        </SelectItem>
                        <SelectItem value="Europe/London">
                          Londres (GMT+0)
                        </SelectItem>
                        <SelectItem value="Europe/Paris">
                          Paris (GMT+1)
                        </SelectItem>
                        <SelectItem value="Asia/Tokyo">
                          Tóquio (GMT+9)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Bell className="h-5 w-5 text-gray-600" />
                      <div>
                        <Label htmlFor="email-notifications" className="cursor-pointer">
                          Notificações por e-mail
                        </Label>
                        <p className="text-xs text-gray-500">
                          Receber atualizações por e-mail
                        </p>
                      </div>
                    </div>
                    <Switch
                      id="email-notifications"
                      checked={preferences.email_notifications}
                      onCheckedChange={(checked) =>
                        setPreferences({ ...preferences, email_notifications: checked })
                      }
                    />
                  </div>

                  <div className="pt-2">
                    <Button
                      type="submit"
                      disabled={isLoadingPreferences}
                      className="w-full bg-blue-500 hover:bg-blue-600"
                    >
                      {isLoadingPreferences && (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      )}
                      Salvar Preferências
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* CARD 3: SEGURANÇA */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center">
                    <Shield className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle>Segurança</CardTitle>
                    <CardDescription>
                      Senha e sessões ativas
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Lock className="h-5 w-5 text-gray-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        Senha
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Última alteração há mais de 30 dias
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsPasswordDialogOpen(true)}
                    >
                      Alterar
                    </Button>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <Button
                    variant="outline"
                    className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sair da Conta
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Password Change Dialog */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Alterar Senha</DialogTitle>
            <DialogDescription>
              Digite sua senha atual e escolha uma nova senha
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Senha Atual</Label>
              <Input
                id="current-password"
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) =>
                  setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
                }
                placeholder="Digite sua senha atual"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-password">Nova Senha</Label>
              <Input
                id="new-password"
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) =>
                  setPasswordForm({ ...passwordForm, newPassword: e.target.value })
                }
                placeholder="Digite a nova senha"
                required
              />
              <p className="text-xs text-gray-500">Mínimo de 6 caracteres</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
              <Input
                id="confirm-password"
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) =>
                  setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                }
                placeholder="Digite novamente a nova senha"
                required
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsPasswordDialogOpen(false);
                  setPasswordForm({
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: '',
                  });
                }}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isLoadingPassword}
                className="flex-1 bg-[#2db4af] hover:bg-[#28a39e]"
              >
                {isLoadingPassword && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Alterar Senha
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
