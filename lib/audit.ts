import { prisma } from "./db"

export async function createAuditLog({
    userId,
    action,
    resource,
    resourceId,
    details
}: {
    userId: string
    action: string
    resource: string
    resourceId?: string
    details?: any
}) {
    try {
        return await prisma.auditLog.create({
            data: {
                userId,
                action,
                resource,
                resourceId,
                details: details ? (typeof details === 'string' ? details : JSON.stringify(details)) : null
            }
        })
    } catch (error) {
        console.error("Audit log error:", error)
    }
}
