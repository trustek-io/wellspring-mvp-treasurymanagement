import { useHypurr } from "@/providers/hypurr-provider"

interface UseHypurrAPYReturn {
    apy: number | null
    loading: boolean
    error: boolean
    refreshAPY: () => Promise<void>
}

/**
 * Hook to get average APY data from HypurrProvider
 * Now uses the provider's cached state instead of making separate API calls
 */
export function useHypurrAPY(): UseHypurrAPYReturn {
    const { state, fetchAverageAPY } = useHypurr()

    return {
        apy: state.averageAPY,
        loading: state.averageAPYLoading,
        error: state.averageAPY === null && !state.averageAPYLoading,
        refreshAPY: fetchAverageAPY,
    }
}

/**
 * Simplified hook that just returns the average APY value
 */
export function useAverageAPY() {
    const { state } = useHypurr()

    return {
        apy: state.averageAPY,
        loading: state.averageAPYLoading,
        error: state.averageAPY === null && !state.averageAPYLoading,
    }
}