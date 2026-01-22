-- ============================================
-- FERRAMENTAS PRÉ-CADASTRADAS POR SETOR
-- Ferramentas divididas por categoria/setor
-- ============================================

-- Limpa ferramentas existentes (opcional - remova se quiser manter as existentes)
-- DELETE FROM tools;

-- FERRAMENTAS DE TRÁFEGO PAGO
INSERT INTO tools (name, description, url, category, instructions, required_hierarchy) VALUES
('Meta Ads Manager', 'Gerenciador de anúncios do Facebook e Instagram', 'https://business.facebook.com/adsmanager', 'Tráfego', 'Utilize para criar, gerenciar e analisar campanhas de anúncios no Facebook e Instagram. Acompanhe métricas diariamente.', ARRAY['admin', 'team_manager', 'traffic_manager']::user_hierarchy[]),

('Google Ads', 'Plataforma de anúncios do Google', 'https://ads.google.com', 'Tráfego', 'Crie campanhas de pesquisa, display e remarketing. Monitore CPC, CTR e conversões.', ARRAY['admin', 'team_manager', 'traffic_manager']::user_hierarchy[]),

('TikTok Ads Manager', 'Gerenciador de anúncios do TikTok', 'https://ads.tiktok.com', 'Tráfego', 'Plataforma para criar e gerenciar campanhas no TikTok. Foco em público jovem.', ARRAY['admin', 'team_manager', 'traffic_manager']::user_hierarchy[]),

('Hotmart', 'Plataforma de produtos digitais', 'https://www.hotmart.com', 'Tráfego', 'Gerencie links de afiliados e acompanhe vendas de produtos digitais.', ARRAY['admin', 'team_manager', 'traffic_manager']::user_hierarchy[]);

-- FERRAMENTAS DE DESIGN
INSERT INTO tools (name, description, url, category, instructions, required_hierarchy) VALUES
('Canva', 'Ferramenta de design gráfico online', 'https://www.canva.com', 'Design', 'Crie artes para redes sociais, apresentações e materiais gráficos. Use templates da pasta compartilhada.', ARRAY['admin', 'team_manager', 'designer', 'social_media']::user_hierarchy[]),

('Figma', 'Ferramenta de design colaborativo', 'https://www.figma.com', 'Design', 'Crie protótipos, layouts e designs de interface. Trabalhe em equipe em tempo real.', ARRAY['admin', 'team_manager', 'designer']::user_hierarchy[]),

('Adobe Creative Cloud', 'Suite completa de ferramentas Adobe', 'https://www.adobe.com', 'Design', 'Acesso ao Photoshop, Illustrator, After Effects e outras ferramentas profissionais.', ARRAY['admin', 'team_manager', 'designer', 'audiovisual']::user_hierarchy[]),

('Unsplash', 'Banco de imagens gratuitas', 'https://unsplash.com', 'Design', 'Imagens de alta qualidade e livres de direitos autorais para uso em projetos.', ARRAY['admin', 'team_manager', 'designer', 'social_media']::user_hierarchy[]);

-- FERRAMENTAS DE SOCIAL MEDIA
INSERT INTO tools (name, description, url, category, instructions, required_hierarchy) VALUES
('Meta Business Suite', 'Gerenciador de páginas e perfis Facebook/Instagram', 'https://business.facebook.com', 'Social Media', 'Agende posts, responda mensagens e analise métricas de engajamento.', ARRAY['admin', 'team_manager', 'social_media', 'strategy']::user_hierarchy[]),

('Instagram', 'Rede social de fotos e vídeos', 'https://www.instagram.com', 'Social Media', 'Publique stories, reels e posts. Interaja com seguidores e monitore engajamento.', ARRAY['admin', 'team_manager', 'social_media']::user_hierarchy[]),

('TikTok', 'Plataforma de vídeos curtos', 'https://www.tiktok.com', 'Social Media', 'Crie conteúdo em vídeo curto para alcançar público jovem.', ARRAY['admin', 'team_manager', 'social_media']::user_hierarchy[]),

('CapCut', 'Editor de vídeos para redes sociais', 'https://www.capcut.com', 'Social Media', 'Edite vídeos para Instagram Reels, TikTok e YouTube Shorts.', ARRAY['admin', 'team_manager', 'social_media', 'audiovisual']::user_hierarchy[]);

-- FERRAMENTAS DE ESTRATÉGIA E ANÁLISE
INSERT INTO tools (name, description, url, category, instructions, required_hierarchy) VALUES
('Google Analytics', 'Ferramenta de análise de tráfego web', 'https://analytics.google.com', 'Estratégia', 'Monitore visitantes, comportamento de usuários e conversões no site.', ARRAY['admin', 'team_manager', 'strategy', 'traffic_manager']::user_hierarchy[]),

('Google Search Console', 'Ferramenta de SEO do Google', 'https://search.google.com/search-console', 'Estratégia', 'Analise desempenho de SEO, palavras-chave e indexação do site.', ARRAY['admin', 'team_manager', 'strategy']::user_hierarchy[]),

('Metricool', 'Ferramenta de gestão e análise de redes sociais', 'https://metricool.com', 'Estratégia', 'Agende posts, analise métricas e gerencie múltiplas redes sociais.', ARRAY['admin', 'team_manager', 'strategy', 'social_media']::user_hierarchy[]),

('Notion', 'Workspace colaborativo', 'https://www.notion.so', 'Estratégia', 'Organize projetos, documentos e processos da equipe.', ARRAY['admin', 'team_manager', 'strategy']::user_hierarchy[]);

-- FERRAMENTAS DE AUDIOVISUAL
INSERT INTO tools (name, description, url, category, instructions, required_hierarchy) VALUES
('YouTube Studio', 'Gerenciador de canal do YouTube', 'https://studio.youtube.com', 'Audiovisual', 'Faça upload de vídeos, monitore analytics e gerencie o canal.', ARRAY['admin', 'team_manager', 'audiovisual', 'social_media']::user_hierarchy[]),

('DaVinci Resolve', 'Editor de vídeo profissional', 'https://www.blackmagicdesign.com/products/davinciresolve', 'Audiovisual', 'Edição de vídeo avançada com correção de cor e efeitos.', ARRAY['admin', 'team_manager', 'audiovisual']::user_hierarchy[]),

('Premiere Pro', 'Editor de vídeo Adobe', 'https://www.adobe.com/products/premiere.html', 'Audiovisual', 'Edição profissional de vídeos para diversos formatos.', ARRAY['admin', 'team_manager', 'audiovisual']::user_hierarchy[]);

-- FERRAMENTAS ADMINISTRATIVAS (apenas admin e gerentes)
INSERT INTO tools (name, description, url, category, instructions, required_hierarchy) VALUES
('Google Drive', 'Armazenamento em nuvem', 'https://drive.google.com', 'Administrativo', 'Armazene e compartilhe arquivos da equipe.', ARRAY['admin', 'team_manager']::user_hierarchy[]),

('Trello', 'Ferramenta de gestão de projetos', 'https://trello.com', 'Administrativo', 'Organize tarefas e acompanhe progresso de projetos.', ARRAY['admin', 'team_manager']::user_hierarchy[]),

('Slack', 'Plataforma de comunicação', 'https://slack.com', 'Administrativo', 'Comunique-se com a equipe em tempo real.', ARRAY['admin', 'team_manager']::user_hierarchy[]);

-- Confirma inserção
SELECT 
  category,
  COUNT(*) as total_ferramentas
FROM tools
GROUP BY category
ORDER BY category;
