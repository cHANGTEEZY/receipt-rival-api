CREATE TYPE "public"."settlement_status" AS ENUM('pending', 'confirmed', 'rejected');--> statement-breakpoint
CREATE TABLE "payment_split" (
	"id" text PRIMARY KEY NOT NULL,
	"payment_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settlement" (
	"id" text PRIMARY KEY NOT NULL,
	"split_id" text NOT NULL,
	"payer_user_id" text NOT NULL,
	"receiver_user_id" text NOT NULL,
	"amount_cents" bigint NOT NULL,
	"currency" char(3) DEFAULT 'USD' NOT NULL,
	"payment_method" varchar(50),
	"external_reference_id" varchar(150),
	"note" text,
	"proof_image_url" text,
	"status" "settlement_status" DEFAULT 'pending' NOT NULL,
	"paid_at" timestamp DEFAULT now() NOT NULL,
	"confirmed_at" timestamp,
	"rejected_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "settlement_amount_positive" CHECK ("settlement"."amount_cents" > 0),
	CONSTRAINT "no_self_settlement" CHECK ("settlement"."payer_user_id" <> "settlement"."receiver_user_id")
);
--> statement-breakpoint
ALTER TABLE "payment_split" ADD CONSTRAINT "payment_split_payment_id_payment_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlement" ADD CONSTRAINT "settlement_split_id_payment_split_id_fk" FOREIGN KEY ("split_id") REFERENCES "public"."payment_split"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlement" ADD CONSTRAINT "settlement_payer_user_id_user_id_fk" FOREIGN KEY ("payer_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlement" ADD CONSTRAINT "settlement_receiver_user_id_user_id_fk" FOREIGN KEY ("receiver_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payment_split_paymentId_idx" ON "payment_split" USING btree ("payment_id");--> statement-breakpoint
CREATE INDEX "settlement_splitId_idx" ON "settlement" USING btree ("split_id");--> statement-breakpoint
CREATE INDEX "settlement_payerUserId_idx" ON "settlement" USING btree ("payer_user_id");--> statement-breakpoint
CREATE INDEX "settlement_receiverUserId_idx" ON "settlement" USING btree ("receiver_user_id");