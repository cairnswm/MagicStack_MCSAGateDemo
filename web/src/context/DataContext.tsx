/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from './AuthContext'
import { gatesApi, type Gate, type Property } from '../api/gates'

/**
 * Shared, in-memory data for signed-in users.
 *  - Properties: loaded automatically once an administrator is verified (the API is admin-only). Inactive ones are
 *    included; pages filter on `active`.
 *  - Gates: loaded on demand (`loadGates` per property, `loadMyGates` for a gate controller). Cached data stays
 *    visible while a reload runs, and every `load*` call refetches so gate codes never go stale.
 *  - Members are private and deliberately NOT held here: the admin-only Members page and gate-controller panel
 *    fetch them when opened and drop them when closed.
 * Everything is cleared on sign-out.
 */
interface DataValue {
  properties: Property[]
  /** True until the first load has finished, and while a reload is running. */
  propertiesLoading: boolean
  propertiesError: string | null
  refreshProperties: () => Promise<void>
  gatesFor: (propertyId: number) => Gate[]
  gatesLoading: (propertyId: number) => boolean
  loadGates: (propertyId: number) => Promise<void>
  myGates: Gate[] | null
  myGatesLoading: boolean
  loadMyGates: () => Promise<void>
}

const DataContext = createContext<DataValue | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  const { token, isAdmin } = useAuth()
  const api = useMemo(() => gatesApi(token), [token])

  const [properties, setProperties] = useState<Property[]>([])
  const [propertiesLoaded, setPropertiesLoaded] = useState(false)
  const [propertiesBusy, setPropertiesBusy] = useState(false)
  const [propertiesError, setPropertiesError] = useState<string | null>(null)
  const [gates, setGates] = useState<Record<number, Gate[]>>({})
  const [gatesBusy, setGatesBusy] = useState<Record<number, boolean>>({})
  const [myGates, setMyGates] = useState<Gate[] | null>(null)
  const [myGatesLoading, setMyGatesLoading] = useState(false)

  const refreshProperties = useCallback(async () => {
    setPropertiesBusy(true)
    try {
      setProperties(await api.listProperties(true))
      setPropertiesError(null)
    } catch (e) {
      setPropertiesError((e as Error).message)
    } finally {
      setPropertiesBusy(false)
      setPropertiesLoaded(true)
    }
  }, [api])

  // Load properties as soon as an administrator is verified; wipe everything when the session ends.
  useEffect(() => {
    if (!token) {
      setProperties([])
      setPropertiesLoaded(false)
      setPropertiesError(null)
      setGates({})
      setGatesBusy({})
      setMyGates(null)
      return
    }
    if (isAdmin) void refreshProperties()
  }, [token, isAdmin, refreshProperties])

  const loadGates = useCallback(
    async (propertyId: number) => {
      setGatesBusy((b) => ({ ...b, [propertyId]: true }))
      try {
        const list = await api.listGates(propertyId, true)
        setGates((g) => ({ ...g, [propertyId]: list }))
      } finally {
        setGatesBusy((b) => ({ ...b, [propertyId]: false }))
      }
    },
    [api],
  )

  const loadMyGates = useCallback(async () => {
    setMyGatesLoading(true)
    try {
      setMyGates(await api.listMyGates())
    } finally {
      setMyGatesLoading(false)
    }
  }, [api])

  const gatesFor = useCallback((propertyId: number) => gates[propertyId] ?? [], [gates])
  const gatesLoading = useCallback((propertyId: number) => gatesBusy[propertyId] ?? false, [gatesBusy])

  const value: DataValue = {
    properties,
    propertiesLoading: propertiesBusy || (isAdmin && !propertiesLoaded),
    propertiesError,
    refreshProperties,
    gatesFor,
    gatesLoading,
    loadGates,
    myGates,
    myGatesLoading,
    loadMyGates,
  }
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used within DataProvider')
  return ctx
}
