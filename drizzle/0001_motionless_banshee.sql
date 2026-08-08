CREATE TYPE "public"."friendship_status" AS ENUM('pending', 'accepted', 'removed');--> statement-breakpoint
CREATE TYPE "public"."invite_status" AS ENUM('active', 'expired', 'accepted');--> statement-breakpoint
CREATE TABLE "friend_invite" (
	"id" text PRIMARY KEY NOT NULL,
	"inviter_id" text NOT NULL,
	"invite_token" text NOT NULL,
	"status" "invite_status" DEFAULT 'active' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"accepted_by" text,
	"accepted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "friend_invite_invite_token_unique" UNIQUE("invite_token"),
	CONSTRAINT "friend_invite_not_self" CHECK ("friend_invite"."accepted_by" IS NULL OR "friend_invite"."accepted_by" <> "friend_invite"."inviter_id")
);
--> statement-breakpoint
CREATE TABLE "friendship" (
	"id" text PRIMARY KEY NOT NULL,
	"requester_id" text NOT NULL,
	"addressee_id" text NOT NULL,
	"user_low_id" text NOT NULL,
	"user_high_id" text NOT NULL,
	"status" "friendship_status" DEFAULT 'pending' NOT NULL,
	"requested_at" timestamp DEFAULT now() NOT NULL,
	"accepted_at" timestamp,
	"removed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unique_friendship_pair" UNIQUE("user_low_id","user_high_id"),
	CONSTRAINT "no_self_friendship" CHECK ("friendship"."requester_id" <> "friendship"."addressee_id"),
	CONSTRAINT "normalized_friendship_order" CHECK ("friendship"."user_low_id" < "friendship"."user_high_id")
);
--> statement-breakpoint
ALTER TABLE "friend_invite" ADD CONSTRAINT "friend_invite_inviter_id_user_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friend_invite" ADD CONSTRAINT "friend_invite_accepted_by_user_id_fk" FOREIGN KEY ("accepted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friendship" ADD CONSTRAINT "friendship_requester_id_user_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friendship" ADD CONSTRAINT "friendship_addressee_id_user_id_fk" FOREIGN KEY ("addressee_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friendship" ADD CONSTRAINT "friendship_user_low_id_user_id_fk" FOREIGN KEY ("user_low_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friendship" ADD CONSTRAINT "friendship_user_high_id_user_id_fk" FOREIGN KEY ("user_high_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "friend_invite_inviterId_idx" ON "friend_invite" USING btree ("inviter_id");--> statement-breakpoint
CREATE INDEX "friendship_requesterId_idx" ON "friendship" USING btree ("requester_id");--> statement-breakpoint
CREATE INDEX "friendship_addresseeId_idx" ON "friendship" USING btree ("addressee_id");