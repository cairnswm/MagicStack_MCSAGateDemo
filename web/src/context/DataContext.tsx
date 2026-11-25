/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useAuth } from './AuthContext'
import { gatesApi, type Gate, type MyAccessHistory, type Property } from '../api/gates'

/**
 * Shared, in-memory data for signed-in users.
 *  - Properties: loaded automatically once an administrator is verified (the API is admin-only). Inactive ones are
 *    included; pages filter on `active`.
 *  - Gates: loaded on demand (`loadGates` per property, `loadMyGates` for a gate controller). Cached data stays
 *    visible while a reload runs, and every `load*` call refetches so gate codes never go stale.
 *  - My access: the signed-in user's own property access records, loaded once for every user as soon as they are
 *    verified (the last 30 days). `loadMoreMyAccess` widens the window; `refreshMyAccess` reloads it after a scan.
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
  myAccess: MyAccessHistory | null
  myAccessLoading: boolean
  myAccessError: string | null
  loadMoreMyAccess: () => Promise<void>
  refreshMyAccess: () => Promise<void>
}

const ACCESS_PAGE_DAYS = 30

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

  const [myAccess, setMyAccess] = useState<MyAccessHistory | null>(null)
  const [myAccessBusy, setMyAccessBusy] = useState(false)
  const [myAccessError, setMyAccessError] = useState<string | null>(null)
  const accessRequest = useRef(0) // ignore responses that arrive after a newer request or sign-out

  const loadAccess = useCallback(
    async (days: number) => {
      const id = ++accessRequest.current
      setMyAccessBusy(true)
      try {
        const history = await api.getMyAccessHistory(days)
        if (id === accessRequest.current) {
          setMyAccess(history)
          setMyAccessError(null)
        }
      } catch (e) {
        if (id === accessRequest.current) setMyAccessError((e as Error).message)
      } finally {
        if (id === accessRequest.current) setMyAccessBusy(false)
      }
    },
    [api],
  )
  const refreshMyAccess = useCallback(() => loadAccess(myAccess?.days ?? ACCESS_PAGE_DAYS), [loadAccess, myAccess?.days])
  const loadMoreMyAccess = useCallback(
    () => loadAccess((myAccess?.days ?? ACCESS_PAGE_DAYS) + ACCESS_PAGE_DAYS),
    [loadAccess, myAccess?.days],
  )

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
      accessRequest.current++
      setMyAccess(null)
      setMyAccessBusy(false)
      setMyAccessError(null)
      return
    }
    if (isAdmin) void refreshProperties()
  }, [token, isAdmin, refreshProperties])

  // The user does not change during a session, so their own access records load once, as soon as they are verified.
  useEffect(() => {
    if (token) void loadAccess(ACCESS_PAGE_DAYS)
  }, [token, loadAccess])

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
    myAccess,
    myAccessLoading: myAccessBusy || (!!token && !myAccess && !myAccessError),
    myAccessError,
    loadMoreMyAccess,
    refreshMyAccess,
  }
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used within DataProvider')
  return ctx
}
