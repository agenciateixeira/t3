import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Textarea } from './textarea';
import { Card } from './card';
import { Avatar, AvatarFallback, AvatarImage } from './avatar';

interface Suggestion {
  id: string;
  type: 'user' | 'sector' | 'team';
  label: string;
  value: string;
  avatar?: string;
}

interface MentionTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  users?: { id: string; full_name: string; avatar_url?: string }[];
  sectors?: { value: string; label: string }[];
  teams?: { id: string; name: string }[];
  className?: string;
  rows?: number;
}

export default function MentionTextarea({
  value,
  onChange,
  placeholder,
  users = [],
  sectors = [],
  teams = [],
  className,
  rows = 3,
}: MentionTextareaProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionStart, setMentionStart] = useState<number>(-1);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const getAllSuggestions = (): Suggestion[] => {
    const allSuggestions: Suggestion[] = [];

    // Add users
    users.forEach((user) => {
      if (user.full_name) {
        allSuggestions.push({
          id: user.id,
          type: 'user',
          label: user.full_name,
          value: `@${user.full_name.replace(/\s+/g, '')}`,
          avatar: user.avatar_url,
        });
      }
    });

    // Add sectors
    sectors.forEach((sector) => {
      allSuggestions.push({
        id: sector.value,
        type: 'sector',
        label: `Setor: ${sector.label}`,
        value: `@setor:${sector.value}`,
      });
    });

    // Add teams
    teams.forEach((team) => {
      allSuggestions.push({
        id: team.id,
        type: 'team',
        label: `Time: ${team.name}`,
        value: `@time:${team.id}`,
      });
    });

    return allSuggestions;
  };

  const handleTextChange = (newValue: string) => {
    onChange(newValue);

    const cursorPos = textareaRef.current?.selectionStart || 0;
    const textBeforeCursor = newValue.substring(0, cursorPos);
    const lastAtSymbol = textBeforeCursor.lastIndexOf('@');

    if (lastAtSymbol >= 0 && lastAtSymbol === cursorPos - 1) {
      // Just typed @, show all suggestions
      setMentionStart(lastAtSymbol);
      setSuggestions(getAllSuggestions());
      setShowSuggestions(true);
      setSelectedIndex(0);
    } else if (lastAtSymbol >= 0 && cursorPos > lastAtSymbol) {
      // Typing after @, filter suggestions
      const query = textBeforeCursor.substring(lastAtSymbol + 1).toLowerCase();
      const filtered = getAllSuggestions().filter((s) =>
        s.label.toLowerCase().includes(query)
      );

      if (filtered.length > 0) {
        setMentionStart(lastAtSymbol);
        setSuggestions(filtered);
        setShowSuggestions(true);
        setSelectedIndex(0);
      } else {
        setShowSuggestions(false);
      }
    } else {
      setShowSuggestions(false);
    }
  };

  const insertMention = (suggestion: Suggestion) => {
    if (mentionStart < 0) return;

    const cursorPos = textareaRef.current?.selectionStart || 0;
    const before = value.substring(0, mentionStart);
    const after = value.substring(cursorPos);
    const newValue = before + suggestion.value + ' ' + after;

    onChange(newValue);
    setShowSuggestions(false);
    setMentionStart(-1);

    // Set cursor position after mention
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = before.length + suggestion.value.length + 1;
        textareaRef.current.selectionStart = newCursorPos;
        textareaRef.current.selectionEnd = newCursorPos;
        textareaRef.current.focus();
      }
    }, 0);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showSuggestions) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter' && suggestions.length > 0) {
      e.preventDefault();
      insertMention(suggestions[selectedIndex]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setShowSuggestions(false);
    }
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'user':
        return '👤';
      case 'sector':
        return '🏢';
      case 'team':
        return '👥';
      default:
        return '📌';
    }
  };

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => handleTextChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className}
        rows={rows}
      />

      {showSuggestions && suggestions.length > 0 && (
        <Card
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto shadow-lg"
        >
          <div className="p-1">
            {suggestions.map((suggestion, index) => (
              <button
                key={suggestion.id}
                type="button"
                onClick={() => insertMention(suggestion)}
                className={`w-full text-left px-3 py-2 rounded flex items-center gap-3 transition-colors ${
                  index === selectedIndex
                    ? 'bg-[#2db4af] text-white'
                    : 'hover:bg-gray-100'
                }`}
              >
                {suggestion.type === 'user' && suggestion.avatar ? (
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={suggestion.avatar} />
                    <AvatarFallback className="text-xs bg-gray-200">
                      {suggestion.label.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <span className="text-lg">{getIconForType(suggestion.type)}</span>
                )}
                <div className="flex-1">
                  <div className="text-sm font-medium">{suggestion.label}</div>
                  <div className={`text-xs ${index === selectedIndex ? 'text-white/80' : 'text-gray-500'}`}>
                    {suggestion.value}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
