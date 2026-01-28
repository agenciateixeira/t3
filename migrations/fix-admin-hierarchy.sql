-- Verificar qual usuario esta tentando cadastrar (voce)
-- Execute este SQL para ver seu perfil:

SELECT
  id,
  full_name,
  email,
  hierarchy,
  created_at
FROM profiles
ORDER BY created_at ASC
LIMIT 5;

-- Se o hierarchy estiver NULL ou diferente de 'admin', execute:
-- SUBSTITUA 'SEU_EMAIL@exemplo.com' pelo seu email real!

UPDATE profiles
SET hierarchy = 'admin'
WHERE email = 'SEU_EMAIL@exemplo.com';

-- OU se souber o ID:
-- UPDATE profiles SET hierarchy = 'admin' WHERE id = 'seu-uuid-aqui';

-- Verificar se funcionou:
SELECT id, full_name, email, hierarchy FROM profiles WHERE hierarchy = 'admin';
