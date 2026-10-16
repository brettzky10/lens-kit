'use client'
import { useEffect } from 'react'

export interface MenuItem { label: string; onClick: () => void; danger?: boolean; sep?: boolean }

export function ContextMenu({ x, y, items, onClose }: { x: number; y: number; items: MenuItem[]; onClose: () => void }) {
  useEffect(() => {
    const close = () => onClose()
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('pointerdown', close); window.addEventListener('keydown', esc); window.addEventListener('blur', close)
    return () => { window.removeEventListener('pointerdown', close); window.removeEventListener('keydown', esc); window.removeEventListener('blur', close) }
  }, [onClose])
  return (
    <div onPointerDown={e => e.stopPropagation()} style={{ left: Math.min(x, innerWidth - 200), top: Math.min(y, innerHeight - items.length * 30 - 16) }}
      className="fixed z-50 min-w-[180px] py-1.5 rounded-xl border border-zinc-700 bg-zinc-800 shadow-2xl text-xs">
      {items.map((it, i) => it.sep
        ? <div key={i} className="h-px my-1 bg-zinc-700" />
        : <button key={i} onClick={() => { it.onClick(); onClose() }} className={`w-full text-left px-3 py-1.5 hover:bg-zinc-700 ${it.danger ? 'text-red-400' : 'text-zinc-300'}`}>{it.label}</button>)}
    </div>
  )
}
