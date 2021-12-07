-- liquibase formatted sql
-- changeset keijserjj:1

CREATE TYPE patavi_task_status AS ENUM ( 'unknown', 'accepted', 'failed', 'done');
CREATE TABLE patavi_task (
  id BIGINT PRIMARY KEY, -- flake ID
  creator_name VARCHAR(128) NOT NULL,
  creator_fingerprint VARCHAR(128) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  time_to_live INTERVAL,
  service VARCHAR(128) NOT NULL,
  task JSONB NOT NULL,
  script VARCHAR,
  status patavi_task_status NOT NULL DEFAULT 'unknown',
  result JSONB
);

CREATE FUNCTION patavi_task_timeout() RETURNS trigger
  LANGUAGE plpgsql
  AS '
DECLARE
BEGIN
  DELETE FROM patavi_task WHERE updated_at < NOW() - time_to_live;
  RETURN NULL;
END;
';

CREATE TRIGGER trigger_patavi_task_timeout
  AFTER INSERT ON patavi_task
  EXECUTE PROCEDURE patavi_task_timeout();

CREATE TABLE patavi_file (
  task_id BIGINT REFERENCES patavi_task(id) ON DELETE CASCADE,
  path VARCHAR(256),
  content_type VARCHAR(128),
  content BYTEA,
  PRIMARY KEY (task_id, path)
);
--rollback DROP TABLE patavi_file;
--rollback DROP TRIGGER trigger_patavi_task_timeout;
--rollback DROP FUNCTION patavi_task_timeout;
--rollback DROP TABLE patavi_task;
--rollback DROP TYPE patavi_task_status;