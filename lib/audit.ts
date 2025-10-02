// Audit Log per GDPR Compliance
import { db } from './db';

export type AuditAction =
  | 'LOGIN'
  | 'LOGOUT'
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'EXPORT'
  | 'ACCESS'
  | 'CONSENT_GIVEN'
  | 'CONSENT_REVOKED'
  | 'DATA_REQUESTED'
  | 'DATA_DELETED';

export async function logAudit(params: {
  userId?: string;
  action: AuditAction;
  entity?: string;
  entityId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}) {
  try {
    await db.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      },
    });
  } catch (error) {
    console.error('Audit log error:', error);
    // Non bloccare l'operazione se il log fallisce
  }
}

export async function getUserAuditLogs(userId: string, limit = 100) {
  return db.auditLog.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

export async function getRecentAuditLogs(limit = 100) {
  return db.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
  });
}
