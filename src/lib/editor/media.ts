import type { Asset } from './store'

/** Read duration + generate a 320x180 poster frame for a file. */
export function probe(file: File): Promise<Omit<Asset, 'id'>> {
  const kind = file.type.startsWith('video') ? 'video' : file.type.startsWith('audio') ? 'audio' : 'image'
  const url = URL.createObjectURL(file)
  if (kind === 'image') return Promise.resolve({ name: file.name, kind, url, duration: 5, thumb: url })
  return new Promise(res => {
    const el = document.createElement(kind === 'video' ? 'video' : 'audio')
    el.preload = 'metadata'; el.muted = true; el.src = url
    const done = (thumb?: string) => res({ name: file.name, kind, url, duration: isFinite(el.duration) ? el.duration : 5, thumb })
    el.onerror = () => done()
    el.onloadedmetadata = () => { if (kind === 'audio') done(); else el.currentTime = Math.min(0.5, el.duration / 2) }
    el.onseeked = () => {
      const c = document.createElement('canvas'); c.width = 320; c.height = 180
      c.getContext('2d')!.drawImage(el as HTMLVideoElement, 0, 0, 320, 180)
      done(c.toDataURL('image/jpeg', 0.7))
    }
  })
}
