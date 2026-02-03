import { NextRequest, NextResponse } from 'next/server'
import { isAllowedFileType } from '@/lib/google-drive/validation'

/**
 * POST /api/google-drive/download
 *
 * Downloads a file from Google Drive using the provided access token.
 * This endpoint acts as a proxy to avoid CORS issues when downloading
 * files directly from the client.
 *
 * Request body:
 * - fileId: Google Drive file ID
 * - accessToken: OAuth access token with drive.readonly scope
 * - fileName: Original file name
 * - mimeType: File MIME type
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { fileId, accessToken, fileName, mimeType } = body

    if (!fileId || !accessToken) {
      return NextResponse.json(
        { error: 'fileId and accessToken are required' },
        { status: 400 }
      )
    }

    // Validate file type before downloading
    if (mimeType && !isAllowedFileType(mimeType)) {
      return NextResponse.json(
        { error: 'File type not supported. Allowed: JPEG, PNG, GIF, WebP images and MP4/MOV videos.' },
        { status: 400 }
      )
    }

    // Download the file from Google Drive
    const downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`

    const response = await fetch(downloadUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[google-drive/download] Failed to download from Google Drive:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      })

      if (response.status === 401 || response.status === 403) {
        return NextResponse.json(
          { error: 'Access denied. Please re-authorize Google Drive access.' },
          { status: 401 }
        )
      }

      if (response.status === 404) {
        return NextResponse.json(
          { error: 'File not found in Google Drive.' },
          { status: 404 }
        )
      }

      return NextResponse.json(
        { error: 'Failed to download file from Google Drive.' },
        { status: response.status }
      )
    }

    // Get the file content
    const fileBuffer = await response.arrayBuffer()

    // Determine content type from response or use provided mimeType
    const contentType = response.headers.get('content-type') || mimeType || 'application/octet-stream'

    // Return the file as a binary response
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName || 'file')}"`,
        'Content-Length': String(fileBuffer.byteLength),
      },
    })
  } catch (error) {
    console.error('[google-drive/download] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Unexpected error while downloading file.' },
      { status: 500 }
    )
  }
}
