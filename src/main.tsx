import { QueryClientProvider } from '@tanstack/react-query'
import { createRoot } from 'react-dom/client'
import { AuthGate } from './AuthGate'
import { queryClient } from './query'
import './style.css'

createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <AuthGate />
  </QueryClientProvider>,
)
