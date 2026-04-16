-- Notification logs: audit trail for all outgoing notifications (SMS, email, CRM sync).
-- Added in v1.1 phase 01-lead-notification-log / plan 01-01.

CREATE TABLE IF NOT EXISTS "notification_logs" (
  "id" serial PRIMARY KEY NOT NULL,
  "lead_id" integer,
  "channel" varchar(20) NOT NULL,
  "trigger" varchar(40) NOT NULL,
  "recipient" varchar(255) NOT NULL,
  "recipient_name" varchar(100),
  "subject" varchar(255),
  "preview" text NOT NULL,
  "status" varchar(20) NOT NULL,
  "error_message" text,
  "provider_message_id" varchar(100),
  "metadata" jsonb,
  "sent_at" timestamp DEFAULT now() NOT NULL
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'notification_logs_lead_id_form_leads_id_fk'
  ) THEN
    ALTER TABLE "notification_logs"
      ADD CONSTRAINT "notification_logs_lead_id_form_leads_id_fk"
      FOREIGN KEY ("lead_id") REFERENCES "public"."form_leads"("id")
      ON DELETE set null ON UPDATE no action;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "notification_logs_lead_idx"    ON "notification_logs" USING btree ("lead_id");
CREATE INDEX IF NOT EXISTS "notification_logs_sent_at_idx" ON "notification_logs" USING btree ("sent_at");
CREATE INDEX IF NOT EXISTS "notification_logs_channel_idx" ON "notification_logs" USING btree ("channel");
CREATE INDEX IF NOT EXISTS "notification_logs_status_idx"  ON "notification_logs" USING btree ("status");
