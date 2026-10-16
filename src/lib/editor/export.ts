import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'
import type { Asset, Clip, Track } from './store'

const W = 1280, H = 720, FPS = 24
let ff: FFmpeg | null = null
let report: (p: number) => void = () => {}

async function load() {
  if (ff) return ff
  const f = new FFmpeg()
  f.on('progress', ({ progress }) => report(Math.min(1, Math.max(0, progress))))
  const base = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd'
  await f.load({ coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, 'text/javascript'), wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, 'application/wasm') })
  return (ff = f)
}

/** atempo only accepts 0.5–2, so chain it for larger/smaller speeds */
const tempo = (s: number) => { const f: string[] = []; while (s > 2) { f.push('atempo=2'); s /= 2 } while (s < 0.5) { f.push('atempo=0.5'); s *= 2 } f.push(`atempo=${s}`); return f.join(',') }

export interface ExportInput { tracks: Track[]; clips: Clip[]; assets: Asset[]; from: number; to: number }

/** Renders the [from, to] range of the timeline to H.264/AAC MP4 (1280x720, 24fps). */
export async function exportMp4(o: ExportInput, onProgress: (p: number) => void, withVideoAudio = true): Promise<Blob> {
  const dur = o.to - o.from
  if (dur <= 0) throw new Error('Nothing to export: the marked range is empty')
  report = onProgress
  const f = await load()
  const args = ['-f', 'lavfi', '-i', `color=c=black:s=${W}x${H}:r=${FPS}:d=${dur}`, '-f', 'lavfi', '-t', `${dur}`, '-i', 'anullsrc=r=44100:cl=stereo']
  const parts: string[] = [], audio = ['1:a'], written = new Set<string>()
  let vLast = '0:v', n = 2

  for (const tr of [...o.tracks].reverse()) { // bottom track first so upper tracks composite on top
    if (tr.muted) continue
    for (const c of o.clips.filter(c => c.trackId === tr.id).sort((a, b) => a.start - b.start)) {
      const a = o.assets.find(x => x.id === c.assetId)
      const cs = Math.max(c.start, o.from), ce = Math.min(c.start + c.duration, o.to)
      if (!a || ce <= cs) continue
      const sp = c.speed ?? 1, ss = (c.trimStart ?? 0) + (cs - c.start) * sp, sd = (ce - cs) * sp, at = cs - o.from
      const name = `in-${a.id}`
      if (!written.has(name)) { await f.writeFile(name, await fetchFile(a.url)); written.add(name) }
      const i = n++
      a.kind === 'image' ? args.push('-loop', '1', '-t', `${ce - cs}`, '-i', name) : args.push('-i', name)
      if (tr.kind === 'video' && a.kind !== 'audio') {
        const trim = a.kind === 'image' ? '' : `trim=start=${ss}:duration=${sd},setpts=(PTS-STARTPTS)/${sp},`
        parts.push(`[${i}:v]${trim}scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2,fps=${FPS},setpts=PTS-STARTPTS+${at}/TB[v${i}]`)
        parts.push(`[${vLast}][v${i}]overlay=eof_action=pass:enable='between(t,${at},${at + ce - cs})'[o${i}]`)
        vLast = `o${i}`
      }
      if (a.kind === 'audio' || (a.kind === 'video' && withVideoAudio)) {
        const ms = Math.round(at * 1000)
        parts.push(`[${i}:a]atrim=start=${ss}:duration=${sd},asetpts=PTS-STARTPTS,${tempo(sp)},volume=${c.volume ?? 1},adelay=${ms}|${ms}[a${i}]`)
        audio.push(`a${i}`)
      }
    }
  }
  parts.push(`${audio.map(l => `[${l}]`).join('')}amix=inputs=${audio.length}:duration=first:normalize=0[aout]`)
  args.push('-filter_complex', parts.join(';'), '-map', vLast.includes(':') ? vLast : `[${vLast}]`, '-map', '[aout]',
    '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '23', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-t', `${dur}`, 'out.mp4')

  const code = await f.exec(args)
  for (const w of written) await f.deleteFile(w).catch(() => {})
  if (code !== 0) {
    if (withVideoAudio) return exportMp4(o, onProgress, false) // retry: some video files have no audio stream
    throw new Error('ffmpeg failed to render this timeline')
  }
  const data = (await f.readFile('out.mp4')) as Uint8Array
  await f.deleteFile('out.mp4')
  return new Blob([data as BlobPart], { type: 'video/mp4' })
}
