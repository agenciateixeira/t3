# 📸 Configuração do Storage para Avatares

Guia completo para configurar o upload de fotos de perfil no Supabase.

## 🪣 Passo 1: Criar o Bucket

1. Acesse o **Supabase Dashboard**: https://supabase.com/dashboard
2. Selecione seu projeto
3. No menu lateral, clique em **Storage**
4. Clique no botão **New bucket**
5. Configure:
   - **Name**: `avatars`
   - **Public bucket**: ✅ **MARQUE ESTA OPÇÃO** (importante!)
   - **File size limit**: 2 MB (opcional, mas recomendado)
   - **Allowed MIME types**: `image/png, image/jpeg, image/jpg` (opcional)
6. Clique em **Create bucket**

## 🔐 Passo 2: Aplicar as Políticas de Segurança

Depois de criar o bucket, volte para o **SQL Editor**:

1. No menu lateral, clique em **SQL Editor**
2. Clique em **New query**
3. Cole o código SQL abaixo:

```sql
-- POLÍTICAS DE STORAGE PARA AVATARS
-- Execute APÓS criar o bucket 'avatars'

-- 1. Limpar políticas antigas (se existirem)
DROP POLICY IF EXISTS "Usuários podem fazer upload de seus avatars" ON storage.objects;
DROP POLICY IF EXISTS "Usuários podem atualizar seus avatars" ON storage.objects;
DROP POLICY IF EXISTS "Usuários podem deletar seus avatars" ON storage.objects;
DROP POLICY IF EXISTS "Avatars são públicos para leitura" ON storage.objects;

-- 2. Permitir usuários fazerem upload apenas de seus próprios avatars
CREATE POLICY "Usuários podem fazer upload de seus avatars"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- 3. Permitir usuários atualizarem apenas seus próprios avatars
CREATE POLICY "Usuários podem atualizar seus avatars"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- 4. Permitir usuários deletarem apenas seus próprios avatars
CREATE POLICY "Usuários podem deletar seus avatars"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- 5. Permitir leitura pública de todos os avatars
CREATE POLICY "Avatars são públicos para leitura"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'avatars');
```

4. Clique em **Run** ou pressione `Ctrl+Enter`
5. Você deve ver: **Success. No rows returned**

## ✅ Passo 3: Verificar se está funcionando

1. Volte para **Storage** no menu lateral
2. Você deve ver o bucket **avatars** listado
3. Clique nele - deve estar vazio por enquanto
4. Vá para a aplicação e teste o upload de avatar no Perfil!

## 🧪 Como testar:

1. Acesse a página `/profile` na sua aplicação
2. Clique no ícone de câmera no avatar
3. Selecione uma imagem (PNG, JPG ou JPEG, máx 2MB)
4. A foto deve fazer upload automaticamente
5. Verifique no Supabase Dashboard > Storage > avatars
   - Você deve ver uma pasta com seu `user_id`
   - Dentro dela, a imagem com timestamp

## 🔍 Estrutura de pastas no Storage:

```
avatars/
└── 697ad29b-32ab-4f0a-8f8b-1598a095aabb/  (seu user_id)
    ├── 1737584123456.jpg
    └── 1737584567890.png
```

## 🐛 Troubleshooting

### Erro: "new row violates row-level security policy"
- **Causa**: As políticas de storage não foram aplicadas
- **Solução**: Execute novamente o SQL do Passo 2

### Erro: "The resource already exists"
- **Causa**: Tentou criar o bucket duas vezes
- **Solução**: Use o bucket existente, apenas aplique as políticas

### Upload não funciona / erro 400
- **Causa**: Bucket não está público OU políticas não foram aplicadas
- **Solução**:
  1. Vá em Storage > avatars > Settings
  2. Verifique se "Public bucket" está marcado
  3. Execute novamente o SQL das políticas

### Imagem não aparece após upload
- **Causa**: Bucket não está público
- **Solução**:
  1. Storage > avatars > Settings
  2. Marque "Public bucket"
  3. Salve

## 📊 Validação final:

Execute este SQL para verificar as políticas:

```sql
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename = 'objects'
AND schemaname = 'storage'
AND policyname LIKE '%avatar%';
```

Deve retornar 4 policies relacionadas a avatars.

---

**Pronto!** 🎉 Agora seus usuários podem fazer upload de fotos de perfil!
