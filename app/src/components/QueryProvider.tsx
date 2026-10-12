'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { ToastProvider } from '@/components/ui/Toast'
import { installApiCacheInvalidation } from '@/lib/api-cache'

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 30, // 30 seconds: hopping between pages does not refetch
        gcTime: 1000 * 60 * 5, // 5 minutes
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  }))

  // Any write to /api/* empties the shared GET cache (src/lib/api-cache.ts)
  useEffect(() => {
    installApiCacheInvalidation()
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>{children}</ToastProvider>
    </QueryClientProvider>
  )
}
