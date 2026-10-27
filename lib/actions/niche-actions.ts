"use server"

import { prisma } from "@/lib/db"

export async function createNiche(name: string) {
  if (!name || typeof name !== "string" || name.trim() === "") {
    throw new Error("Geçersiz niş adı")
  }

  const cleanName = name.trim()

  try {
    // Check if it already exists
    const existing = await prisma.niche.findUnique({
      where: { name: cleanName }
    })

    if (existing) {
      return existing
    }

    // Create a new one
    const newNiche = await prisma.niche.create({
      data: {
        name: cleanName
      }
    })

    return newNiche
  } catch (err: any) {
    console.error("Niche creation error:", err)
    throw new Error(err.message || "Niş oluşturulurken bir hata oluştu")
  }
}

export async function getNiches() {
  try {
    return await prisma.niche.findMany({
      orderBy: { name: "asc" }
    })
  } catch (err) {
    console.error("Failed to get niches:", err)
    return []
  }
}
