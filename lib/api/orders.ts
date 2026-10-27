// Branch Orders API Functions
import { BASE_URL, handleResponse } from "./api-config"

export interface BranchOrder {
  id: string
  orderNumber: string
  branchId: string
  branchName?: string
  orderType: string
  title: string
  description?: string
  quantity?: number
  priority: "low" | "normal" | "high" | "urgent"
  status: "pending" | "approved" | "in-progress" | "delivered" | "rejected"
  requestedBy: string
  requestedByName?: string
  approvedBy?: string
  assignedTo?: string
  requestedDate: string
  dueDate?: string
  completedDate?: string
  notes?: string
  attachments?: string[]
  createdAt: string
  updatedAt: string
}

export interface CreateOrderInput {
  branchId: string
  orderType: string
  title: string
  description?: string
  quantity?: number
  priority?: "low" | "normal" | "high" | "urgent"
  dueDate?: string
  notes?: string
}

export interface UpdateOrderStatusInput {
  orderId: string
  status: BranchOrder["status"]
  notes?: string
  userId: string
}

// Get orders for branch
export async function getBranchOrders(branchId: string, token: string): Promise<BranchOrder[]> {
  const res = await fetch(`${BASE_URL}/api/orders?branchId=${branchId}`)
  return await handleResponse<BranchOrder[]>(res)
}

// Get all orders (Super Admin only)
export async function getAllOrders(token: string): Promise<BranchOrder[]> {
  const res = await fetch(`${BASE_URL}/api/orders`)
  return await handleResponse<BranchOrder[]>(res)
}

// Create order
export async function createOrder(data: CreateOrderInput, userId: string, token: string): Promise<BranchOrder> {
  const res = await fetch(`${BASE_URL}/api/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })

  return await handleResponse<BranchOrder>(res)
}

// Update order status
export async function updateOrderStatus(data: UpdateOrderStatusInput, token: string): Promise<BranchOrder> {
  const res = await fetch(`${BASE_URL}/api/orders`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })

  return await handleResponse<BranchOrder>(res)
}

// Mock functions kept for compatibility but empty/unused
export function getMockOrders(): BranchOrder[] { return [] }
export function initializeMockOrders() { }
