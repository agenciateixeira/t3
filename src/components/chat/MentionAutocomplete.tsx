import { useEffect, useState, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { searchUsersForMention } from '@/lib/chatUtils';

interface User {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

interface MentionAutocompleteProps {
  inputValue: string;
  cursorPosition: number;
  onSelectUser: (user: User, mentionStart: number, mentionEnd: number) => void;
  inputRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement>;
}

export default function MentionAutocomplete({
  inputValue,
  cursorPosition,
  onSelectUser,
  inputRef,
}: MentionAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<User[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionStart, setMentionStart] = useState(-1);
  const [query, setQuery] = useState('');
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Detecta se há um @ antes do cursor
    const textBeforeCursor = inputValue.substring(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex === -1) {
      setSuggestions([]);
      setMentionStart(-1);
      return;
    }

    // Verifica se há um espaço entre @ e o cursor
    const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
    if (textAfterAt.includes(' ')) {
      setSuggestions([]);
      setMentionStart(-1);
      return;
    }

    // Busca usuários
    const searchQuery = textAfterAt;
    setMentionStart(lastAtIndex);
    setQuery(searchQuery);

    const fetchSuggestions = async () => {
      const users = await searchUsersForMention(searchQuery);
      setSuggestions(users);
      setSelectedIndex(0);
    };

    fetchSuggestions();

    // Calcular posição do autocomplete
    if (inputRef.current) {
      const input = inputRef.current;
      const rect = input.getBoundingClientRect();

      // Posiciona acima do input
      setPosition({
        top: rect.top - 10,
        left: rect.left,
      });
    }
  }, [inputValue, cursorPosition, inputRef]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (suggestions.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % suggestions.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
      } else if (e.key === 'Enter' && suggestions.length > 0) {
        e.preventDefault();
        handleSelectUser(suggestions[selectedIndex]);
      } else if (e.key === 'Escape') {
        setSuggestions([]);
      }
    };

    if (suggestions.length > 0) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [suggestions, selectedIndex]);

  const handleSelectUser = (user: User) => {
    if (mentionStart === -1) return;

    const mentionEnd = cursorPosition;
    onSelectUser(user, mentionStart, mentionEnd);
    setSuggestions([]);
    setMentionStart(-1);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (suggestions.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className="fixed z-50 bg-white rounded-lg shadow-lg border border-gray-200 py-1 max-h-60 overflow-y-auto"
      style={{
        bottom: position.top,
        left: position.left,
        minWidth: '250px',
        maxWidth: '350px',
        transform: 'translateY(-100%)',
      }}
    >
      {suggestions.map((user, index) => (
        <div
          key={user.id}
          onClick={() => handleSelectUser(user)}
          className={`px-3 py-2 cursor-pointer flex items-center gap-3 transition-colors ${
            index === selectedIndex ? 'bg-[#f0f2f5]' : 'hover:bg-gray-50'
          }`}
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.avatar_url || undefined} />
            <AvatarFallback className="bg-[#2db4af] text-white text-xs">
              {getInitials(user.full_name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{user.full_name}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
