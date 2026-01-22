import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { format, addDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  CalendarDays,
  Instagram,
  Facebook,
  Linkedin,
  ArrowRight,
  FileText,
  Twitter
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

interface ScheduledPost {
  id: string;
  title: string;
  content: string | null;
  platform: string;
  status: string;
  scheduled_for: string;
  client_id: string;
  client?: {
    id: string;
    name: string;
  };
}

const PLATFORM_ICONS: Record<string, React.ElementType> = {
  instagram: Instagram,
  facebook: Facebook,
  linkedin: Linkedin,
  twitter: Twitter,
};

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  scheduled: 'bg-yellow-100 text-yellow-700',
  published: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Rascunho',
  scheduled: 'Agendado',
  published: 'Publicado',
  failed: 'Falhou',
};

export function UpcomingContent() {
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('today');

  const today = new Date();
  const tomorrow = addDays(today, 1);
  const dayAfterTomorrow = addDays(today, 2);

  useEffect(() => {
    const fetchPosts = async () => {
      const { data, error } = await supabase
        .from('scheduled_posts')
        .select('*, client:clients(id, name)')
        .gte('scheduled_for', format(today, 'yyyy-MM-dd'))
        .lte('scheduled_for', format(addDays(today, 7), 'yyyy-MM-dd'))
        .order('scheduled_for', { ascending: true });

      if (data && !error) {
        setPosts(data as ScheduledPost[]);
      }
      setIsLoading(false);
    };

    fetchPosts();
  }, []);

  const getPostsForDate = (date: Date) => {
    return posts.filter((post) => {
      const postDate = parseISO(post.scheduled_for);
      return format(postDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
    });
  };

  const todayPosts = getPostsForDate(today);
  const tomorrowPosts = getPostsForDate(tomorrow);
  const dayAfterPosts = getPostsForDate(dayAfterTomorrow);

  const renderPostItem = (post: ScheduledPost) => {
    const PlatformIcon = PLATFORM_ICONS[post.platform] || FileText;
    const postTime = format(parseISO(post.scheduled_for), 'HH:mm');

    return (
      <div
        key={post.id}
        className="flex items-start gap-3 py-3 first:pt-0 last:pb-0"
      >
        <div className="p-1.5 rounded-md bg-gray-100 mt-0.5">
          <PlatformIcon className="h-4 w-4 text-gray-600" />
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <p className="text-sm font-medium text-gray-900 truncate">
            {post.title}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            {post.client && (
              <span className="text-xs text-gray-600">
                {post.client.name}
              </span>
            )}
            <span className="text-xs text-gray-400">•</span>
            <span className="text-xs text-gray-600 capitalize">
              {post.platform}
            </span>
            <span className="text-xs text-gray-400">•</span>
            <span className="text-xs text-gray-600 tabular-nums">
              {postTime}
            </span>
          </div>
        </div>
        <Badge
          variant="secondary"
          className={`text-[10px] px-1.5 py-0 shrink-0 ${STATUS_COLORS[post.status] || 'bg-gray-100'}`}
        >
          {STATUS_LABELS[post.status] || post.status}
        </Badge>
      </div>
    );
  };

  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="p-3 rounded-full bg-gray-100 mb-3">
        <CalendarDays className="h-5 w-5 text-gray-400" />
      </div>
      <p className="text-sm text-gray-500">
        Nenhum conteúdo agendado
      </p>
    </div>
  );

  const renderPostList = (postList: ScheduledPost[]) => {
    if (postList.length === 0) {
      return renderEmptyState();
    }
    return (
      <div className="divide-y divide-gray-100">
        {postList.map(renderPostItem)}
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">Próximos Conteúdos</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-center py-8">
            <div className="animate-pulse text-sm text-gray-500">
              Carregando...
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">Próximos Conteúdos</CardTitle>
          <Button variant="ghost" size="sm" asChild className="text-xs h-7 px-2">
            <Link to="/calendar" className="flex items-center gap-1">
              Ver tudo
              <ArrowRight className="h-3 w-3" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-3 mb-3">
            <TabsTrigger value="today" className="text-xs">
              Hoje
              {todayPosts.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-[#2db4af]/10 text-[#2db4af] text-[10px]">
                  {todayPosts.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="tomorrow" className="text-xs">
              Amanhã
              {tomorrowPosts.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-[#2db4af]/10 text-[#2db4af] text-[10px]">
                  {tomorrowPosts.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="dayAfter" className="text-xs">
              {format(dayAfterTomorrow, 'EEE', { locale: ptBR })}
              {dayAfterPosts.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-[#2db4af]/10 text-[#2db4af] text-[10px]">
                  {dayAfterPosts.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="today" className="mt-0">
            {renderPostList(todayPosts)}
          </TabsContent>
          <TabsContent value="tomorrow" className="mt-0">
            {renderPostList(tomorrowPosts)}
          </TabsContent>
          <TabsContent value="dayAfter" className="mt-0">
            {renderPostList(dayAfterPosts)}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
