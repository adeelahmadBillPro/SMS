-- Enable + FORCE Row-Level Security on every tenant-scoped table.
-- FORCE is critical: without it, the table owner (Prisma's migration user) bypasses RLS.
--
-- Global/un-RLS'd tables (intentionally not listed here):
--   user, plan, shop, shop_member
-- Authorization on shop/shop_member is app-layer (session.user_id → shop_member → shop_id).

ALTER TABLE subscription       ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription       FORCE  ROW LEVEL SECURITY;

ALTER TABLE feature_flag       ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flag       FORCE  ROW LEVEL SECURITY;

ALTER TABLE audit_log          ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log          FORCE  ROW LEVEL SECURITY;

ALTER TABLE product            ENABLE ROW LEVEL SECURITY;
ALTER TABLE product            FORCE  ROW LEVEL SECURITY;

ALTER TABLE product_variant    ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variant    FORCE  ROW LEVEL SECURITY;

ALTER TABLE stock_item         ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_item         FORCE  ROW LEVEL SECURITY;

ALTER TABLE stock_movement     ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movement     FORCE  ROW LEVEL SECURITY;

ALTER TABLE supplier           ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier           FORCE  ROW LEVEL SECURITY;

ALTER TABLE purchase           ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase           FORCE  ROW LEVEL SECURITY;

ALTER TABLE purchase_item      ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_item      FORCE  ROW LEVEL SECURITY;

ALTER TABLE customer           ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer           FORCE  ROW LEVEL SECURITY;

ALTER TABLE sale               ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale               FORCE  ROW LEVEL SECURITY;

ALTER TABLE sale_item          ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_item          FORCE  ROW LEVEL SECURITY;

ALTER TABLE payment            ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment            FORCE  ROW LEVEL SECURITY;

ALTER TABLE account            ENABLE ROW LEVEL SECURITY;
ALTER TABLE account            FORCE  ROW LEVEL SECURITY;

ALTER TABLE ledger_entry       ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_entry       FORCE  ROW LEVEL SECURITY;

ALTER TABLE expense            ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense            FORCE  ROW LEVEL SECURITY;

ALTER TABLE closing            ENABLE ROW LEVEL SECURITY;
ALTER TABLE closing            FORCE  ROW LEVEL SECURITY;

ALTER TABLE forecast_snapshot  ENABLE ROW LEVEL SECURITY;
ALTER TABLE forecast_snapshot  FORCE  ROW LEVEL SECURITY;

ALTER TABLE sync_mutation      ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_mutation      FORCE  ROW LEVEL SECURITY;
