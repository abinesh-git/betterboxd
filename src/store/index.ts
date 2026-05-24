import { create } from 'zustand'
import type { EnrichmentProgress, UserProfile } from '../types'

type ImportStatus = 'idle' | 'parsing' | 'saving' | 'enriching' | 'done' | 'error'

interface AppStore {
  // Import flow
  importStatus: ImportStatus
  importError: string | null
  enrichmentProgress: EnrichmentProgress

  // User
  profile: UserProfile | null
  totalFilms: number

  // Actions
  setImportStatus: (status: ImportStatus) => void
  setImportError: (err: string | null) => void
  setEnrichmentProgress: (p: Partial<EnrichmentProgress>) => void
  setProfile: (profile: UserProfile | null) => void
  setTotalFilms: (n: number) => void
  reset: () => void
}

const initialProgress: EnrichmentProgress = {
  status: 'idle',
  total: 0,
  completed: 0,
  failed: 0,
}

export const useAppStore = create<AppStore>((set) => ({
  importStatus: 'idle',
  importError: null,
  enrichmentProgress: initialProgress,
  profile: null,
  totalFilms: 0,

  setImportStatus: (status) => set({ importStatus: status }),
  setImportError: (err) => set({ importError: err }),
  setEnrichmentProgress: (p) =>
    set((s) => ({
      enrichmentProgress: { ...s.enrichmentProgress, ...p },
    })),
  setProfile: (profile) => set({ profile }),
  setTotalFilms: (n) => set({ totalFilms: n }),
  reset: () =>
    set({
      importStatus: 'idle',
      importError: null,
      enrichmentProgress: initialProgress,
    }),
}))