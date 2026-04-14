ALTER TABLE t_p45794133_smartmach_platform_p.users
  ADD COLUMN IF NOT EXISTS password_hash text,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS t_p45794133_smartmach_platform_p.sessions (
  id          text PRIMARY KEY,
  user_id     integer NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL DEFAULT now() + interval '30 days'
);

CREATE TABLE IF NOT EXISTS t_p45794133_smartmach_platform_p.event_log (
  id          serial PRIMARY KEY,
  user_id     integer NOT NULL,
  action      text NOT NULL,
  entity_type text,
  entity_id   text,
  details     text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS event_log_user_id_idx ON t_p45794133_smartmach_platform_p.event_log(user_id);
CREATE INDEX IF NOT EXISTS sessions_user_id_idx  ON t_p45794133_smartmach_platform_p.sessions(user_id);
