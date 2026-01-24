/**
 * HELPERS DE AUTENTICAÇÃO
 * Funções auxiliares para login, cadastro e validação de usuários
 */

import { supabase } from '@/lib/supabase';
import { onlyNumbers } from './validators';

/**
 * Busca perfil de usuário por CPF, Email ou Telefone
 * @param identifier - CPF, Email ou Telefone
 * @returns Perfil encontrado ou null
 */
export async function findProfileByIdentifier(identifier: string) {
  const cleanIdentifier = identifier.trim();

  // Se for numérico, pode ser CPF ou telefone
  if (/^\d+$/.test(onlyNumbers(cleanIdentifier))) {
    const cleanNumbers = onlyNumbers(cleanIdentifier);

    // CPF tem 11 dígitos
    if (cleanNumbers.length === 11) {
      // Buscar por CPF
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('cpf', cleanNumbers)
        .maybeSingle();

      if (data) return data;
    }

    // Telefone pode ter 10 ou 11 dígitos
    if (cleanNumbers.length === 10 || cleanNumbers.length === 11) {
      // Buscar por telefone
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('phone', cleanNumbers)
        .maybeSingle();

      if (data) return data;
    }
  }

  // Se contém @, é email
  if (cleanIdentifier.includes('@')) {
    // Buscar usuário por email no auth.users
    const { data: authData } = await supabase.auth.admin.getUserByEmail(cleanIdentifier);

    if (authData?.user) {
      // Buscar perfil correspondente
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .maybeSingle();

      return profileData;
    }
  }

  return null;
}

/**
 * Verifica se um CPF já está cadastrado no sistema
 * @param cpf - CPF com ou sem formatação
 * @returns true se CPF existe, false caso contrário
 */
export async function cpfExists(cpf: string): Promise<boolean> {
  const cleanCPF = onlyNumbers(cpf);

  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('cpf', cleanCPF)
    .maybeSingle();

  return !!data;
}

/**
 * Busca dados do colaborador pré-cadastrado por CPF
 * @param cpf - CPF com ou sem formatação
 * @returns Dados do perfil ou null se não encontrado
 */
export async function getPreRegisteredEmployee(cpf: string) {
  const cleanCPF = onlyNumbers(cpf);

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('cpf', cleanCPF)
    .maybeSingle();

  if (error) {
    console.error('Erro ao buscar colaborador:', error);
    return null;
  }

  return data;
}

/**
 * Verifica se um perfil já tem conta criada (user_id preenchido)
 * @param profileId - ID do perfil
 * @returns true se já tem conta, false caso contrário
 */
export async function hasUserAccount(profileId: string): Promise<boolean> {
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', profileId)
    .not('id', 'is', null)
    .maybeSingle();

  return !!data;
}

/**
 * Obtém o email associado a um perfil pelo CPF
 * Para usar no login do Supabase Auth
 * @param cpf - CPF do colaborador
 * @returns Email ou null
 */
export async function getEmailByCPF(cpf: string): Promise<string | null> {
  const cleanCPF = onlyNumbers(cpf);

  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('cpf', cleanCPF)
    .maybeSingle();

  if (!data) return null;

  // Buscar email do usuário no auth
  const { data: { user } } = await supabase.auth.admin.getUserById(data.id);

  return user?.email || null;
}

/**
 * Obtém o email associado a um perfil pelo telefone
 * @param phone - Telefone do colaborador
 * @returns Email ou null
 */
export async function getEmailByPhone(phone: string): Promise<string | null> {
  const cleanPhone = onlyNumbers(phone);

  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('phone', cleanPhone)
    .maybeSingle();

  if (!data) return null;

  // Buscar email do usuário no auth
  const { data: { user } } = await supabase.auth.admin.getUserById(data.id);

  return user?.email || null;
}
