'use client'

import { useCallback, useEffect, useState } from 'react'
import { grayDashRequestUrl } from '@/lib/grayDashApi'

export function useGrayDashApi<T>(endpoint: string, intervalMs = 5000) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const url = grayDashRequestUrl(endpoint)
      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
        mode: 'cors',
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        const msg =
          typeof j?.error === 'string'
            ? j.error
            : `HTTP ${res.status}`
        setError(msg)
        setLoading(false)
        return
      }
      const json = (await res.json()) as T
      setData(json)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setLoading(false)
    }
  }, [endpoint])
  useEffect(() => {
    fetchData()
    const id = setInterval(fetchData, intervalMs)
    return () => clearInterval(id)
  }, [fetchData, intervalMs])

  return { data, loading, error, refetch: fetchData }
}
