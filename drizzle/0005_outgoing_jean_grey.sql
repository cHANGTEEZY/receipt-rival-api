-- Stub payment_split rows (id/payment_id only) cannot satisfy new NOT NULL columns.
DELETE FROM "settlement";--> statement-breakpoint
DELETE FROM "payment_split";--> statement-breakpoint
CREATE TYPE "public"."split_status" AS ENUM('pending', 'settled', 'forgiven', 'cancelled');--> statement-breakpoint
CREATE TABLE "payment_item_assignment" (
	"id" text PRIMARY KEY NOT NULL,
	"payment_id" text NOT NULL,
	"payment_item_id" text NOT NULL,
	"user_id" text NOT NULL,
	"share_amount_cents" bigint NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unique_payment_item_assignment" UNIQUE("payment_item_id","user_id"),
	CONSTRAINT "assignment_share_non_negative" CHECK ("payment_item_assignment"."share_amount_cents" >= 0)
);
--> statement-breakpoint
ALTER TABLE "payment_split" ADD COLUMN "debtor_user_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "payment_split" ADD COLUMN "creditor_user_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "payment_split" ADD COLUMN "amount_cents" bigint NOT NULL;--> statement-breakpoint
ALTER TABLE "payment_split" ADD COLUMN "currency" char(3) DEFAULT 'USD' NOT NULL;--> statement-breakpoint
ALTER TABLE "payment_split" ADD COLUMN "status" "split_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "payment_split" ADD COLUMN "due_at" timestamp;--> statement-breakpoint
ALTER TABLE "payment_split" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "payment_item_assignment" ADD CONSTRAINT "payment_item_assignment_payment_id_payment_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_item_assignment" ADD CONSTRAINT "payment_item_assignment_payment_item_id_payment_item_id_fk" FOREIGN KEY ("payment_item_id") REFERENCES "public"."payment_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_item_assignment" ADD CONSTRAINT "payment_item_assignment_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payment_item_assignment_paymentId_idx" ON "payment_item_assignment" USING btree ("payment_id");--> statement-breakpoint
CREATE INDEX "payment_item_assignment_paymentItemId_idx" ON "payment_item_assignment" USING btree ("payment_item_id");--> statement-breakpoint
CREATE INDEX "payment_item_assignment_userId_idx" ON "payment_item_assignment" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "payment_split" ADD CONSTRAINT "payment_split_debtor_user_id_user_id_fk" FOREIGN KEY ("debtor_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_split" ADD CONSTRAINT "payment_split_creditor_user_id_user_id_fk" FOREIGN KEY ("creditor_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payment_split_debtorUserId_idx" ON "payment_split" USING btree ("debtor_user_id");--> statement-breakpoint
CREATE INDEX "payment_split_creditorUserId_idx" ON "payment_split" USING btree ("creditor_user_id");--> statement-breakpoint
ALTER TABLE "payment_split" ADD CONSTRAINT "split_amount_positive" CHECK ("payment_split"."amount_cents" > 0);--> statement-breakpoint
ALTER TABLE "payment_split" ADD CONSTRAINT "no_self_split" CHECK ("payment_split"."debtor_user_id" <> "payment_split"."creditor_user_id");