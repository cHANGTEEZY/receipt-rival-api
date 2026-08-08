CREATE TYPE "public"."payment_status" AS ENUM('draft', 'finalized', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."split_method" AS ENUM('equal', 'percentage', 'itemized', 'custom');--> statement-breakpoint
CREATE TABLE "payment" (
	"id" text PRIMARY KEY NOT NULL,
	"created_by" text NOT NULL,
	"title" varchar(150) NOT NULL,
	"description" text,
	"currency" char(3) DEFAULT 'USD' NOT NULL,
	"total_amount_cents" bigint DEFAULT 0 NOT NULL,
	"tax_amount_cents" bigint DEFAULT 0 NOT NULL,
	"tip_amount_cents" bigint DEFAULT 0 NOT NULL,
	"discount_amount_cents" bigint DEFAULT 0 NOT NULL,
	"split_method" "split_method" DEFAULT 'equal' NOT NULL,
	"status" "payment_status" DEFAULT 'draft' NOT NULL,
	"due_at" timestamp,
	"finalized_at" timestamp,
	"completed_at" timestamp,
	"cancelled_at" timestamp,
	"location_name" varchar(150),
	"receipt_image_url" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "payment_amounts_non_negative" CHECK ("payment"."total_amount_cents" >= 0
        AND "payment"."tax_amount_cents" >= 0
        AND "payment"."tip_amount_cents" >= 0
        AND "payment"."discount_amount_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE "payment_item" (
	"id" text PRIMARY KEY NOT NULL,
	"payment_id" text NOT NULL,
	"name" varchar(150) NOT NULL,
	"description" text,
	"quantity" numeric(12, 3) DEFAULT '1' NOT NULL,
	"unit_price_cents" bigint NOT NULL,
	"total_price_cents" bigint NOT NULL,
	"category" varchar(80),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "item_quantity_positive" CHECK ("payment_item"."quantity" > 0),
	CONSTRAINT "item_prices_non_negative" CHECK ("payment_item"."unit_price_cents" >= 0 AND "payment_item"."total_price_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE "payment_participant" (
	"id" text PRIMARY KEY NOT NULL,
	"payment_id" text NOT NULL,
	"user_id" text NOT NULL,
	"added_by" text NOT NULL,
	"is_owner" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"nickname_at_time" varchar(100),
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"removed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unique_payment_participant" UNIQUE("payment_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_item" ADD CONSTRAINT "payment_item_payment_id_payment_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_participant" ADD CONSTRAINT "payment_participant_payment_id_payment_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_participant" ADD CONSTRAINT "payment_participant_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_participant" ADD CONSTRAINT "payment_participant_added_by_user_id_fk" FOREIGN KEY ("added_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payment_createdBy_idx" ON "payment" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "payment_item_paymentId_idx" ON "payment_item" USING btree ("payment_id");--> statement-breakpoint
CREATE INDEX "payment_participant_paymentId_idx" ON "payment_participant" USING btree ("payment_id");--> statement-breakpoint
CREATE INDEX "payment_participant_userId_idx" ON "payment_participant" USING btree ("user_id");