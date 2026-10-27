// Branch Management API Functions

import type { Branch } from "@/lib/auth/types"
import { BASE_URL, handleResponse } from "./api-config"

export interface CreateBranchInput {
  name: string
  code: string
  address?: string
  phone?: string
  email?: string
  managerId?: string
  logoUrl?: string
  themeColor?: string
  timezone?: string
  operationalHours?: Record<string, any>
}

export interface UpdateBranchInput extends Partial<CreateBranchInput> {
  id: string
  isActive?: boolean
}

// Get all branches
export async function getAllBranches(token: string): Promise<Branch[]> {
  const res = await fetch(`${BASE_URL}/api/branches`)
  return await handleResponse<Branch[]>(res)
}

// Get branches for current user (For now returns all, can be filtered by API later)
export async function getUserBranches(userId: string, token: string): Promise<Branch[]> {
  return getAllBranches(token)
}

// Get single branch
export async function getBranch(id: string, token: string): Promise<Branch | null> {
  const branches = await getAllBranches(token)
  return branches.find((b) => b.id === id) || null
}

// Create new branch
export async function createBranch(data: CreateBranchInput, token: string): Promise<Branch> {
  const res = await fetch(`${BASE_URL}/api/branches`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })

  return await handleResponse<Branch>(res)
}

// Update branch
export async function updateBranch(data: UpdateBranchInput, token: string): Promise<Branch> {
  const res = await fetch(`${BASE_URL}/api/branches`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })

  return await handleResponse<Branch>(res)
}

// Delete branch (soft delete via update)
export async function deleteBranch(id: string, token: string): Promise<void> {
  await updateBranch({ id, isActive: false }, token)
}

// Hard delete branch (not implemented in API yet, using soft delete)
export async function hardDeleteBranch(id: string, token: string): Promise<void> {
  await deleteBranch(id, token)
}

