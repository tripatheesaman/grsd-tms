import { writeFile, mkdir, unlink } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { logger } from './logger'
import { withBasePath } from './base-path'

const UPLOAD_DIR = process.env.UPLOAD_DIR || './public/uploads'
const MAX_FILE_SIZE = 10 * 1024 * 1024 
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/gif',
  'text/plain',
]

export interface UploadResult {
  success: boolean
  filename?: string
  filepath?: string
  error?: string
}

export async function ensureUploadDirectory(): Promise<void> {
  try {
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true })
      logger.info('Upload directory created', { path: UPLOAD_DIR })
    }
  } catch (error) {
    logger.error('Error creating upload directory', error)
    throw new Error('Failed to create upload directory')
  }
}

export async function saveFile(
  file: File | Buffer,
  filename: string,
  subdirectory?: string
): Promise<UploadResult> {
  try {
    await ensureUploadDirectory()

    
    const fileSize = file instanceof File ? file.size : file.length
    if (fileSize > MAX_FILE_SIZE) {
      return {
        success: false,
        error: `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      }
    }

    
    if (file instanceof File) {
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        return {
          success: false,
          error: `File type ${file.type} is not allowed`,
        }
      }
    }

    
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_')
    const timestamp = Date.now()
    const finalFilename = `${timestamp}-${sanitizedFilename}`

    
    const targetDir = subdirectory ? join(UPLOAD_DIR, subdirectory) : UPLOAD_DIR
    if (!existsSync(targetDir)) {
      await mkdir(targetDir, { recursive: true })
    }

    const filepath = join(targetDir, finalFilename)

    
    const buffer = file instanceof File ? Buffer.from(await file.arrayBuffer()) : file

    
    await writeFile(filepath, buffer)

    logger.info('File saved successfully', { filename: finalFilename, filepath })

    return {
      success: true,
      filename: finalFilename,
      filepath,
    }
  } catch (error) {
    logger.error('Error saving file', error, { filename })
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

export async function deleteFile(filepath: string): Promise<boolean> {
  try {
    if (existsSync(filepath)) {
      await unlink(filepath)
      logger.info('File deleted successfully', { filepath })
      return true
    }
    return false
  } catch (error) {
    logger.error('Error deleting file', error, { filepath })
    return false
  }
}

export function getFileUrl(filepath: string): string {
  const normalizedPath = filepath.replace(/\\/g, '/')
  const uploadMarker = '/uploads/'
  const markerIndex = normalizedPath.lastIndexOf(uploadMarker)
  if (markerIndex === -1) {
    return withBasePath('/uploads')
  }
  const uploadPath = normalizedPath.slice(markerIndex)
  return withBasePath(uploadPath)
}

export function validateFile(file: File): { valid: boolean; error?: string } {
  
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    }
  }

  
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `File type ${file.type} is not allowed. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`,
    }
  }

  return { valid: true }
}

