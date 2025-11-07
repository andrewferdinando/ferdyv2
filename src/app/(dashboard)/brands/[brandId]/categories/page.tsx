'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function CategoriesRedirectPage() {
  const params = useParams()
  const router = useRouter()
  const brandId = params.brandId as string

  useEffect(() => {
    if (brandId) {
      router.replace(`/brands/${brandId}/engine-room/categories`)
    }
  }, [brandId, router])

  return null
}
