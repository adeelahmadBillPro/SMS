-- tenant_isolation policy on every RLS'd table.
-- Rule: row is visible iff row.shop_id = current_setting('app.current_shop_id')::uuid.
-- current_setting(name, true) returns NULL if unset → policy denies all rows (deny-default).
--
-- NOTE: audit_log.shop_id is NULLABLE (super-admin platform actions have no tenant).
--   For audit_log the policy adds IS NOT NULL match so platform rows aren't visible to tenants.
--
-- DROP + CREATE each policy to keep this file idempotent across re-runs.

-- Helper: standard tenant policy
DO $do$
DECLARE
  t text;
  tables text[] := ARRAY[
    'subscription',
    'feature_flag',
    'product',
    'product_variant',
    'stock_item',
    'stock_movement',
    'supplier',
    'purchase',
    'purchase_item',
    'customer',
    'sale',
    'sale_item',
    'payment',
    'account',
    'ledger_entry',
    'expense',
    'closing',
    'forecast_snapshot',
    'sync_mutation'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I '
      'USING (shop_id = current_setting(''app.current_shop_id'', true)::uuid) '
      'WITH CHECK (shop_id = current_setting(''app.current_shop_id'', true)::uuid)',
      t
    );
  END LOOP;
END
$do$;

-- audit_log: nullable shop_id needs an explicit IS NOT NULL
DROP POLICY IF EXISTS tenant_isolation ON audit_log;
CREATE POLICY tenant_isolation ON audit_log
  USING (
    shop_id IS NOT NULL
    AND shop_id = current_setting('app.current_shop_id', true)::uuid
  )
  WITH CHECK (
    shop_id IS NOT NULL
    AND shop_id = current_setting('app.current_shop_id', true)::uuid
  );
