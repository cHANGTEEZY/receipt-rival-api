CREATE TYPE "public"."notification_type" AS ENUM('payment_created', 'payment_updated', 'split_assigned', 'settlement_pending', 'settlement_confirmed', 'settlement_rejected', 'friend_request', 'friend_accepted', 'reminder', 'system');--> statement-breakpoint
CREATE TABLE "notification" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" "notification_type" NOT NULL,
	"title" varchar(150) NOT NULL,
	"message" text NOT NULL,
	"related_payment_id" text,
	"related_split_id" text,
	"is_read" boolean DEFAULT false NOT NULL,
	"read_at" timestamp,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_related_payment_id_payment_id_fk" FOREIGN KEY ("related_payment_id") REFERENCES "public"."payment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_related_split_id_payment_split_id_fk" FOREIGN KEY ("related_split_id") REFERENCES "public"."payment_split"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notification_userId_idx" ON "notification" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notification_relatedPaymentId_idx" ON "notification" USING btree ("related_payment_id");--> statement-breakpoint
CREATE INDEX "notification_relatedSplitId_idx" ON "notification" USING btree ("related_split_id");