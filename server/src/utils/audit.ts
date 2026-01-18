import { getDatabase } from '../db/index.js';

interface AuditLogEntry {
  userId?: string;
  agentId?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  details?: string;
  ipAddress?: string;
}

export function auditLog(entry: AuditLogEntry): void {
  try {
    const db = getDatabase();
    db.prepare(`
      INSERT INTO audit_log (user_id, agent_id, action, resource_type, resource_id, details, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      entry.userId ?? null,
      entry.agentId ?? null,
      entry.action,
      entry.resourceType ?? null,
      entry.resourceId ?? null,
      entry.details ?? null,
      entry.ipAddress ?? null
    );
  } catch {
    // Don't fail if audit logging fails
    console.error('Failed to write audit log');
  }
}
