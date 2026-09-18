-- Seed baseline reference data. Parks are a small, fixed lookup table
-- (Hollywood and Orlando), not user content, so they are seeded here
-- rather than created through the application.

INSERT OR IGNORE INTO parks (id, name) VALUES ('hollywood', 'Hollywood');
INSERT OR IGNORE INTO parks (id, name) VALUES ('orlando', 'Orlando');
