/**
 * Image & Media Optimization Helper for Çiçekana ERP
 * Converts images to lightweight modern formats (WebP/AVIF) and generates thumbnails
 * server-side or on upload using Sharp.
 */

import sharp from "sharp"

export interface ProcessedImageResult {
  optimizedBuffer: Buffer
  thumbnailBuffer?: Buffer
  format: "webp" | "avif"
  width: number
  height: number
  sizeBytes: number
}

/**
 * Process and convert image buffer to WebP format with optional thumbnail generation.
 */
export async function optimizeImageBuffer(
  inputBuffer: Buffer,
  options: {
    maxWidth?: number
    quality?: number
    generateThumbnail?: boolean
    thumbnailWidth?: number
  } = {}
): Promise<ProcessedImageResult> {
  const {
    maxWidth = 1920,
    quality = 80,
    generateThumbnail = true,
    thumbnailWidth = 300
  } = options

  const image = sharp(inputBuffer)
  const metadata = await image.metadata()

  let pipeline = image.rotate() // Auto-rotate based on EXIF

  if (metadata.width && metadata.width > maxWidth) {
    pipeline = pipeline.resize({ width: maxWidth, fit: "inside", withoutEnlargement: true })
  }

  const optimizedBuffer = await pipeline
    .webp({ quality, effort: 4 })
    .toBuffer()

  const finalMetadata = await sharp(optimizedBuffer).metadata()

  let thumbnailBuffer: Buffer | undefined

  if (generateThumbnail) {
    thumbnailBuffer = await sharp(inputBuffer)
      .rotate()
      .resize({ width: thumbnailWidth, fit: "cover" })
      .webp({ quality: 70 })
      .toBuffer()
  }

  return {
    optimizedBuffer,
    thumbnailBuffer,
    format: "webp",
    width: finalMetadata.width || 0,
    height: finalMetadata.height || 0,
    sizeBytes: optimizedBuffer.length
  }
}
