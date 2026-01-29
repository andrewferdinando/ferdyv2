import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import {
  processImage,
  isValidAspectRatio,
  getDefaultCrop,
  type AspectRatio,
  type CropCoordinates,
} from '@/lib/image-processing/processImage'

interface ProcessedImageRecord {
  storage_path: string
  width: number
  height: number
  processed_at: string
}

/**
 * POST /api/assets/process
 *
 * Process an image asset by applying crop and resizing to Meta dimensions.
 *
 * Body: { assetId: string, aspectRatio: '1:1' | '4:5' | '1.91:1' | '9:16' }
 *
 * Returns: { success: true, publicUrl: string } or { error: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const assetId = body.assetId || body.asset_id
    const aspectRatio = body.aspectRatio || body.aspect_ratio

    // Validate inputs
    if (!assetId || typeof assetId !== 'string') {
      return NextResponse.json(
        { error: 'assetId is required' },
        { status: 400 }
      )
    }

    if (!aspectRatio || !isValidAspectRatio(aspectRatio)) {
      return NextResponse.json(
        { error: `Invalid aspectRatio. Must be one of: 1:1, 4:5, 1.91:1, 9:16` },
        { status: 400 }
      )
    }

    // Fetch asset from database
    const { data: asset, error: assetError } = await supabaseAdmin
      .from('assets')
      .select('id, brand_id, storage_path, image_crops, width, height, processed_images')
      .eq('id', assetId)
      .single()

    if (assetError || !asset) {
      console.error('[process-image] Asset not found:', assetError)
      return NextResponse.json(
        { error: 'Asset not found' },
        { status: 404 }
      )
    }

    // Get crop coordinates for this aspect ratio (or use default)
    const crops = asset.image_crops as Record<string, CropCoordinates> | null
    const crop: CropCoordinates = crops?.[aspectRatio] || getDefaultCrop()

    console.log('[process-image] Processing asset', {
      assetId,
      aspectRatio,
      storagePath: asset.storage_path,
      crop,
    })

    // Download original image from Supabase Storage
    const { data: downloadData, error: downloadError } = await supabaseAdmin.storage
      .from('ferdy-assets')
      .download(asset.storage_path)

    if (downloadError || !downloadData) {
      console.error('[process-image] Failed to download original:', downloadError)
      return NextResponse.json(
        { error: 'Failed to download original image' },
        { status: 500 }
      )
    }

    // Convert Blob to Buffer
    const arrayBuffer = await downloadData.arrayBuffer()
    const imageBuffer = Buffer.from(arrayBuffer)

    // Process the image
    const result = await processImage(imageBuffer, aspectRatio as AspectRatio, crop)

    // Generate storage path for processed image
    // Pattern: {original_path}/processed/{name}_{ratio}.jpg
    const originalPath = asset.storage_path
    const pathParts = originalPath.split('/')
    const fileName = pathParts.pop() || 'image'
    const fileNameWithoutExt = fileName.split('.')[0]
    const basePath = pathParts.join('/')
    const ratioSafe = aspectRatio.replace(':', '_').replace('.', '-')
    const processedPath = `${basePath}/processed/${fileNameWithoutExt}_${ratioSafe}.jpg`

    console.log('[process-image] Uploading processed image', {
      assetId,
      aspectRatio,
      processedPath,
      width: result.width,
      height: result.height,
      bufferSize: result.buffer.length,
    })

    // Upload processed image to Supabase Storage
    const { error: uploadError } = await supabaseAdmin.storage
      .from('ferdy-assets')
      .upload(processedPath, result.buffer, {
        contentType: 'image/jpeg',
        upsert: true, // Overwrite if exists
      })

    if (uploadError) {
      console.error('[process-image] Failed to upload processed image:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload processed image' },
        { status: 500 }
      )
    }

    // Update processed_images column in database
    const existingProcessed = (asset.processed_images as Record<string, ProcessedImageRecord>) || {}
    const updatedProcessed: Record<string, ProcessedImageRecord> = {
      ...existingProcessed,
      [aspectRatio]: {
        storage_path: processedPath,
        width: result.width,
        height: result.height,
        processed_at: new Date().toISOString(),
      },
    }

    const { error: updateError } = await supabaseAdmin
      .from('assets')
      .update({ processed_images: updatedProcessed })
      .eq('id', assetId)

    if (updateError) {
      console.error('[process-image] Failed to update asset record:', updateError)
      // Don't fail the request - the image was processed successfully
    }

    // Get public URL for the processed image
    const { data: publicUrlData } = supabaseAdmin.storage
      .from('ferdy-assets')
      .getPublicUrl(processedPath)

    console.log('[process-image] Success', {
      assetId,
      aspectRatio,
      processedPath,
      publicUrl: publicUrlData?.publicUrl,
    })

    return NextResponse.json({
      success: true,
      publicUrl: publicUrlData?.publicUrl || null,
      processedPath,
      width: result.width,
      height: result.height,
    })
  } catch (error) {
    console.error('[process-image] Unexpected error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process image' },
      { status: 500 }
    )
  }
}
