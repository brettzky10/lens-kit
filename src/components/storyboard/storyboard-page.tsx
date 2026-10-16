'use client'

import { ChangeEvent, DragEvent, useRef, useState } from 'react'
import { Camera, Check, FileJson, ImagePlus, Pencil, Plus, Printer, Trash2, X } from 'lucide-react'
import { Button } from '../ui/button'
import Link from 'next/link'

type Frame = {
  id: number
  scene: string
  shot: string
  description: string
  prompt: string
  notes: string
  image?: string
}

const initialFrames: Frame[] = [
  { id: 1, scene: '01', shot: '01', description: 'Establish the world and introduce the main subject.', prompt: 'A wide cinematic establishing shot with warm morning light.', notes: 'Opening beat' },
  { id: 2, scene: '01', shot: '02', description: 'Move closer to reveal the subject’s expression.', prompt: 'Medium close-up, shallow depth of field, natural light.', notes: 'Character moment' },
  { id: 3, scene: '01', shot: '03', description: 'The subject notices something beyond the frame.', prompt: 'Over-the-shoulder composition with a mysterious background.', notes: 'Build curiosity' },
]

export default function StoryboardPage() {
  const [frames, setFrames] = useState(initialFrames)
  const [editing, setEditing] = useState<Frame | null>(null)
  const [saved, setSaved] = useState(false)

  function addFrame() {
    setFrames((current) => [...current, { id: Date.now(), scene: '01', shot: String(current.length + 1).padStart(2, '0'), description: '', prompt: '', notes: '' }])
  }

  function updateFrame(frame: Frame) {
    setFrames((current) => current.map((item) => item.id === frame.id ? frame : item))
    setEditing(null)
  }

  function saveStoryboard() {
    const payload = { title: 'Untitled storyboard', updatedAt: new Date().toISOString(), frames }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'storyboard.json'
    link.click()
    URL.revokeObjectURL(url)
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2200)
  }

  return (
    <main className="storyboard-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark"><Camera aria-hidden="true" /></div>
          <div><p className="eyebrow">Creative workspace</p><h1>Storyboard</h1></div>
        </div>
        <div>
            <Button className="button button-primary" size={"lg"}>
                <Link href={"/flow"} >
                    Generate with Flow
                </Link>
            </Button>
        </div>
        <div className="top-actions">
          <span className="frame-count">{frames.length} frames</span>
          <button className="button button-ghost" onClick={() => window.print()}><Printer aria-hidden="true" /> Print to PDF</button>
          <button className="button button-primary" onClick={saveStoryboard}>{saved ? <Check aria-hidden="true" /> : <FileJson aria-hidden="true" />}{saved ? 'Saved' : 'Save JSON'}</button>
        </div>
      </header>
      <section className="intro-row"><div><p className="eyebrow accent">Visual planning</p><h2>Build your story, frame by frame.</h2><p className="muted">Add reference images, refine the details, and export your complete storyboard when it’s ready.</p></div><div className="legend"><span className="legend-dot" /> Draft storyboard</div></section>
      <section className="storyboard-grid" aria-label="Storyboard frames">
        {frames.map((frame, index) => <FrameCard key={frame.id} frame={frame} index={index} onEdit={() => setEditing(frame)} onChange={(next) => updateFrame(next)} />)}
        <button className="add-frame" onClick={addFrame}><span className="add-icon"><Plus aria-hidden="true" /></span><strong>Add frame</strong><span className="muted">Continue the sequence</span></button>
      </section>
      {editing && <EditDialog frame={editing} onClose={() => setEditing(null)} onSave={updateFrame} />}
    </main>
  )
}

function FrameCard({ frame, index, onEdit, onChange }: { frame: Frame; index: number; onEdit: () => void; onChange: (frame: Frame) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  function setImage(file?: File) {
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = () => onChange({ ...frame, image: String(reader.result) })
    reader.readAsDataURL(file)
  }
  function drop(event: DragEvent<HTMLDivElement>) { event.preventDefault(); setDragging(false); setImage(event.dataTransfer.files[0]) }
  function pick(event: ChangeEvent<HTMLInputElement>) { setImage(event.target.files?.[0]) }

  return <article className="frame-card">
    <div className={`image-stage ${dragging ? 'is-dragging' : ''}`} onDragOver={(event) => { event.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={drop} onClick={() => !frame.image && inputRef.current?.click()}>
      {frame.image ? <><img src={frame.image} alt={`Reference for scene ${frame.scene}, shot ${frame.shot}`} /><button className="remove-image" aria-label="Remove image" onClick={(event) => { event.stopPropagation(); onChange({ ...frame, image: undefined }) }}><X aria-hidden="true" /></button></> : <div className="upload-prompt"><ImagePlus aria-hidden="true" /><strong>Drop an image here</strong><span>or click to browse</span></div>}
      <input ref={inputRef} type="file" accept="image/*" onChange={pick} hidden />
      <span className="frame-number">{String(index + 1).padStart(2, '0')}</span>
    </div>
    <div className="frame-body"><div className="frame-meta"><span>Scene {frame.scene}</span><span className="slash">/</span><span>Shot {frame.shot}</span></div><p className={frame.description ? '' : 'empty-copy'}>{frame.description || 'No description yet. Edit this frame to add one.'}</p>{frame.prompt && <p className="prompt-line"><span>Prompt</span>{frame.prompt}</p>}</div>
    <div className="frame-footer"><button onClick={onEdit}><Pencil aria-hidden="true" /> Edit</button><button onClick={() => onChange({ ...frame, image: undefined })}><Trash2 aria-hidden="true" /> Clear</button></div>
  </article>
}

function EditDialog({ frame, onClose, onSave }: { frame: Frame; onClose: () => void; onSave: (frame: Frame) => void }) {
  const [draft, setDraft] = useState(frame)
  return <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="edit-dialog" role="dialog" aria-modal="true" aria-labelledby="edit-title"><div className="dialog-head"><div><p className="eyebrow accent">Frame details</p><h2 id="edit-title">Edit scene {draft.scene} / shot {draft.shot}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close dialog"><X aria-hidden="true" /></button></div><div className="form-grid"><label>Scene<input value={draft.scene} onChange={(e) => setDraft({ ...draft, scene: e.target.value })} /></label><label>Shot<input value={draft.shot} onChange={(e) => setDraft({ ...draft, shot: e.target.value })} /></label><label className="full">Description<textarea rows={3} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="What is happening in this frame?" /></label><label className="full">Prompt<textarea rows={3} value={draft.prompt} onChange={(e) => setDraft({ ...draft, prompt: e.target.value })} placeholder="Describe the visual direction..." /></label><label className="full">Notes<textarea rows={2} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="Camera, movement, timing, or production notes" /></label></div><div className="dialog-actions"><button className="button button-ghost" onClick={onClose}>Cancel</button><button className="button button-primary" onClick={() => onSave(draft)}><Check aria-hidden="true" /> Save changes</button></div></section></div>
}
