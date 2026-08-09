'use client'

import { useEffect, useState, useCallback } from 'react'
import { DownloadSimple, X, DeviceMobile, Desktop } from '@phosphor-icons/react'

// The BeforeInstallPromptEvent is not in the standard TypeScript lib yet
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
  prompt(): Promise<void>
}

/**
 * PWAInstallPrompt
 *
 * A subtle floating install banner that appears after 4 seconds if:
 * 1. The `beforeinstallprompt` event fires (Chrome/Edge/Android) — uses native prompt.
 * 2. On iOS Safari — shows manual "Add to Home Screen" instructions.
 *
 * Dismissed state is persisted in sessionStorage so it doesn't reappear in the same session.
 * Disappears permanently once the app is installed.
 */
export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isVisible, setIsVisible]           = useState(false)
  const [isIOS, setIsIOS]                   = useState(false)
  const [isInstalled, setIsInstalled]       = useState(false)
  const [isInstalling, setIsInstalling]     = useState(false)
  const [isMounted, setIsMounted]           = useState(false)

  const dismiss = useCallback(() => {
    setIsVisible(false)
    try { sessionStorage.setItem('pwa-prompt-dismissed', '1') } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    setIsMounted(true)

    // Already installed (standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    // Don't show if dismissed this session
    try {
      if (sessionStorage.getItem('pwa-prompt-dismissed')) return
    } catch { /* ignore */ }

    // Detect iOS Safari (no beforeinstallprompt support)
    const ua = navigator.userAgent
    const isIOSDevice = /iphone|ipad|ipod/i.test(ua) && !(window as unknown as Record<string, unknown>).MSStream
    const isSafari = /safari/i.test(ua) && !/chrome|crios|fxios/i.test(ua)

    if (isIOSDevice && isSafari) {
      setIsIOS(true)
      const timer = setTimeout(() => setIsVisible(true), 4000)
      return () => clearTimeout(timer)
    }

    // Chrome / Edge / Android — capture the native install prompt
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      const timer = setTimeout(() => setIsVisible(true), 4000)
      // Store timer ref for cleanup
      ;(handler as unknown as Record<string, unknown>)._timer = timer
    }

    window.addEventListener('beforeinstallprompt', handler)

    // Hide if installed from somewhere else
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true)
      setIsVisible(false)
    })

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      const t = (handler as unknown as Record<string, unknown>)._timer
      if (typeof t === 'number') clearTimeout(t)
    }
  }, [])

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return
    setIsInstalling(true)
    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setIsInstalled(true)
        setIsVisible(false)
      }
    } finally {
      setIsInstalling(false)
      setDeferredPrompt(null)
    }
  }, [deferredPrompt])

  // Don't render server-side or if already installed
  if (!isMounted || isInstalled) return null

  return (
    <div
      aria-live="polite"
      aria-label="Prompt instalasi aplikasi"
      style={{
        position: 'fixed',
        bottom: '1.5rem',
        right: '1.5rem',
        zIndex: 9999,
        pointerEvents: isVisible ? 'auto' : 'none',
        // Animate via transform + opacity
        transform: isVisible ? 'translateY(0) scale(1)' : 'translateY(1.5rem) scale(0.96)',
        opacity: isVisible ? 1 : 0,
        transition: 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.25s ease',
        willChange: 'transform, opacity',
      }}
    >
      <div
        style={{
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: '0.75rem',
          boxShadow: '0 8px 32px rgba(0,0,0,0.10), 0 1.5px 4px rgba(0,0,0,0.06)',
          padding: '1rem 1.125rem',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.875rem',
          maxWidth: '22rem',
          minWidth: '18rem',
        }}
      >
        {/* Icon */}
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: '0.5rem',
            background: 'linear-gradient(135deg, #ccfbf1 0%, #99f6e4 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {isIOS
            ? <DeviceMobile size={20} weight="duotone" style={{ color: '#0d9488' }} />
            : <Desktop size={20} weight="duotone" style={{ color: '#0d9488' }} />
          }
        </div>

        {/* Text + action */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontSize: '0.8125rem',
            fontWeight: 600,
            color: '#111111',
            margin: 0,
            lineHeight: 1.3,
          }}>
            Pasang sebagai Aplikasi
          </p>
          <p style={{
            fontSize: '0.6875rem',
            color: '#6b7280',
            margin: '0.25rem 0 0.75rem',
            lineHeight: 1.5,
          }}>
            {isIOS
              ? 'Ketuk ikon Bagikan (↑) lalu pilih "Add to Home Screen" untuk akses offline.'
              : 'Instal kindalikepdf dan gunakan 100% offline, tanpa browser.'
            }
          </p>

          {!isIOS && (
            <button
              id="pwa-install-btn"
              onClick={handleInstall}
              disabled={isInstalling}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.375rem',
                padding: '0.375rem 0.75rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: '#fff',
                background: isInstalling ? '#5eead4' : '#0d9488',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: isInstalling ? 'wait' : 'pointer',
                transition: 'background 0.15s ease, transform 0.1s ease',
              }}
              onMouseEnter={(e) => {
                if (!isInstalling) e.currentTarget.style.background = '#0f766e'
              }}
              onMouseLeave={(e) => {
                if (!isInstalling) e.currentTarget.style.background = '#0d9488'
              }}
              onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.97)' }}
              onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
            >
              <DownloadSimple size={13} weight="bold" />
              {isInstalling ? 'Memasang…' : 'Pasang Sekarang'}
            </button>
          )}
        </div>

        {/* Close button */}
        <button
          id="pwa-prompt-dismiss-btn"
          onClick={dismiss}
          aria-label="Tutup notifikasi instalasi"
          style={{
            background: 'none',
            border: 'none',
            padding: '0.125rem',
            cursor: 'pointer',
            color: '#9ca3af',
            flexShrink: 0,
            borderRadius: '0.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'color 0.15s ease',
            marginTop: '-0.125rem',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#374151' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#9ca3af' }}
        >
          <X size={15} weight="bold" />
        </button>
      </div>
    </div>
  )
}
