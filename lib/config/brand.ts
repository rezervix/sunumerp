import brandData from "./brand.json"

export interface BrandConfig {
  name: string
  productName: string
  providerName: string
  supportName: string
  companyName: string
  contactPerson: string
  copyright: string
}

export const BRAND_CONFIG: BrandConfig = brandData

