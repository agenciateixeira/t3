import { supabase } from '@/lib/supabase';

/**
 * Detecta menções (@username) no texto e retorna array de user_ids
 */
export const detectMentions = async (text: string): Promise<string[]> => {
  // Regex para encontrar @username ou @"full name"
  const mentionRegex = /@([a-zA-Z0-9_]+|"[^"]+")(\s|$)/g;
  const matches = Array.from(text.matchAll(mentionRegex));

  if (matches.length === 0) return [];

  const mentionedUserIds: string[] = [];

  for (const match of matches) {
    let username = match[1];
    // Remover aspas se houver
    username = username.replace(/"/g, '').trim();

    // Buscar usuário pelo nome
    const { data: users } = await supabase
      .from('profiles')
      .select('id')
      .ilike('full_name', `%${username}%`)
      .limit(1);

    if (users && users.length > 0) {
      mentionedUserIds.push(users[0].id);
    }
  }

  return Array.from(new Set(mentionedUserIds)); // Remove duplicatas
};

/**
 * Formata o texto substituindo user_ids por nomes clicáveis
 */
export const formatMentions = (text: string, users: { id: string; full_name: string }[]): string => {
  let formattedText = text;

  users.forEach((user) => {
    const mentionPattern = new RegExp(`@${user.full_name}`, 'gi');
    formattedText = formattedText.replace(
      mentionPattern,
      `<span class="mention" data-user-id="${user.id}">@${user.full_name}</span>`
    );
  });

  return formattedText;
};

/**
 * Processa o conteúdo da mensagem e retorna partes separadas para renderização
 */
export const parseMentions = (
  content: string,
  mentionedUserIds: string[],
  allUsers: { id: string; full_name: string }[]
): Array<{ type: 'text' | 'mention'; content: string; userId?: string }> => {
  if (!mentionedUserIds || mentionedUserIds.length === 0) {
    return [{ type: 'text', content }];
  }

  const mentionedUsers = allUsers.filter((u) => mentionedUserIds.includes(u.id));
  const parts: Array<{ type: 'text' | 'mention'; content: string; userId?: string }> = [];
  let remainingText = content;

  mentionedUsers.forEach((user) => {
    const regex = new RegExp(`(@${user.full_name})`, 'gi');
    const tempParts: typeof parts = [];

    const segments = remainingText.split(regex);
    segments.forEach((segment) => {
      if (segment.toLowerCase() === `@${user.full_name.toLowerCase()}`) {
        tempParts.push({
          type: 'mention',
          content: segment,
          userId: user.id,
        });
      } else if (segment) {
        tempParts.push({
          type: 'text',
          content: segment,
        });
      }
    });

    parts.push(...tempParts);
    remainingText = '';
  });

  if (parts.length === 0) {
    return [{ type: 'text', content }];
  }

  return parts;
};

/**
 * Busca sugestões de usuários para autocomplete de menções
 */
export const searchUsersForMention = async (query: string): Promise<{ id: string; full_name: string; avatar_url: string | null }[]> => {
  if (!query || query.length < 1) return [];

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url')
    .ilike('full_name', `%${query}%`)
    .limit(5);

  if (error) {
    console.error('Erro ao buscar usuários:', error);
    return [];
  }

  return data || [];
};
