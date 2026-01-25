-- Create RPC function to get profile by email
-- This function allows querying profiles by email from auth.users table
-- Used during first access authentication when CPF is not yet saved in profiles

CREATE OR REPLACE FUNCTION get_profile_by_email(email_input TEXT)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  cpf TEXT,
  phone TEXT,
  hierarchy TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.full_name,
    p.cpf,
    p.phone,
    p.hierarchy,
    p.avatar_url,
    p.created_at,
    p.updated_at
  FROM profiles p
  INNER JOIN auth.users u ON u.id = p.id
  WHERE u.email = email_input;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_profile_by_email(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_profile_by_email(TEXT) TO anon;

-- Add comment explaining the function
COMMENT ON FUNCTION get_profile_by_email(TEXT) IS 'Retrieves profile data by querying auth.users email. Used for first access authentication when CPF is not yet saved in profiles table.';
