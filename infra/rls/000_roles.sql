-- ShopOS database roles
-- Runs as superuser. Idempotent.
--
-- shopos_app    — app runtime connection; RLS applies
-- shopos_admin  — super-admin routes + impersonation; BYPASSRLS
--
-- Passwords are passed via psql variables :shopos_app_password and :shopos_admin_password
-- (set by packages/db/src/rls-apply.ts from env vars).

DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'shopos_app') THEN
    EXECUTE format('CREATE ROLE shopos_app LOGIN PASSWORD %L', :'shopos_app_password');
  ELSE
    EXECUTE format('ALTER ROLE shopos_app WITH LOGIN PASSWORD %L', :'shopos_app_password');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'shopos_admin') THEN
    EXECUTE format('CREATE ROLE shopos_admin LOGIN BYPASSRLS PASSWORD %L', :'shopos_admin_password');
  ELSE
    EXECUTE format('ALTER ROLE shopos_admin WITH LOGIN BYPASSRLS PASSWORD %L', :'shopos_admin_password');
  END IF;
END
$do$;

-- Schema access (CONNECT on the DB is granted to PUBLIC by default).
GRANT USAGE ON SCHEMA public TO shopos_app, shopos_admin;
