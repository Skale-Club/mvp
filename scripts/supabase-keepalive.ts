import "dotenv/config";
import { pool } from "../server/db.ts";

async function main() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS supabase_keepalive (
      id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
      last_heartbeat_at timestamptz NOT NULL DEFAULT now(),
      last_heartbeat_hour_utc smallint NOT NULL DEFAULT EXTRACT(HOUR FROM now()),
      heartbeat_count integer NOT NULL DEFAULT 0,
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  const result = await pool.query<{
    id: number;
    last_heartbeat_at: Date;
    last_heartbeat_hour_utc: number;
    heartbeat_count: number;
  }>(`
    INSERT INTO supabase_keepalive (id, last_heartbeat_at, last_heartbeat_hour_utc, heartbeat_count, updated_at)
    VALUES (1, now(), EXTRACT(HOUR FROM now())::smallint, 1, now())
    ON CONFLICT (id)
    DO UPDATE
      SET last_heartbeat_at = now(),
          last_heartbeat_hour_utc = EXTRACT(HOUR FROM now())::smallint,
          heartbeat_count = supabase_keepalive.heartbeat_count + 1,
          updated_at = now()
    RETURNING id, last_heartbeat_at, last_heartbeat_hour_utc, heartbeat_count;
  `);

  const row = result.rows[0];
  console.log(
    JSON.stringify(
      {
        message: "Supabase keepalive heartbeat written.",
        id: row.id,
        lastHeartbeatAt: row.last_heartbeat_at.toISOString(),
        lastHeartbeatHourUtc: row.last_heartbeat_hour_utc,
        heartbeatCount: row.heartbeat_count,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error("Supabase keepalive failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
