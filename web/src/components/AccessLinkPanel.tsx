import { useCallback, useEffect, useState } from 'react'
import QRCode from 'qrcode'
import type { gatesApi, AccessToken } from '../api/gates'
import { primaryButton, secondaryButton } from './buttonStyles'

interface Props {
  api: ReturnType<typeof gatesApi>
  gateId: number
  gateName: string
  onClose: () => void
  onError: (message: string) => void
  onNotice: (message: string) => void
}

/** Admin panel: the gate's QR access link, and regeneration behind a second, typed-confirmation modal. */
export default function AccessLinkPanel({ api, gateId, gateName, onClose, onError, onNotice }: Props) {
  const [access, setAccess] = useState<AccessToken | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [pngs, setPngs] = useState<{ in: string; out: string } | null>(null)

  const load = useCallback(() => {
    api.getAccessToken(gateId).then(setAccess).catch((e: Error) => onError(e.message))
  }, [api, gateId, onError])
  useEffect(load, [load])

  // Rendered in the browser so the token is never sent to a third-party service.
  useEffect(() => {
    if (!access) return
    let cancelled = false
    const render = (url: string) => QRCode.toDataURL(url, { width: 768, margin: 2, errorCorrectionLevel: 'M' })
    Promise.all([render(access.inUrl), render(access.outUrl)])
      .then(([inPng, outPng]) => { if (!cancelled) setPngs({ in: inPng, out: outPng }) })
      .catch((e: Error) => onError(e.message))
    return () => { cancelled = true }
  }, [access, onError])

  const regenerate = async () => {
    setBusy(true)
    try {
      setPngs(null)
      setAccess(await api.regenerateAccessToken(gateId, typed))
      setConfirming(false)
      setTyped('')
      onNotice(`New access link created for ${gateName}. Printed QR codes for the old link no longer work.`)
    } catch (err) {
      onError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3 bg-blue-900 rounded-2xl border border-blue-800 p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-medium text-white">QR access links for {gateName}</h2>
        <button className={secondaryButton} onClick={onClose}>Close</button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {([['in', access?.inUrl], ['out', access?.outUrl]] as const).map(([dir, url]) => (
          <div key={dir} className="space-y-2">
            <h3 className="text-sm font-medium uppercase tracking-wide text-red-500">{dir} code</h3>
            <p className="break-all font-mono text-xs text-blue-200">{url ?? 'Loading…'}</p>
            {pngs && (
              <>
                <img src={pngs[dir]} alt={`${dir} QR code for ${gateName}`} className="w-56 h-56 rounded-lg bg-white" />
                <a
                  href={pngs[dir]}
                  download={`${gateName.replace(/[^\w-]+/g, '-')}-${dir}-qr.png`}
                  className={primaryButton}
                >
                  Download {dir} PNG
                </a>
              </>
            )}
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <button className={secondaryButton} disabled={!access} onClick={() => setConfirming(true)}>
          Regenerate link
        </button>
      </div>

      {confirming && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md space-y-4 rounded-2xl border border-blue-800 bg-blue-900 p-6 text-white">
            <h3 className="text-lg font-semibold text-red-500">Regenerate access link?</h3>
            <p className="text-sm text-blue-200">
              This permanently invalidates the current link and every QR code already printed or shared for{' '}
              <strong className="text-white">{gateName}</strong>. The change is recorded in the audit log. Type the
              gate name to confirm.
            </p>
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={gateName}
              className="w-full rounded-lg border border-blue-800 bg-blue-950 px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
            />
            <div className="flex justify-end gap-2">
              <button className={secondaryButton} onClick={() => { setConfirming(false); setTyped('') }}>Cancel</button>
              <button className={primaryButton} disabled={busy || typed !== gateName} onClick={regenerate}>
                Regenerate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
