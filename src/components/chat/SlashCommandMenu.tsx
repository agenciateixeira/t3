import { useEffect, useState, useRef } from 'react';
import { ListTodo, Briefcase, Bell, Calendar, Timer } from 'lucide-react';

interface Command {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  action: () => void;
}

interface SlashCommandMenuProps {
  inputValue: string;
  cursorPosition: number;
  onSelectCommand: (commandId: string) => void;
  inputRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement>;
}

export default function SlashCommandMenu({
  inputValue,
  cursorPosition,
  onSelectCommand,
  inputRef,
}: SlashCommandMenuProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const commands: Command[] = [
    {
      id: 'task',
      label: '/tarefa',
      description: 'Criar nova tarefa',
      icon: <ListTodo className="h-4 w-4" />,
      action: () => onSelectCommand('task'),
    },
    {
      id: 'deal',
      label: '/deal',
      description: 'Criar novo deal',
      icon: <Briefcase className="h-4 w-4" />,
      action: () => onSelectCommand('deal'),
    },
    {
      id: 'reminder',
      label: '/lembrete',
      description: 'Criar lembrete',
      icon: <Bell className="h-4 w-4" />,
      action: () => onSelectCommand('reminder'),
    },
    {
      id: 'meeting',
      label: '/reuniao',
      description: 'Agendar reunião',
      icon: <Calendar className="h-4 w-4" />,
      action: () => onSelectCommand('meeting'),
    },
    {
      id: 'timer',
      label: '/timer',
      description: 'Iniciar timer',
      icon: <Timer className="h-4 w-4" />,
      action: () => onSelectCommand('timer'),
    },
  ];

  useEffect(() => {
    // Detecta se há uma barra "/" no início ou após espaço
    const textBeforeCursor = inputValue.substring(0, cursorPosition);
    const lastSlashIndex = textBeforeCursor.lastIndexOf('/');

    // Verifica se "/" está no início ou após espaço
    if (lastSlashIndex !== -1) {
      const charBeforeSlash = lastSlashIndex === 0 ? ' ' : textBeforeCursor[lastSlashIndex - 1];

      if (charBeforeSlash === ' ' || lastSlashIndex === 0) {
        // Verifica se não há espaço após "/"
        const textAfterSlash = textBeforeCursor.substring(lastSlashIndex + 1);
        if (!textAfterSlash.includes(' ')) {
          setIsVisible(true);
          setSelectedIndex(0);

          // Calcular posição do menu
          if (inputRef.current) {
            const input = inputRef.current;
            const rect = input.getBoundingClientRect();

            // Posiciona acima do input
            setPosition({
              top: rect.top - 10,
              left: rect.left,
            });
          }
        } else {
          setIsVisible(false);
        }
      } else {
        setIsVisible(false);
      }
    } else {
      setIsVisible(false);
    }
  }, [inputValue, cursorPosition, inputRef]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isVisible) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % commands.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + commands.length) % commands.length);
      } else if (e.key === 'Enter' && commands.length > 0) {
        e.preventDefault();
        handleSelectCommand(commands[selectedIndex]);
      } else if (e.key === 'Escape') {
        setIsVisible(false);
      }
    };

    if (isVisible) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isVisible, selectedIndex]);

  const handleSelectCommand = (command: Command) => {
    command.action();
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div
      ref={containerRef}
      className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 py-1 max-h-80 overflow-y-auto"
      style={{
        bottom: `calc(100vh - ${position.top}px)`,
        left: position.left,
        minWidth: '300px',
        maxWidth: '400px',
        transform: 'translateY(-100%)',
      }}
    >
      <div className="px-3 py-2 border-b border-gray-100">
        <p className="text-xs font-semibold text-gray-500 uppercase">Comandos disponíveis</p>
      </div>
      {commands.map((command, index) => (
        <div
          key={command.id}
          onClick={() => handleSelectCommand(command)}
          className={`px-3 py-3 cursor-pointer flex items-center gap-3 transition-colors ${
            index === selectedIndex ? 'bg-[#f0f2f5]' : 'hover:bg-gray-50'
          }`}
        >
          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#2db4af]/10 flex items-center justify-center text-[#2db4af]">
            {command.icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900">{command.label}</p>
            <p className="text-xs text-gray-500">{command.description}</p>
          </div>
        </div>
      ))}
      <div className="px-3 py-2 border-t border-gray-100 bg-gray-50">
        <p className="text-xs text-gray-500">
          Use <kbd className="px-1 py-0.5 bg-white border border-gray-300 rounded text-[10px]">↑</kbd>
          <kbd className="px-1 py-0.5 bg-white border border-gray-300 rounded text-[10px] ml-1">↓</kbd> para navegar
          e <kbd className="px-1 py-0.5 bg-white border border-gray-300 rounded text-[10px] ml-1">Enter</kbd> para selecionar
        </p>
      </div>
    </div>
  );
}
