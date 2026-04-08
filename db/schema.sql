CREATE TABLE IF NOT EXISTS attack_logs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp   TEXT    NOT NULL,
    ip          TEXT    NOT NULL,
    method      TEXT    NOT NULL,
    path        TEXT    NOT NULL,
    user_agent  TEXT,
    body        TEXT,
    attack_type TEXT
);

PRAGMA journal_mode=WAL;
