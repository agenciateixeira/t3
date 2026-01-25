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
 * Renderiza texto com menções destacadas
 */
export const renderMessageWithMentions = (
  content: string,
  mentionedUserIds: string[],
  allUsers: { id: string; full_name: string }[]
): JSX.Element => {
  if (!mentionedUserIds || mentionedUserIds.length === 0) {
    return <span>{content}</span>;
  }

  // Buscar nomes dos usuários mencionados
  const mentionedUsers = allUsers.filter((u) => mentionedUserIds.includes(u.id));

  // Substituir @username por versão destacada
  let parts: (string | JSX.Element)[] = [content];

  mentionedUsers.forEach((user) => {
    const newParts: (string | JSX.Element)[] = [];

    parts.forEach((part, partIndex) => {
      if (typeof part === 'string') {
        const regex = new RegExp(`(@${user.full_name})`, 'gi');
        const matches = part.split(regex);

        matches.forEach((match, i) => {
          if (match.toLowerCase() === `@${user.full_name.toLowerCase()}`) {
            newParts.push(
              <span
                key={`${partIndex}-${i}`}
                className="bg-[#2db4af]/20 text-[#2db4af] px-1 rounded font-semibold cursor-pointer hover:bg-[#2db4af]/30"
                title={user.full_name}
              >
                {match}
              </span>
            );
          } else if (match) {
            newParts.push(match);
          }
        });
      } else {
        newParts.push(part);
      }
    });

    parts = newParts;
  });

  return <>{parts}</>;
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
