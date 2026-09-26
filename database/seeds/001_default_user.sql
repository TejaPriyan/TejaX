-- TejaX seed data (optional). The API auto-seeds the demo mission on first
-- boot, so this file is only a convenience for direct SQL setups.

INSERT INTO users (id, username) VALUES ('00000000000000000000000000000000', 'default')
ON CONFLICT (id) DO NOTHING;
