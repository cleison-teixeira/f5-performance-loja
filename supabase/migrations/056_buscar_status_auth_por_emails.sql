-- Batch lookup de status de confirmação de e-mail em auth.users
-- Uso exclusivo: Admin F5 server-side via service_role
-- Segue o padrão de buscar_auth_user_por_email (SECURITY DEFINER, sem SQL dinâmico)
CREATE OR REPLACE FUNCTION public.buscar_status_auth_por_emails(p_emails text[])
RETURNS TABLE(email text, email_confirmed_at timestamptz)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    u.email::text,
    u.email_confirmed_at
  FROM auth.users u
  WHERE u.email IS NOT NULL
    AND lower(u.email) = ANY(SELECT lower(e) FROM unnest(p_emails) AS e);
$$;

-- Bloquear acesso público (anon e authenticated não podem executar)
REVOKE EXECUTE ON FUNCTION public.buscar_status_auth_por_emails(text[]) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.buscar_status_auth_por_emails(text[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.buscar_status_auth_por_emails(text[]) FROM authenticated;

-- Permitir somente service_role (usado exclusivamente no server-side do Admin F5)
GRANT EXECUTE ON FUNCTION public.buscar_status_auth_por_emails(text[]) TO service_role;
