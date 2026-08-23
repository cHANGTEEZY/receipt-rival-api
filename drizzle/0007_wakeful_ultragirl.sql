CREATE TYPE "public"."receipt_sync_operation_type" AS ENUM('receipt_bundle', 'receipt_image');--> statement-breakpoint
CREATE SEQUENCE "public"."payment_sync_version_seq";--> statement-breakpoint
CREATE TABLE "receipt_sync_operation" (
	"id" text PRIMARY KEY NOT NULL,
	"operation_id" text NOT NULL,
	"operation_type" "receipt_sync_operation_type" NOT NULL,
	"user_id" text NOT NULL,
	"payment_id" text,
	"request_hash" text NOT NULL,
	"response" jsonb,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "receipt_sync_operation_user_key" UNIQUE("user_id","operation_type","operation_id")
);
--> statement-breakpoint
ALTER TABLE "payment" ADD COLUMN "receipt_image_file_id" text;--> statement-breakpoint
ALTER TABLE "payment" ADD COLUMN "receipt_image_upload_id" text;--> statement-breakpoint
ALTER TABLE "payment" ADD COLUMN "receipt_image_mime_type" varchar(100);--> statement-breakpoint
ALTER TABLE "payment" ADD COLUMN "receipt_image_byte_size" bigint;--> statement-breakpoint
ALTER TABLE "payment" ADD COLUMN "receipt_image_content_hash" text;--> statement-breakpoint
ALTER TABLE "payment" ADD COLUMN "sync_version" bigint DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "payment" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "payment" ALTER COLUMN "sync_version" SET DEFAULT nextval('public.payment_sync_version_seq');--> statement-breakpoint
UPDATE "payment" SET "sync_version" = nextval('public.payment_sync_version_seq');--> statement-breakpoint
ALTER TABLE "receipt_sync_operation" ADD CONSTRAINT "receipt_sync_operation_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipt_sync_operation" ADD CONSTRAINT "receipt_sync_operation_payment_id_payment_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payment"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "receipt_sync_operation_payment_idx" ON "receipt_sync_operation" USING btree ("payment_id");--> statement-breakpoint
CREATE INDEX "payment_syncVersion_idx" ON "payment" USING btree ("sync_version");--> statement-breakpoint
CREATE OR REPLACE FUNCTION "bump_payment_sync_version"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	NEW."sync_version" := nextval('public.payment_sync_version_seq');
	NEW."updated_at" := now();
	RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER "payment_sync_version_on_update"
BEFORE UPDATE ON "payment"
FOR EACH ROW EXECUTE FUNCTION "bump_payment_sync_version"();--> statement-breakpoint
CREATE OR REPLACE FUNCTION "bump_parent_payment_sync_version"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
	parent_payment_id text;
BEGIN
	IF TG_OP = 'DELETE' THEN
		parent_payment_id := OLD."payment_id";
	ELSE
		parent_payment_id := NEW."payment_id";
	END IF;
	UPDATE "payment" SET "updated_at" = now() WHERE "id" = parent_payment_id;
	IF TG_OP = 'DELETE' THEN
		RETURN OLD;
	END IF;
	RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER "payment_item_parent_sync_version"
AFTER INSERT OR UPDATE OR DELETE ON "payment_item"
FOR EACH ROW EXECUTE FUNCTION "bump_parent_payment_sync_version"();--> statement-breakpoint
CREATE TRIGGER "payment_participant_parent_sync_version"
AFTER INSERT OR UPDATE OR DELETE ON "payment_participant"
FOR EACH ROW EXECUTE FUNCTION "bump_parent_payment_sync_version"();--> statement-breakpoint
CREATE TRIGGER "payment_split_parent_sync_version"
AFTER INSERT OR UPDATE OR DELETE ON "payment_split"
FOR EACH ROW EXECUTE FUNCTION "bump_parent_payment_sync_version"();--> statement-breakpoint
CREATE TRIGGER "payment_item_assignment_parent_sync_version"
AFTER INSERT OR UPDATE OR DELETE ON "payment_item_assignment"
FOR EACH ROW EXECUTE FUNCTION "bump_parent_payment_sync_version"();