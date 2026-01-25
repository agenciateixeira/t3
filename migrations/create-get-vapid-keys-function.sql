-- Função para buscar VAPID keys do Vault
-- Esta função é chamada pela Edge Function para acessar os secrets

CREATE OR REPLACE FUNCTION get_vapid_keys()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  public_key text;
  private_key text;
  subject text;
BEGIN
  -- Buscar secrets do Vault
  SELECT decrypted_secret INTO public_key
  FROM vault.decrypted_secrets
  WHERE name = 'VAPID_PUBLIC_KEY';

  SELECT decrypted_secret INTO private_key
  FROM vault.decrypted_secrets
  WHERE name = 'VAPID_PRIVATE_KEY';

  SELECT decrypted_secret INTO subject
  FROM vault.decrypted_secrets
  WHERE name = 'VAPID_SUBJECT';

  -- Retornar como JSON
  RETURN json_build_object(
    'public_key', public_key,
    'private_key', private_key,
    'subject', COALESCE(subject, 'mailto:noreply@example.com')
  );
END;
$$;

-- Comentário
COMMENT ON FUNCTION get_vapid_keys() IS 'Retorna as VAPID keys do Vault para uso na Edge Function de push notifications';
