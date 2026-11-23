import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
    },
  },
})

export function refreshCompensation(employeeId?: string) {
  void queryClient.invalidateQueries({ queryKey: ['directory'] })
  void queryClient.invalidateQueries({ queryKey: ['summary'] })
  void queryClient.invalidateQueries({ queryKey: ['charts'] })
  if (employeeId) void queryClient.invalidateQueries({ queryKey: ['employee', employeeId] })
}
