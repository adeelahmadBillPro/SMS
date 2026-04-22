-- Grant the shopos_app role the CRUD privileges it needs on every table.
-- shopos_admin is BYPASSRLS + superuser-like on the schema for the admin UI.
--
-- Global tables (user, plan, shop, shop_member) — authorization is app-layer.
-- RLS'd tables — policies do the gatekeeping; app still needs DML permission.

-- Schema + sequence privileges
GRANT USAGE ON SCHEMA public TO shopos_app, shopos_admin;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO shopos_app, shopos_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO shopos_app, shopos_admin;

-- Full DML on every table (RLS filters rows for shopos_app; shopos_admin bypasses).
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public
  TO shopos_app, shopos_admin;

-- Future tables created by migrations inherit the same grants.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO shopos_app, shopos_admin;

-- The app role needs to execute functions (Prisma uses e.g. gen_random_uuid internally).
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO shopos_app, shopos_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS TO shopos_app, shopos_admin;
