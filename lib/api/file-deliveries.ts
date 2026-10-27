// Inter-Branch File Delivery API Functions
import { BASE_URL, handleResponse } from "./api-config"

export interface FileDelivery {
  id: string
  trackingNumber: string
  fromBranchId: string
  fromBranchName?: string
  toBranchId: string
  toBranchName?: string
  title: string
  description?: string
  fileUrls: string[]
  status: "sent" | "received" | "acknowledged" | "completed"
  priority: "low" | "normal" | "high" | "urgent"
  sentBy: string
  sentByName?: string
  receivedBy?: string
  acknowledgedBy?: string
  sentAt: string
  receivedAt?: string
  acknowledgedAt?: string
  completedAt?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface CreateDeliveryInput {
  fromBranchId: string
  toBranchId: string
  title: string
  description?: string
  fileUrls: string[]
  priority?: "low" | "normal" | "high" | "urgent"
}

export interface UpdateDeliveryStatusInput {
  deliveryId: string
  status: FileDelivery["status"]
  notes?: string
  userId: string
}

// Get deliveries for branch (sent or received)
export async function getBranchDeliveries(
  branchId: string,
  type: "sent" | "received" | "all",
  token: string,
): Promise<FileDelivery[]> {
  const res = await fetch(`${BASE_URL}/api/files?branchId=${branchId}&type=${type}`)
  return await handleResponse<FileDelivery[]>(res)
}

// Get all deliveries (Super Admin only)
export async function getAllDeliveries(token: string): Promise<FileDelivery[]> {
  const res = await fetch(`${BASE_URL}/api/files`)
  return await handleResponse<FileDelivery[]>(res)
}

// Create delivery
export async function createDelivery(data: CreateDeliveryInput, userId: string, token: string): Promise<FileDelivery> {
  const res = await fetch(`${BASE_URL}/api/files`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })

  return await handleResponse<FileDelivery>(res)
}

// Update delivery status
export async function updateDeliveryStatus(data: UpdateDeliveryStatusInput, token: string): Promise<FileDelivery> {
  const res = await fetch(`${BASE_URL}/api/files`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })

  return await handleResponse<FileDelivery>(res)
}

// Mock functions kept for compatibility but empty/unused
export function getMockDeliveries(): FileDelivery[] { return [] }
export function initializeMockDeliveries() { }
