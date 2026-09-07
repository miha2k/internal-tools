-- Triggers to enforce audit_log append-only
-- These triggers prevent UPDATE and DELETE operations on audit_log

CREATE TRIGGER IF NOT EXISTS audit_log_append_only_update
BEFORE UPDATE ON audit_log
BEGIN
  SELECT RAISE(ABORT, 'audit_log is append-only');
END;

CREATE TRIGGER IF NOT EXISTS audit_log_append_only_delete
BEFORE DELETE ON audit_log
BEGIN
  SELECT RAISE(ABORT, 'audit_log is append-only');
END;