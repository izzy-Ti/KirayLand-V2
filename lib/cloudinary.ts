// ═══════════════════════════════════════════════════════════
// ኪራይLand — Cloudinary Upload & Transformation Utilities
// ═══════════════════════════════════════════════════════════

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!

// ── Upload file directly to Cloudinary (client-side) ───────
export async function uploadToCloudinary(
  file: File,
  options?: {
    folder?: string
    tags?: string[]
    transformation?: string
  }
): Promise<CloudinaryUploadResult> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', UPLOAD_PRESET)
  formData.append('folder', options?.folder || 'kirayland/items')
  
  if (options?.tags) {
    formData.append('tags', options.tags.join(','))
  }

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: 'POST', body: formData }
  )

  if (!response.ok) {
    throw new Error('Cloudinary upload failed')
  }

  return response.json()
}

// ── Generate optimized image URL ───────────────────────────
export function cloudinaryUrl(
  publicId: string,
  options?: {
    width?: number
    height?: number
    crop?: 'fill' | 'fit' | 'scale' | 'thumb'
    quality?: 'auto' | number
    format?: 'auto' | 'webp' | 'avif'
    gravity?: 'auto' | 'face' | 'center'
  }
): string {
  const transforms: string[] = []

  if (options?.width) transforms.push(`w_${options.width}`)
  if (options?.height) transforms.push(`h_${options.height}`)
  if (options?.crop) transforms.push(`c_${options.crop}`)
  if (options?.quality) transforms.push(`q_${options.quality}`)
  if (options?.format) transforms.push(`f_${options.format}`)
  if (options?.gravity) transforms.push(`g_${options.gravity}`)

  // Default optimizations
  if (!options?.quality) transforms.push('q_auto')
  if (!options?.format) transforms.push('f_auto')

  const transformStr = transforms.length > 0 ? transforms.join(',') + '/' : ''

  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${transformStr}${publicId}`
}

// ── Thumbnail URL shortcut ─────────────────────────────────
export function thumbnailUrl(publicId: string, size = 400): string {
  return cloudinaryUrl(publicId, {
    width: size,
    height: size,
    crop: 'fill',
    gravity: 'auto',
  })
}

// ── Cover image URL ────────────────────────────────────────
export function coverImageUrl(publicId: string): string {
  return cloudinaryUrl(publicId, {
    width: 800,
    height: 600,
    crop: 'fill',
    gravity: 'auto',
  })
}

// ── Upload result type ─────────────────────────────────────
export interface CloudinaryUploadResult {
  public_id: string
  secure_url: string
  url: string
  width: number
  height: number
  format: string
  bytes: number
  resource_type: string
  created_at: string
}
