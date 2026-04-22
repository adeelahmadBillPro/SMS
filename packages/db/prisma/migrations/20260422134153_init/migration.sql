-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "ShopMemberRole" AS ENUM ('OWNER', 'MANAGER', 'CASHIER', 'ACCOUNTANT', 'VIEWER');

-- CreateEnum
CREATE TYPE "PlanInterval" AS ENUM ('MONTH', 'YEAR', 'LIFETIME');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "ShopStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ProductCategory" AS ENUM ('MOBILE', 'LAPTOP', 'ACCESSORY', 'CHARGER', 'COVER', 'SIM', 'OTHER');

-- CreateEnum
CREATE TYPE "StockStatus" AS ENUM ('IN_STOCK', 'SOLD', 'RETURNED', 'DAMAGED');

-- CreateEnum
CREATE TYPE "StockReason" AS ENUM ('PURCHASE', 'SALE', 'RETURN_IN', 'RETURN_OUT', 'DAMAGE', 'ADJUSTMENT', 'TRANSFER', 'OPENING');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'BANK', 'JAZZCASH', 'EASYPAISA', 'CARD', 'CHEQUE', 'CREDIT');

-- CreateEnum
CREATE TYPE "PaymentPartyType" AS ENUM ('CUSTOMER', 'SUPPLIER');

-- CreateEnum
CREATE TYPE "FbrStatus" AS ENUM ('NONE', 'PENDING', 'POSTED', 'FAILED');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('PENDING', 'COMMITTED', 'FAILED');

-- CreateTable
CREATE TABLE "user" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "email_verified_at" TIMESTAMP(3),
    "password_hash" TEXT,
    "name" TEXT,
    "phone" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price_pkr" DECIMAL(14,2) NOT NULL,
    "interval" "PlanInterval" NOT NULL,
    "is_lifetime" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shop" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "ntn" TEXT,
    "gst" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Karachi',
    "currency" TEXT NOT NULL DEFAULT 'PKR',
    "allow_negative_stock" BOOLEAN NOT NULL DEFAULT false,
    "default_tax_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "fbr_pos_id_enc" TEXT,
    "fbr_api_key_enc" TEXT,
    "opening_cash" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "opening_bank" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "trial_ends_at" TIMESTAMP(3),
    "status" "ShopStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shop_member" (
    "user_id" UUID NOT NULL,
    "shop_id" UUID NOT NULL,
    "role" "ShopMemberRole" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shop_member_pkey" PRIMARY KEY ("user_id","shop_id")
);

-- CreateTable
CREATE TABLE "subscription" (
    "id" UUID NOT NULL,
    "shop_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIALING',
    "trial_ends_at" TIMESTAMP(3),
    "current_period_end" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_flag" (
    "shop_id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,

    CONSTRAINT "feature_flag_pkey" PRIMARY KEY ("shop_id","key")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actor_user_id" UUID,
    "actor_role" TEXT,
    "shop_id" UUID,
    "impersonated_shop_id" UUID,
    "action" TEXT NOT NULL,
    "target_table" TEXT,
    "target_id" TEXT,
    "before" JSONB,
    "after" JSONB,
    "ip" TEXT,
    "user_agent" TEXT,
    "reason" TEXT,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product" (
    "id" UUID NOT NULL,
    "shop_id" UUID NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "ProductCategory" NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'pcs',
    "has_imei" BOOLEAN NOT NULL DEFAULT false,
    "has_serial" BOOLEAN NOT NULL DEFAULT false,
    "has_warranty" BOOLEAN NOT NULL DEFAULT false,
    "cost" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "price" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "tax_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "barcode" TEXT,
    "low_stock_threshold" INTEGER NOT NULL DEFAULT 0,
    "reorder_qty" INTEGER NOT NULL DEFAULT 0,
    "lead_time_days" INTEGER NOT NULL DEFAULT 7,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_variant" (
    "id" UUID NOT NULL,
    "shop_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "color" TEXT,
    "storage" TEXT,
    "ram" TEXT,
    "cost_override" DECIMAL(14,2),
    "price_override" DECIMAL(14,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_variant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_item" (
    "id" UUID NOT NULL,
    "shop_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "variant_id" UUID,
    "imei" TEXT,
    "serial" TEXT,
    "status" "StockStatus" NOT NULL DEFAULT 'IN_STOCK',
    "acquired_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movement" (
    "id" UUID NOT NULL,
    "shop_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "variant_id" UUID,
    "stock_item_id" UUID,
    "qty_delta" INTEGER NOT NULL,
    "reason" "StockReason" NOT NULL,
    "ref_table" TEXT,
    "ref_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,

    CONSTRAINT "stock_movement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier" (
    "id" UUID NOT NULL,
    "shop_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "ntn" TEXT,
    "opening_balance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase" (
    "id" UUID NOT NULL,
    "shop_id" UUID NOT NULL,
    "supplier_id" UUID NOT NULL,
    "invoice_no" TEXT,
    "purchased_at" TIMESTAMP(3) NOT NULL,
    "subtotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "tax" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "client_uuid" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_item" (
    "id" UUID NOT NULL,
    "shop_id" UUID NOT NULL,
    "purchase_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "variant_id" UUID,
    "qty" INTEGER NOT NULL,
    "unit_cost" DECIMAL(14,2) NOT NULL,
    "line_total" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "purchase_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer" (
    "id" UUID NOT NULL,
    "shop_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "cnic" TEXT,
    "opening_balance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "credit_limit" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale" (
    "id" UUID NOT NULL,
    "shop_id" UUID NOT NULL,
    "customer_id" UUID,
    "cashier_user_id" UUID NOT NULL,
    "sold_at" TIMESTAMP(3) NOT NULL,
    "subtotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "discount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "tax" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "credit_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "fbr_invoice_number" TEXT,
    "fbr_qr_code" TEXT,
    "fbr_status" "FbrStatus" NOT NULL DEFAULT 'NONE',
    "fbr_error" TEXT,
    "client_uuid" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_item" (
    "id" UUID NOT NULL,
    "shop_id" UUID NOT NULL,
    "sale_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "variant_id" UUID,
    "stock_item_id" UUID,
    "qty" INTEGER NOT NULL,
    "unit_price" DECIMAL(14,2) NOT NULL,
    "unit_cost" DECIMAL(14,2) NOT NULL,
    "discount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "tax" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "line_total" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "sale_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment" (
    "id" UUID NOT NULL,
    "shop_id" UUID NOT NULL,
    "sale_id" UUID,
    "purchase_id" UUID,
    "party_type" "PaymentPartyType",
    "customer_id" UUID,
    "supplier_id" UUID,
    "method" "PaymentMethod" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "paid_at" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "client_uuid" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" UUID NOT NULL,
    "shop_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AccountType" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_entry" (
    "id" UUID NOT NULL,
    "shop_id" UUID NOT NULL,
    "entry_date" DATE NOT NULL,
    "account_id" UUID NOT NULL,
    "debit" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "credit" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "ref_table" TEXT,
    "ref_id" TEXT,
    "memo" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_entry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense" (
    "id" UUID NOT NULL,
    "shop_id" UUID NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "paid_at" TIMESTAMP(3) NOT NULL,
    "account_id" UUID,
    "paid_via_cash" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "closing" (
    "id" UUID NOT NULL,
    "shop_id" UUID NOT NULL,
    "closing_date" DATE NOT NULL,
    "opening_cash" DECIMAL(14,2) NOT NULL,
    "expected_cash" DECIMAL(14,2) NOT NULL,
    "actual_cash" DECIMAL(14,2) NOT NULL,
    "variance" DECIMAL(14,2) NOT NULL,
    "notes" TEXT,
    "closed_by" UUID NOT NULL,
    "closed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reversed_at" TIMESTAMP(3),
    "reversed_reason" TEXT,

    CONSTRAINT "closing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "forecast_snapshot" (
    "id" UUID NOT NULL,
    "shop_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "snapshot_date" DATE NOT NULL,
    "avg_daily_sales_7d" DECIMAL(10,2) NOT NULL,
    "avg_daily_sales_30d" DECIMAL(10,2) NOT NULL,
    "current_stock" INTEGER NOT NULL,
    "days_of_stock_remaining" DECIMAL(10,2) NOT NULL,
    "reorder_point" INTEGER NOT NULL,
    "reorder_suggested" BOOLEAN NOT NULL,

    CONSTRAINT "forecast_snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_mutation" (
    "id" UUID NOT NULL,
    "shop_id" UUID NOT NULL,
    "client_uuid" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "client_created_at" TIMESTAMP(3) NOT NULL,
    "committed_at" TIMESTAMP(3),
    "status" "SyncStatus" NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sync_mutation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "plan_code_key" ON "plan"("code");

-- CreateIndex
CREATE INDEX "shop_member_shop_id_idx" ON "shop_member"("shop_id");

-- CreateIndex
CREATE INDEX "subscription_shop_id_idx" ON "subscription"("shop_id");

-- CreateIndex
CREATE INDEX "audit_log_shop_id_created_at_idx" ON "audit_log"("shop_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_log_actor_user_id_created_at_idx" ON "audit_log"("actor_user_id", "created_at");

-- CreateIndex
CREATE INDEX "product_shop_id_category_idx" ON "product"("shop_id", "category");

-- CreateIndex
CREATE INDEX "product_shop_id_barcode_idx" ON "product"("shop_id", "barcode");

-- CreateIndex
CREATE UNIQUE INDEX "product_shop_id_sku_key" ON "product"("shop_id", "sku");

-- CreateIndex
CREATE INDEX "product_variant_shop_id_product_id_idx" ON "product_variant"("shop_id", "product_id");

-- CreateIndex
CREATE INDEX "stock_item_shop_id_product_id_status_idx" ON "stock_item"("shop_id", "product_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "stock_item_shop_id_imei_key" ON "stock_item"("shop_id", "imei");

-- CreateIndex
CREATE UNIQUE INDEX "stock_item_shop_id_serial_key" ON "stock_item"("shop_id", "serial");

-- CreateIndex
CREATE INDEX "stock_movement_shop_id_product_id_created_at_idx" ON "stock_movement"("shop_id", "product_id", "created_at");

-- CreateIndex
CREATE INDEX "supplier_shop_id_name_idx" ON "supplier"("shop_id", "name");

-- CreateIndex
CREATE INDEX "purchase_shop_id_purchased_at_idx" ON "purchase"("shop_id", "purchased_at");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_shop_id_client_uuid_key" ON "purchase"("shop_id", "client_uuid");

-- CreateIndex
CREATE INDEX "purchase_item_shop_id_purchase_id_idx" ON "purchase_item"("shop_id", "purchase_id");

-- CreateIndex
CREATE INDEX "customer_shop_id_phone_idx" ON "customer"("shop_id", "phone");

-- CreateIndex
CREATE INDEX "customer_shop_id_name_idx" ON "customer"("shop_id", "name");

-- CreateIndex
CREATE INDEX "sale_shop_id_sold_at_idx" ON "sale"("shop_id", "sold_at");

-- CreateIndex
CREATE INDEX "sale_shop_id_customer_id_idx" ON "sale"("shop_id", "customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "sale_shop_id_client_uuid_key" ON "sale"("shop_id", "client_uuid");

-- CreateIndex
CREATE INDEX "sale_item_shop_id_sale_id_idx" ON "sale_item"("shop_id", "sale_id");

-- CreateIndex
CREATE INDEX "payment_shop_id_paid_at_idx" ON "payment"("shop_id", "paid_at");

-- CreateIndex
CREATE INDEX "payment_shop_id_sale_id_idx" ON "payment"("shop_id", "sale_id");

-- CreateIndex
CREATE INDEX "payment_shop_id_purchase_id_idx" ON "payment"("shop_id", "purchase_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_shop_id_client_uuid_key" ON "payment"("shop_id", "client_uuid");

-- CreateIndex
CREATE UNIQUE INDEX "account_shop_id_code_key" ON "account"("shop_id", "code");

-- CreateIndex
CREATE INDEX "ledger_entry_shop_id_entry_date_idx" ON "ledger_entry"("shop_id", "entry_date");

-- CreateIndex
CREATE INDEX "ledger_entry_shop_id_account_id_idx" ON "ledger_entry"("shop_id", "account_id");

-- CreateIndex
CREATE INDEX "expense_shop_id_paid_at_idx" ON "expense"("shop_id", "paid_at");

-- CreateIndex
CREATE UNIQUE INDEX "closing_shop_id_closing_date_key" ON "closing"("shop_id", "closing_date");

-- CreateIndex
CREATE INDEX "forecast_snapshot_shop_id_snapshot_date_idx" ON "forecast_snapshot"("shop_id", "snapshot_date");

-- CreateIndex
CREATE UNIQUE INDEX "forecast_snapshot_shop_id_product_id_snapshot_date_key" ON "forecast_snapshot"("shop_id", "product_id", "snapshot_date");

-- CreateIndex
CREATE INDEX "sync_mutation_shop_id_status_idx" ON "sync_mutation"("shop_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "sync_mutation_shop_id_client_uuid_key" ON "sync_mutation"("shop_id", "client_uuid");

-- AddForeignKey
ALTER TABLE "shop_member" ADD CONSTRAINT "shop_member_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_member" ADD CONSTRAINT "shop_member_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feature_flag" ADD CONSTRAINT "feature_flag_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variant" ADD CONSTRAINT "product_variant_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variant" ADD CONSTRAINT "product_variant_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_item" ADD CONSTRAINT "stock_item_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_item" ADD CONSTRAINT "stock_item_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_item" ADD CONSTRAINT "stock_item_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movement" ADD CONSTRAINT "stock_movement_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movement" ADD CONSTRAINT "stock_movement_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier" ADD CONSTRAINT "supplier_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase" ADD CONSTRAINT "purchase_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase" ADD CONSTRAINT "purchase_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_item" ADD CONSTRAINT "purchase_item_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_item" ADD CONSTRAINT "purchase_item_purchase_id_fkey" FOREIGN KEY ("purchase_id") REFERENCES "purchase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_item" ADD CONSTRAINT "purchase_item_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_item" ADD CONSTRAINT "purchase_item_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer" ADD CONSTRAINT "customer_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale" ADD CONSTRAINT "sale_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale" ADD CONSTRAINT "sale_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale" ADD CONSTRAINT "sale_cashier_user_id_fkey" FOREIGN KEY ("cashier_user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_item" ADD CONSTRAINT "sale_item_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_item" ADD CONSTRAINT "sale_item_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_item" ADD CONSTRAINT "sale_item_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_item" ADD CONSTRAINT "sale_item_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_item" ADD CONSTRAINT "sale_item_stock_item_id_fkey" FOREIGN KEY ("stock_item_id") REFERENCES "stock_item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_purchase_id_fkey" FOREIGN KEY ("purchase_id") REFERENCES "purchase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entry" ADD CONSTRAINT "ledger_entry_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entry" ADD CONSTRAINT "ledger_entry_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense" ADD CONSTRAINT "expense_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "closing" ADD CONSTRAINT "closing_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forecast_snapshot" ADD CONSTRAINT "forecast_snapshot_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forecast_snapshot" ADD CONSTRAINT "forecast_snapshot_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_mutation" ADD CONSTRAINT "sync_mutation_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
