import { Badge } from './badge';

interface MentionTextProps {
  text: string;
  className?: string;
}

export default function MentionText({ text, className = '' }: MentionTextProps) {
  // Regex para detectar menções: @Nome, @setor:value, @time:id
  const mentionRegex = /(@setor:[a-z_]+|@time:[a-z0-9-]+|@[A-Za-zÀ-ÿ]+)/g;

  const parts = text.split(mentionRegex);

  const getMentionStyle = (mention: string) => {
    if (mention.startsWith('@setor:')) {
      return {
        bg: 'bg-purple-100',
        text: 'text-purple-800',
        border: 'border-purple-200',
        icon: '🏢',
      };
    } else if (mention.startsWith('@time:')) {
      return {
        bg: 'bg-blue-100',
        text: 'text-blue-800',
        border: 'border-blue-200',
        icon: '👥',
      };
    } else {
      return {
        bg: 'bg-green-100',
        text: 'text-green-800',
        border: 'border-green-200',
        icon: '👤',
      };
    }
  };

  const formatMention = (mention: string) => {
    if (mention.startsWith('@setor:')) {
      const sector = mention.replace('@setor:', '');
      return `Setor: ${sector.replace(/_/g, ' ')}`;
    } else if (mention.startsWith('@time:')) {
      return 'Time';
    } else {
      return mention;
    }
  };

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (part.match(mentionRegex)) {
          const style = getMentionStyle(part);
          return (
            <Badge
              key={index}
              variant="secondary"
              className={`${style.bg} ${style.text} border ${style.border} px-2 py-0.5 mx-0.5 font-medium`}
            >
              <span className="mr-1">{style.icon}</span>
              {formatMention(part)}
            </Badge>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </span>
  );
}
