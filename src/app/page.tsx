import type { Metadata } from "next";
import Link from "next/link";
import "@/lib/styles/landing.css";

export const metadata: Metadata = {
  title: "Cinema Flow — Board it. Block it. Render it.",
  description:
    "Storyboard the beats, block the camera in 3D, and wire the generation pipeline that renders your shot — all in one place.",
};

// Swap these for your real routes if storyboard/previs/flow live somewhere else.
const ROUTES = { storyboard: "/storyboard", previs: "/previs", flow: "/flow" };

export default function Home() {
  return (
    <div className="cinema Flow">
      {/* Next.js hoists <link>/<meta> tags rendered anywhere in the tree up
          into the document <head> automatically — no need for next/head.
          Using plain tags (fetched client-side) instead of next/font here
          keeps this independent of network access at build time. */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500;600;700&display=swap"
      />
      <div className="leader" />

      <header>
        <nav className="wrap">
          <div className="logo">
            <span className="dot" /> Cinema Flow
          </div>
          <div className="navlinks">
            <Link href={ROUTES.storyboard}>Storyboard</Link>
            <Link href={ROUTES.previs}>Previs</Link>
            <Link href={ROUTES.flow}>Flow</Link>
            <a href="#process">How it works</a>
          </div>
          <Link className="btn btn-primary" href={ROUTES.storyboard}>
            Start free
          </Link>
        </nav>
      </header>

      <section className="hero">
        <div className="wrap hero-grid">
          <div>
            <h1>
              Write the scene.
              <br />
              Block the shot.
              <br />
              Wire the pipeline.
            </h1>
            <p className="lede">
              Cinema Flow carries a story from index cards to a finished sequence — storyboard the
              beats, block the camera in 3D, and wire the generation pipeline that renders it, all
              under one roof.
            </p>
            <div className="hero-ctas">
              <Link className="btn btn-primary" href={ROUTES.storyboard}>
                Start storyboarding
              </Link>
              <a className="btn btn-ghost" href="#process">
                See how a shot gets made
              </a>
            </div>
          </div>
          <div className="viewfinder">
            <div className="tag">
              <span className="rec" /> SHOT 04
            </div>
            <div className="meta">24fps · 35mm</div>
            <svg viewBox="0 0 400 250" preserveAspectRatio="none">
              <line x1="133" y1="0" x2="133" y2="250" stroke="#ffffff" strokeOpacity=".12" />
              <line x1="266" y1="0" x2="266" y2="250" stroke="#ffffff" strokeOpacity=".12" />
              <line x1="0" y1="83" x2="400" y2="83" stroke="#ffffff" strokeOpacity=".12" />
              <line x1="0" y1="166" x2="400" y2="166" stroke="#ffffff" strokeOpacity=".12" />
              <path d="M60 210 L60 195 M60 195 L75 195" stroke="#e8a33d" strokeWidth="2" fill="none" />
              <path d="M340 210 L340 195 M340 195 L325 195" stroke="#e8a33d" strokeWidth="2" fill="none" />
              <path d="M60 40 L60 55 M60 40 L75 40" stroke="#e8a33d" strokeWidth="2" fill="none" />
              <path d="M340 40 L340 55 M340 40 L325 40" stroke="#e8a33d" strokeWidth="2" fill="none" />
              <circle cx="200" cy="125" r="3" fill="#67d8c4" />
              <path
                d="M110 190 Q 150 100 200 125 T 300 70"
                stroke="#67d8c4"
                strokeWidth="1.5"
                fill="none"
                opacity=".85"
              />
              <circle cx="110" cy="190" r="3.5" fill="#67d8c4" opacity=".9" />
              <circle cx="300" cy="70" r="3.5" fill="#67d8c4" opacity=".9" />
            </svg>
          </div>
        </div>
      </section>

      <section className="band" id="storyboard">
        <div className="wrap band-grid">
          <div className="art">
            <div className="board-stack">
              <div className="card c1">
                <div className="frame-no">04A</div>
                <svg className="sketch" viewBox="0 0 100 66">
                  <rect width="100" height="66" fill="#e7dfcd" />
                  <circle cx="30" cy="34" r="12" fill="#c9564f" opacity=".7" />
                  <rect x="55" y="20" width="30" height="30" fill="#3f7d72" opacity=".5" />
                </svg>
                <div className="cap">Wide — she crosses the room, hesitates at the door.</div>
              </div>
              <div className="card c2">
                <div className="frame-no">04B</div>
                <svg className="sketch" viewBox="0 0 100 66">
                  <rect width="100" height="66" fill="#e7dfcd" />
                  <circle cx="60" cy="30" r="16" fill="#e8a33d" opacity=".6" />
                </svg>
                <div className="cap">Close-up — hand on the handle.</div>
              </div>
              <div className="card c3">
                <div className="frame-no">04C</div>
                <svg className="sketch" viewBox="0 0 100 66">
                  <rect width="100" height="66" fill="#e7dfcd" />
                  <rect x="10" y="10" width="80" height="46" fill="#67d8c4" opacity=".35" />
                </svg>
                <div className="cap">Reverse — the room beyond, empty.</div>
              </div>
            </div>
          </div>
          <div>
            <p className="kicker">Storyboard</p>
            <h2>Board the story before you spend a single render.</h2>
            <p>
              Drop in panels, sketch the beat, write what happens. Reorder scenes by dragging
              cards, split a beat into coverage, and keep every version of the sequence next to
              the one before it.
            </p>
            <ul>
              <li>
                <span className="swatch" style={{ background: "#c9564f" }} /> Drag-and-drop
                panels, reorder in seconds
              </li>
              <li>
                <span className="swatch" style={{ background: "#e8a33d" }} /> Pair every frame
                with its own description
              </li>
              <li>
                <span className="swatch" style={{ background: "#67d8c4" }} /> Promote any panel
                straight into Previs
              </li>
            </ul>
            <Link className="open-link" href={ROUTES.storyboard}>
              Open the storyboard
            </Link>
          </div>
        </div>
      </section>

      <section className="band" id="previs">
        <div className="wrap band-grid flip">
          <div>
            <p className="kicker">Previs</p>
            <h2>Block the camera like you&rsquo;re on a real set.</h2>
            <p>
              Place your characters and set pieces, then move the camera on an actual timeline —
              dolly, arc, crane, focal pulls. Keyframe the shot, scrub it, and export a clean
              reference clip your render pipeline can match.
            </p>
            <ul>
              <li>
                <span className="swatch" style={{ background: "#e8a33d" }} /> Full 3D staging, not
                a 2D storyboard trick
              </li>
              <li>
                <span className="swatch" style={{ background: "#67d8c4" }} /> Keyframed camera
                moves on a real timeline
              </li>
              <li>
                <span className="swatch" style={{ background: "#c9564f" }} /> Export the blocking
                straight to MP4
              </li>
            </ul>
            <Link className="open-link" href={ROUTES.previs}>
              Open previs
            </Link>
          </div>
          <div className="art">
            <div className="viewfinder" style={{ aspectRatio: "4/3" }}>
              <div className="tag">
                <span className="rec" /> LIVE
              </div>
              <div className="meta">50mm · f/2.8</div>
              <svg viewBox="0 0 400 300" preserveAspectRatio="none">
                <ellipse cx="200" cy="230" rx="150" ry="14" fill="none" stroke="#2a2d33" />
                <rect
                  x="150"
                  y="150"
                  width="34"
                  height="60"
                  rx="4"
                  fill="none"
                  stroke="#67d8c4"
                  strokeWidth="1.5"
                />
                <circle cx="167" cy="140" r="14" fill="none" stroke="#67d8c4" strokeWidth="1.5" />
                <path
                  d="M270 230 L 320 90 M270 230 L 220 90 M320 90 L220 90"
                  stroke="#e8a33d"
                  strokeWidth="1.2"
                  opacity=".8"
                  fill="none"
                />
                <rect
                  x="290"
                  y="215"
                  width="20"
                  height="14"
                  rx="2"
                  fill="none"
                  stroke="#e8a33d"
                  strokeWidth="1.4"
                />
              </svg>
            </div>
          </div>
        </div>
      </section>

      <section className="band" id="flow">
        <div className="wrap band-grid">
          <div className="art">
            <svg viewBox="0 0 400 260" style={{ width: "100%" }}>
              <path className="edge" d="M96 60 C 150 60, 150 90, 190 90" />
              <path className="edge" d="M96 150 C 150 150, 150 100, 190 100" />
              <path className="edge" d="M270 95 C 310 95, 310 60, 350 60" />
              <path className="edge" d="M270 105 C 310 105, 310 150, 350 150" />
              <g>
                <rect className="node" x="20" y="34" width="76" height="52" rx="6" />
                <text className="node-title" x="30" y="55">
                  Reference
                </text>
                <text className="node-title" x="30" y="68" opacity=".6">
                  image
                </text>
                <circle className="node-port" cx="96" cy="60" r="3" />
              </g>
              <g>
                <rect className="node" x="20" y="124" width="76" height="52" rx="6" />
                <text className="node-title" x="30" y="145">
                  Camera
                </text>
                <text className="node-title" x="30" y="158" opacity=".6">
                  previs clip
                </text>
                <circle className="node-port" cx="96" cy="150" r="3" />
              </g>
              <g>
                <rect className="node" x="190" y="66" width="80" height="52" rx="6" />
                <text className="node-title" x="200" y="87">
                  Generation
                </text>
                <text className="node-title" x="200" y="100" opacity=".6">
                  model
                </text>
                <circle className="node-port" cx="190" cy="90" r="3" />
                <circle className="node-port" cx="190" cy="100" r="3" />
                <circle className="node-port" cx="270" cy="95" r="3" />
              </g>
              <g>
                <rect className="node" x="350" y="34" width="34" height="52" rx="6" />
                <circle className="node-port" cx="350" cy="60" r="3" />
              </g>
              <g>
                <rect className="node" x="350" y="124" width="34" height="52" rx="6" />
                <circle className="node-port" cx="350" cy="150" r="3" />
              </g>
            </svg>
          </div>
          <div>
            <p className="kicker">Flow</p>
            <h2>Wire the models that actually render the shot.</h2>
            <p>
              Connect your reference stills, your previs clip, and a chain of generation models on
              an open canvas. Swap a node for a different model without redoing the rest, and save
              the graph as a reusable pipeline for the next shot.
            </p>
            <ul>
              <li>
                <span className="swatch" style={{ background: "#67d8c4" }} /> Node-based, so every
                step stays visible
              </li>
              <li>
                <span className="swatch" style={{ background: "#e8a33d" }} /> Feed it your
                storyboard panel or previs clip directly
              </li>
              <li>
                <span className="swatch" style={{ background: "#c9564f" }} /> Save a graph once,
                reuse it across shots
              </li>
            </ul>
            <Link className="open-link" href={ROUTES.flow}>
              Open flow
            </Link>
          </div>
        </div>
      </section>

      <section className="process" id="process">
        <div className="wrap">
          <h2>One story, four passes.</h2>
          <div className="steps">
            <div className="step">
              <div className="n">1</div>
              <h3>Board</h3>
              <p>Sketch the beats and write what happens in each panel.</p>
            </div>
            <div className="step">
              <div className="n">2</div>
              <h3>Block</h3>
              <p>Stage the scene in 3D and keyframe the camera move.</p>
            </div>
            <div className="step">
              <div className="n">3</div>
              <h3>Wire</h3>
              <p>Connect the models that will generate the finished frame.</p>
            </div>
            <div className="step">
              <div className="n">4</div>
              <h3>Render</h3>
              <p>Run the pipeline and drop the shot back into your sequence.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="final" id="final">
        <div className="wrap">
          <h2>Your next scene starts on an empty board.</h2>
          <Link className="btn btn-primary" href={ROUTES.storyboard}>
            Start storyboarding — free
          </Link>
        </div>
      </section>

      <footer>
        <div className="wrap">
          <div>Cinema Flow</div>
          <div className="navlinks">
            <Link href={ROUTES.storyboard}>Storyboard</Link>
            <Link href={ROUTES.previs}>Previs</Link>
            <Link href={ROUTES.flow}>Flow</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
