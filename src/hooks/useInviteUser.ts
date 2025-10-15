import { useState } from 'react'

export function useInviteUser() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const inviteUser = async (brandId: string, email: string, role: 'admin' | 'editor') => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          brandId,
          email,
          role,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to invite user')
      }

      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to invite user'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return {
    inviteUser,
    loading,
    error,
  }
}
