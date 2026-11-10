"use client"

import React, { use } from "react"
import { ProductionModuleReadinessView } from "../components/ProductionModuleReadinessView"

export default function UretimSubModulePage({
  params,
}: {
  params: Promise<{ modul: string }>
}) {
  const { modul } = use(params)
  return <ProductionModuleReadinessView activeSlug={modul} />
}
