"use client";

/* =============================================================================
 * SHIVAM PHOTOGRAPHY — STORIES IN MOTION
 * -----------------------------------------------------------------------------
 * Single-page cinematic portfolio for videographer and film editor Shivam.
 * The page is one long scroll-driven movie: a logo intro, a sticky scroll
 * journey, a wide act, a fragment world, six video chapters and an end card.
 *
 * HOW THE PAGE IS PUT TOGETHER
 *   <main ref={main}> is the GSAP context scope — every animation below is
 *   created inside gsap.context(..., main) and torn down by context.revert().
 *
 *   1. .intro            Fixed red splash (Shivam wordmark + tagline), plays
 *                        once for 2.6s, then self-removes via `introDone`.
 *   2. .site-header      Fixed chrome: Shivam Photography / wordmark / INDEX.
 *                        Its colour is flipped to dark or light by scroll
 *                        phase in updateHeader() so it stays readable over
 *                        both paper (#eeeae4) and red (#da271b) scenes.
 *   3. .journey (#home)  860svh of scroll driving a 100svh sticky stage:
 *                        opening panel -> circular clip transition -> image
 *                        mosaic -> rotating centre mark -> red crescent ->
 *                        manifesto -> "The storm returns" -> portrait scene.
 *   4. .wide-scene       Full-bleed 2.39:1 panel with parallax copy.
 *   5. .world            Constellation of stills that gather and fall away.
 *   6. .films            Six portfolio chapters, each opening a YouTube modal.
 *   7. .end-card         Credits, trailer call-to-action, legal line.
 *   8. .playback-control Global PAUSE FILMS / PLAY MOTION toggle plus the
 *                        link into ?showcase=1 (55-second guided tour).
 *   9. .film-dialog      User-initiated YouTube playback with a visible fallback.
 *
 * ANIMATION TIMELINE
 *   One master GSAP timeline is pinned to .journey with scrub: 0.55, so scroll
 *   position is the playhead. Key marks: hero fade 0.15, panel clip-to-circle
 *   0.35, mosaic assembly 0.55, mark reveal 1.9, mosaic spin 1.3-3.6, red
 *   crescent 1.8-3.6, red field wipe 2.65, manifesto 2.75-4.0, storm line
 *   4.25, portrait reveal 5.1, word reveal 7.0, settle 8.65. Separate
 *   ScrollTriggers handle the wide scene, the world, per-chapter parallax, the
 *   end card and the .progress-line scrub bar.
 *
 * MEDIA
 *   Every moving panel is <CinemaMedia> — a local poster thumbnail under a
 *   muted YouTube excerpt, with full playback in the film dialog.
 *
 * ACCESSIBILITY & MOTION SAFETY
 *   prefers-reduced-motion skips the intro timer (0ms) and the entire scrub
 *   timeline; .skip-link jumps to #films; every button carries an aria-label;
 *   decorative art is aria-hidden.
 * ============================================================================= */

import { useEffect, useRef, useState, type CSSProperties } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { CinemaMedia } from "@/components/cinema-media";
import { ShowcaseController } from "@/components/showcase-controller";

// The six supplied portfolio films. `id` is the YouTube video id; `image` is
// the locally saved preview thumbnail in public/media/.
const films = [
  { title: "Mohit & Khushi", subtitle: "ENGAGEMENT FILM · 2024", id: "uXhkusf0Tp0", image: "uXhkusf0Tp0.jpg", text: "A celebration of Mohit and Khushi, captured by Shivam Photography." },
  { title: "Avinash & Shaloo", subtitle: "ENGAGEMENT FILM · 2024", id: "5VKSzMeBLTU", image: "5VKSzMeBLTU.jpg", text: "The story of Avinash and Shaloo, told through a cinematic highlight." },
  { title: "Parnav & Priya", subtitle: "ENGAGEMENT FILM · 2024", id: "T_JV_L7GZfo", image: "T_JV_L7GZfo.jpg", text: "A day filled with family, colour and the beginning of a new chapter." },
  { title: "50th Anniversary", subtitle: "GOLDEN MILESTONE", id: "aD03U6Jz13s", image: "aD03U6Jz13s.jpg", text: "Fifty years of memories, gathered into one anniversary film." },
  { title: "Narmata & Harshvardhan", subtitle: "WEDDING FILM · 2024", id: "DoS-VfsWfWw", image: "DoS-VfsWfWw.jpg", text: "A wedding highlight preserving the feeling of Narmata and Harshvardhan’s day." },
  { title: "Sweta & Shyam", subtitle: "ENGAGEMENT FILM · 2024", id: "oMQvQhuHgHE", image: "oMQvQhuHgHE.jpg", text: "Sweta and Shyam’s engagement, remembered in motion." },
];
// The jewellery product shoots now form the moving image orbit in the opening.
const orbitVideos = ["product-shoot-01.mp4", "product-shoot-02.mp4", "product-shoot-03.mp4", "product-shoot-04.mp4", "product-shoot-05.mp4"];
// Lay the mosaic tiles out on a 43%-radius orbit and emit [x%, y%, width%, video].
// data-x/data-y are read back by the timeline to scatter the tiles from centre.
const tiles = orbitVideos.map((video, i) => {
  const angle = i / orbitVideos.length * Math.PI * 2 - Math.PI / 2;
  return [50 + Math.cos(angle) * 43, 50 + Math.sin(angle) * 43, i % 3 === 0 ? 18 : 14, video] as const;
});

// Shivam's wordmark, reused as the intro mark, hero lockup, chapter menu and end card.
function Wordmark({ className = "" }: { className?: string }) { return <span className={`wordmark ${className}`} role="img" aria-label="Shivam Photography"><span>SHIVAM</span></span>; }

const socialLinks = [
  { label: "Instagram", href: "https://www.instagram.com/shivam___photography_?obrf=MXJwY2ttdDFwOHFvbg==", icon: "instagram" },
  { label: "Facebook", href: "https://www.facebook.com/", icon: "facebook" },
  { label: "YouTube", href: "https://www.youtube.com/watch?v=uXhkusf0Tp0", icon: "youtube" },
] as const;

// Group the supplied moving-image work by the kind of story it tells.
const filmShoots = [
  { title: "Event Shoot", note: "CELEBRATIONS · MILESTONES", ids: ["aD03U6Jz13s"] },
  { title: "Personal Shoot", note: "ENGAGEMENT STORIES", ids: ["uXhkusf0Tp0", "5VKSzMeBLTU", "T_JV_L7GZfo", "oMQvQhuHgHE"] },
  { title: "Wedding Shoot", note: "WEDDING FILM", ids: ["DoS-VfsWfWw"] },
];

function SocialIcon({ icon }: { icon: (typeof socialLinks)[number]["icon"] }) {
  if (icon === "instagram") return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="1.8"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="1.8"/><circle cx="17.5" cy="6.7" r="1.1" fill="currentColor"/></svg>;
  if (icon === "facebook") return <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M13.5 21v-8h2.7l.4-3.1h-3.1v-2c0-.9.3-1.5 1.6-1.5h1.7V3.6c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3v2.1H7.3V13h2.8v8z"/></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.6 3.6 12 3.6 12 3.6s-7.6 0-9.4.5A3 3 0 0 0 .5 6.2C0 8 0 12 0 12s0 4 .5 5.8a3 3 0 0 0 2.1 2.1c1.8.5 9.4.5 9.4.5s7.6 0 9.4-.5a3 3 0 0 0 2.1-2.1C24 16 24 12 24 12s0-4-.5-5.8ZM9.6 15.6V8.4l6.3 3.6z"/></svg>;
}

function IntroVideo({ paused }: { paused: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [mediaState, setMediaState] = useState("loading");
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (paused) video.pause();
    else {
      video.muted = false;
      void video.play().then(() => setMediaState("playing")).catch(() => {
        // Browsers block autoplay with sound until a gesture; keep the image moving
        // silently and expose a one-tap sound control in the opening scene.
        video.muted = true;
        setMuted(true);
        setMediaState("sound-required");
        void video.play().catch(() => setMediaState("tap-to-play"));
      });
    }
  }, [paused]);
  const toggleSound = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !muted;
    setMuted(!muted);
    if (muted) void video.play().catch(() => { video.muted = true; setMuted(true); });
  };
  return <div className="intro-video-wrap">
    <div className="cinema-media intro-cinema-media" data-priority="true" data-playing={playing} data-local-playing={playing} data-media-state={playing ? "playing" : mediaState} data-paused={paused}>
      <img src="/media/uXhkusf0Tp0.jpg" alt="" width="1920" height="1080" fetchPriority="high" />
      <video ref={videoRef} className="cinema-local-video intro-video" src="/media/intro.mp4" autoPlay muted={muted} loop playsInline preload="auto" aria-label="Shivam Photography opening film" onCanPlay={() => setMediaState("ready")} onPlaying={() => { setPlaying(true); setMediaState("playing"); }} onPause={() => setPlaying(false)} onError={() => setMediaState("unavailable")} />
    </div>
    <button className="intro-sound-toggle" onClick={toggleSound} aria-label={muted ? "Turn opening video sound on" : "Mute opening video sound"}>{muted ? "SOUND OFF · TAP TO ENABLE" : "SOUND ON"}<span aria-hidden="true">{muted ? "↗" : "♫"}</span></button>
  </div>;
}

export default function Home() {
  const main = useRef<HTMLElement>(null);
  const [menu, setMenu] = useState(false);            // chapter INDEX sheet
  const [bookingOpen, setBookingOpen] = useState(false);
  const [selected, setSelected] = useState<number | null>(null); // open film chapter
  const [paused, setPaused] = useState(false);        // global PAUSE FILMS toggle
  const [introDone, setIntroDone] = useState(false);  // red splash finished
  const [playerError, setPlayerError] = useState(false);
  const [origin, setOrigin] = useState("");           // for the YouTube embed origin param
  const [showcase, setShowcase] = useState(false);    // ?showcase=1 guided tour
  useEffect(() => { setOrigin(window.location.origin); setShowcase(new URLSearchParams(window.location.search).get("showcase") === "1"); }, []);
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mobile = window.innerWidth < 700;
    // The splash is pure decoration: with reduced motion it never appears.
    const introTimer = window.setTimeout(() => setIntroDone(true), reduced ? 0 : 2600);
    const context = gsap.context(() => {
      if (reduced) return;
      // Opening splash: mark rises out of a bottom clip, the rule draws in,
      // the mark shrinks upward, then the whole red field wipes away.
      const intro = gsap.timeline();
      intro.fromTo(".intro-mark", { y: 28, opacity: 0, clipPath: "inset(100% 0 0 0)" }, { y: 0, opacity: 1, clipPath: "inset(0% 0 0 0)", duration: 0.9, ease: "power3.out" }, 0.1)
        .to(".intro-line", { scaleX: 1, duration: 1.2, ease: "power2.inOut" }, 0.35)
        .to(".intro-mark", { scale: 0.2, y: () => -window.innerHeight * 0.5 + 43, duration: 0.9, ease: "power3.inOut" }, 1.2)
        .to(".intro", { clipPath: "inset(0 0 100% 0)", duration: 0.85, ease: "power3.inOut" }, 1.65);
      // Pre-state for the journey: tiles start scattered and oversized, the
      // centred mark / manifesto / storm line / portrait start invisible and
      // the red field starts as a zero-radius circle.
      gsap.set(".mosaic-tile", { scale: 2.1, x: (_, element) => (Number(element.dataset.x) - 50) * 10, y: (_, element) => (Number(element.dataset.y) - 50) * 8, opacity: 0 });
      gsap.set([".center-mark", ".manifesto", ".storm-line", ".portrait-scene"], { autoAlpha: 0 });
      gsap.set(".red-field", { clipPath: "circle(0% at 50% 50%)" });
      gsap.set(".red-crescent", { autoAlpha: 0, scale: 0.6, rotation: -70 });
      // MASTER TIMELINE — pinned to .journey; scroll position is the playhead.
      const tl = gsap.timeline({ defaults: { ease: "power2.inOut" }, scrollTrigger: { trigger: ".journey", start: "top top", end: "bottom bottom", scrub: 0.55, invalidateOnRefresh: true } });
      tl.to(".hero-copy, .hero-footer", { opacity: 0, y: -35, duration: 0.55 }, 0.15)
        .to(".opening-panel", { clipPath: "circle(44vmin at 50% 50%)", scale: mobile ? 0.61 : 0.47, x: 0, y: 0, duration: 1.5 }, 0.35)
        .to(".opening-panel", { scale: 0.1, autoAlpha: 0, rotation: -28, duration: 0.8 }, 1.7)
        .to(".opening-panel .image-shade", { opacity: 0, duration: 0.9 }, 0.7)
        .to(".mosaic-tile", { scale: 1, x: 0, y: 0, opacity: 1, stagger: 0.025, duration: 1.55 }, 0.55)
        .to(".center-mark", { autoAlpha: 1, scale: 1, duration: 0.7 }, 1.9)
        .to(".mosaic", { rotation: -210, rotationX: 10, duration: 2.3, ease: "none" }, 1.3)
        .to(".mosaic-tile", { rotationY: (i) => i % 2 === 0 ? 22 : -22, rotationZ: (i) => i % 2 === 0 ? 14 : -14, duration: 2.3, ease: "none" }, 1.3)
        .to(".center-mark .wordmark", { rotation: -360, duration: 1.9, ease: "power2.inOut" }, 1.9)
        .to(".red-crescent", { autoAlpha: 1, scale: 1, duration: 0.5 }, 1.8)
        .to(".red-crescent", { rotation: 360, scale: 1.6, duration: 1.8, ease: "power2.inOut" }, 2.0)
        .to(".red-crescent", { autoAlpha: 0, duration: 0.5 }, 3.1)
        .to(".red-field", { clipPath: "circle(150% at 50% 50%)", duration: 1.0, ease: "power2.inOut" }, 2.65)
        .to(".center-mark", { opacity: 0.12, scale: 1.2, duration: 0.7 }, 3.1)
        .fromTo(".manifesto", { y: 35 }, { y: 0, autoAlpha: 1, duration: 0.7 }, 2.75)
        .to(".mosaic-tile", { scale: 0.65, duration: 1.2, stagger: 0.015 }, 2.6)
        
        .to(".mosaic-tile", { y: (_, el) => (Number(el.dataset.y) > 50 ? 1 : -1) * window.innerHeight * 0.8, opacity: 0, duration: 1.05, stagger: 0.025 }, 3.65)
        
        .to(".manifesto", { autoAlpha: 0, y: -20, duration: 0.5 }, 4.0)
        .to(".storm-line", { autoAlpha: 1, duration: 0.5 }, 4.25)
        .to(".storm-line, .center-mark", { autoAlpha: 0, duration: 0.5 }, 4.85)
        .to(".red-field", { clipPath: "circle(0% at 50% 25%)", duration: 1 }, 5.1)
        .fromTo(".portrait-scene", { y: "55vh" }, { y: 0, autoAlpha: 1, duration: 1 }, 5.1)
        .fromTo(".frame-outline", { y: -70 }, { y: -24, duration: 1 }, 5.8)
        .to(".portrait-mask", { yPercent: -101, duration: 0.85 }, 6.65)
        .fromTo(".portrait-words span", { yPercent: 110, opacity: 0 }, { yPercent: 0, opacity: 1, stagger: 0.22, duration: 0.65 }, 7.0)
        .to(".portrait-first", { opacity: 0, duration: 0.55 }, 8.0)
        .to(".portrait-words", { y: -20, duration: 0.8 }, 8.0)
        .to({}, { duration: 0.35 }, 8.65);
      const header = document.querySelector<HTMLElement>(".site-header");
      const journey = document.querySelector<HTMLElement>(".journey");
      const wide = document.querySelector<HTMLElement>(".wide-scene");
      const ending = document.querySelector<HTMLElement>(".end-card");
      // The header floats over scenes that flip between paper and red, so its
      // colour is recomputed from scroll phase: dark ink on light scenes, cream
      // ink on dark ones. `phase` is 0-9 across the journey's 860svh.
      const updateHeader = () => {
        if (!header || !journey || !wide || !ending) return;
        const y = window.scrollY;
        const phase = y / Math.max(1, journey.offsetHeight - window.innerHeight) * 9;
        let dark = (phase >= 1.0 && phase < 2.6) || phase >= 5.7;
        if (y >= wide.offsetTop - 75) dark = false;
        if (y >= ending.offsetTop - 75) dark = true;
        header.style.color = dark ? "#11100f" : "#eeeae4";
        header.dataset.tone = dark ? "dark" : "light";
      };
      ScrollTrigger.create({ trigger: main.current, start: "top top", end: "bottom bottom", onUpdate: updateHeader, onRefresh: updateHeader });
      updateHeader();
      gsap.fromTo(".wide-media", { clipPath: "inset(35% 0 0 0)", scale: 0.94 }, { clipPath: "inset(0% 0 0 0)", scale: 1, ease: "none", scrollTrigger: { trigger: ".wide-scene", start: "top bottom", end: "top top", scrub: 0.5 } });
      gsap.fromTo(".wide-copy", { y: 60, opacity: 0 }, { y: 0, opacity: 1, scrollTrigger: { trigger: ".wide-scene", start: "top 45%", end: "top top", scrub: 0.5 } });
      gsap.fromTo(".wide-media", { y: 0 }, { y: 80, ease: "none", scrollTrigger: { trigger: ".wide-scene", start: "top top", end: "bottom top", scrub: true } });
      // "A world in fragments": scattered tiles gather into a central stack,
      // then drop out of frame.
      const world = gsap.timeline({ scrollTrigger: { trigger: ".world", start: "top top", end: "bottom bottom", scrub: 0.65 } });
      world.to(".world-copy", { opacity: 0, y: -70, duration: 0.5 }, 0.5)
        .to(".world-tile", { left: "50%", top: (_, el) => `${22 + Number(el.dataset.index) * 12}%`, width: mobile ? "68%" : "40%", xPercent: -50, rotation: 0, rotationY: 0, duration: 1.5, stagger: 0.08, ease: "power2.inOut" }, 0.15)
        .to(".world-tile", { y: 90, opacity: 0, duration: 0.65, stagger: 0.05 }, 1.7);
      // Each film chapter gets its own scrubbed parallax: the still scales up
      // as it enters and the chapter title drifts upward past it.
      gsap.utils.toArray<HTMLElement>(".film-chapter").forEach((section) => {
        gsap.fromTo(section.querySelector(".film-image"), { scale: 0.88, y: 50 }, { scale: 1, y: 0, ease: "none", scrollTrigger: { trigger: section, start: "top 90%", end: "top 25%", scrub: 0.6 } });
        gsap.fromTo(section.querySelector(".chapter-title"), { y: 65 }, { y: -30, ease: "none", scrollTrigger: { trigger: section, start: "top bottom", end: "bottom top", scrub: 0.6 } });
      });
      gsap.fromTo(".end-car-card", { clipPath: "inset(18% 8% 18% 8%)", y: 75 }, { clipPath: "inset(0% 0% 0% 0%)", y: 0, ease: "none", scrollTrigger: { trigger: ".end-car-card", start: "top 95%", end: "top 35%", scrub: 0.6 } });
      gsap.fromTo(".end-mark", { y: 80, opacity: 0 }, { y: 0, opacity: 1, duration: 1, ease: "power3.out", scrollTrigger: { trigger: ".end-card", start: "top 65%" } });
      gsap.to(".progress-line", { scaleX: 1, ease: "none", scrollTrigger: { trigger: main.current, start: "top top", end: "bottom bottom", scrub: true } });
    }, main);
    const onLoad = () => ScrollTrigger.refresh();
    window.addEventListener("load", onLoad);
    return () => { clearTimeout(introTimer); context.revert(); window.removeEventListener("load", onLoad); };
  }, []);
  function navigate(id: string) { setMenu(false); setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }), 120); }
  // Opening a film modal also pauses every background clip via `paused || selected !== null`.
  function openFilm(index: number) { setPlayerError(false); setSelected(index); }
  return <main ref={main}>
    {showcase && <ShowcaseController />}
    <a className="skip-link" href="#films">Skip to films</a>
    {!introDone && <div className="intro" aria-hidden="true"><Wordmark className="intro-mark" /><div className="intro-line" /><span>STORIES IN MOTION</span></div>}
    <header className="site-header">
      <button className="header-film" onClick={() => navigate("home")}>SHIVAM PHOTOGRAPHY</button>
      <button className="header-logo" aria-label="Back to opening" onClick={() => navigate("home")}><Wordmark /></button>
      <div className="header-actions">
        <nav className="social-links" aria-label="Shivam Photography social links">
          {socialLinks.map((link) => <a className="social-link" key={link.label} href={link.href} target="_blank" rel="noreferrer" aria-label={`Open Shivam Photography on ${link.label}`} title={link.label}><SocialIcon icon={link.icon} /></a>)}
        </nav>
        <button className="booking-toggle" onClick={() => setBookingOpen(true)}>BOOK <span aria-hidden="true">↗</span></button>
        <button className="menu-toggle" onClick={() => setMenu(true)} aria-label="Open chapter navigation">INDEX <span><i /><i /></span></button>
      </div>
    </header>
    {/* CHAPTER 1 — "THE RETURN OF OG": the sticky, scroll-driven journey. */}
    <section className="journey" id="home" aria-label="Shivam Photography portfolio">
      <div className="journey-stage">
        <div className="red-field" /><div className="red-crescent" aria-hidden="true" />
        <div className="mosaic" id="brand-shoot" aria-hidden="true">{tiles.map(([x, y, w, video], i) => <div key={i} data-x={x} data-y={y} className={`mosaic-tile tile-${i}`} style={{ left: `${x}%`, top: `${y}%`, width: `${w}%` } as CSSProperties}><video src={`/media/${video}`} muted autoPlay loop playsInline preload="auto" aria-hidden="true" /></div>)}</div>
        <div className="center-mark" aria-hidden="true"><Wordmark /></div>
        <div className="opening-panel">
          <IntroVideo paused={paused || selected !== null} />
          <div className="image-shade" />
          <div className="hero-copy"><p className="eyebrow">VIDEOGRAPHER · FILM EDITOR</p><h1>Stories that<br />stay in <em>motion.</em></h1><div className="hero-title"><span>SHIVAM<br />PHOTOGRAPHY</span><Wordmark /></div></div>
          <div className="hero-footer"><span>SCROLL TO EXPLORE THE FILMS</span><span className="scroll-indicator" aria-hidden="true" /><button onClick={() => openFilm(0)} className="text-link">PLAY A HIGHLIGHT <span className="play-icon" /></button></div>
        </div>
        <div className="manifesto"><span className="eyebrow">SHIVAM PHOTOGRAPHY</span><h2>Real moments.<br />A cinematic point of view.</h2></div>
        <div className="storm-line"><h2>Every frame holds a feeling.</h2><span className="eyebrow">MADE TO BE REMEMBERED</span></div>
        <div className="portrait-scene">
          <span className="side-note note-left">BEHIND THE CAMERA</span><span className="side-note note-right">SHIVAM<br />PHOTOGRAPHY</span>
          <div className="portrait-frame"><div className="frame-outline" /><div className="portrait-inner"><img src="/media/shivam-profile.jpg" alt="Shivam, videographer and editor" /><img className="portrait-first" src="/media/shivam-profile.jpg" alt="Shivam Photography" /><div className="portrait-mask"><p>Made with care.<br />Cut with rhythm.<br />Remembered forever.</p><span>01 — THE STORYTELLER</span></div></div></div>
          <h2 className="portrait-words"><span>The moment.</span><span>The emotion.</span><span>The memory.</span></h2>
        </div>
      </div>
    </section>
    {/* CHAPTER 2 — "HIS WORLD": full-bleed 2.39:1 action panel. */}
    <section className="wide-scene" id="story" aria-label="Shivam's approach"><div className="wide-media"><CinemaMedia image="5VKSzMeBLTU.jpg" id="5VKSzMeBLTU" label="Avinash and Shaloo — engagement film" paused={paused || selected !== null} /><div className="wide-shade" /></div><div className="wide-copy"><p className="eyebrow">THE ART OF THE HIGHLIGHT</p><h2>Feel it<br />all <em>again.</em></h2><p>Honest moments.<br />Thoughtful edits. Lasting stories.</p></div><div className="wide-bottom"><span>SHIVAM PHOTOGRAPHY</span><span>STORIES IN MOTION</span></div></section>
    <section className="world" id="world" aria-label="Shivam's creative approach"><div className="world-stage"><div className="world-copy"><p className="eyebrow">A STORY IN EVERY FRAME</p><h2>Natural emotion.<br />Careful composition.<br /><em>Timeless films.</em></h2><span>VIDEOGRAPHY · EDITING · STORYTELLING</span></div><div className="world-constellation" aria-hidden="true">{["uXhkusf0Tp0.jpg", "5VKSzMeBLTU.jpg", "T_JV_L7GZfo.jpg", "aD03U6Jz13s.jpg", "DoS-VfsWfWw.jpg"].map((img, i) => <div className={`world-tile world-tile-${i}`} key={i} data-index={i}><img src={`/media/${img}`} alt="" loading="lazy" /></div>)}</div></div></section>
    {/* CHAPTER 4 — "THE OG ARCHIVE": the three official films as numbered chapters. */}
    <section className="films" id="films" aria-label="Shivam's video portfolio"><div className="film-section-label"><span>THE FILM SHOOTS</span><span>EVENTS · PERSONAL STORIES · WEDDINGS · BRANDS</span></div>{filmShoots.map((shoot) => <div className="film-shoot" id={shoot.title.toLowerCase().replaceAll(" ", "-")} key={shoot.title}><div className="shoot-heading"><h2>{shoot.title}</h2><span>{shoot.note}</span></div>{shoot.ids.map((id) => { const film = films.find((entry) => entry.id === id)!; const i = films.indexOf(film); return <article className="film-chapter" key={film.id}><div className="chapter-topline"><span>{String(i + 1).padStart(2, "0")}</span><span>{film.subtitle}</span><span>SHIVAM PHOTOGRAPHY</span></div><h2 className="chapter-title">{film.title}</h2><button className="film-image" onClick={() => openFilm(i)} aria-label={`Play ${film.title}`}><CinemaMedia image={film.image} id={film.id} label={film.title} paused={paused || selected !== null} /><span className="chapter-play"><span className="play-icon" />PLAY FILM</span></button><div className="chapter-caption"><p>{film.text}</p><button onClick={() => openFilm(i)} className="text-link">WATCH <span className="play-icon" /></button></div></article>;})}</div>)}
      <div className="shoot-heading empty-shoot" id="photography-shoot"><h2>Photography Shoot</h2><span>STILLS & PORTRAITS</span></div>
      <div className="shoot-heading empty-shoot" id="model-shoot"><h2>Model Shoot</h2><span>MODEL FILMS COMING SOON</span></div>
    </section>
    {/* CHAPTER 5 — END CARD: credits, trailer CTA and the fan-site legal line. */}
    <footer className="end-card" id="end"><p className="eyebrow">SHIVAM PHOTOGRAPHY</p><div className="end-mark"><span>STORIES IN MOTION</span><Wordmark /></div><div className="end-car-card"><CinemaMedia image="oMQvQhuHgHE.jpg" id="oMQvQhuHgHE" aperture={16 / 9} className="footer-title-media" label="Sweta and Shyam — engagement film" paused={paused || selected !== null} /><div className="car-title"><span>SHIVAM PHOTOGRAPHY</span><Wordmark /></div></div><div className="end-actions"><button onClick={() => navigate("films")}>EXPLORE THE FILMS <span className="play-icon" /></button><button onClick={() => navigate("home")}>BACK TO THE BEGINNING</button></div><div className="credits"><span>VIDEOGRAPHY</span><span>FILM EDITING</span><span>STORYTELLING</span></div><div className="legal"><span>SHIVAM PHOTOGRAPHY</span><span>FILMS COURTESY OF THE CREATOR’S YOUTUBE CHANNEL.</span><a href="https://www.instagram.com/shivam___photography_?obrf=MXJwY2ttdDFwOHFvbg==" target="_blank" rel="noreferrer">INSTAGRAM ↗</a></div></footer>
    {/* Global motion controls: entry to the 55-second showcase and a
        PAUSE FILMS / PLAY MOTION switch for every background clip. */}
    <div className="playback-control">{!showcase && <a href="?showcase=1">55-SECOND SHOWCASE</a>}<button onClick={() => setPaused(!paused)} aria-label={paused ? "Resume background films" : "Pause background films"}>{paused ? "PLAY MOTION" : "PAUSE FILMS"}<span aria-hidden="true">{paused ? "▷" : "Ⅱ"}</span></button></div>
    <div className="progress-line" aria-hidden="true" />
    {/* Chapter INDEX sheet — jump straight to any of the four chapters. */}
    <Sheet open={menu} onOpenChange={setMenu}><SheetContent className="chapter-menu"><SheetTitle className="menu-heading">SHIVAM · INDEX</SheetTitle><SheetDescription className="menu-description">Enter at any chapter.</SheetDescription><nav>{[["home", "The story"], ["story", "The approach"], ["world", "Behind the frames"], ["brand-shoot", "Brand shoot"], ["event-shoot", "Event shoot"], ["photography-shoot", "Photography shoot"], ["personal-shoot", "Personal shoot"], ["wedding-shoot", "Wedding shoot"], ["model-shoot", "Model shoot"], ["end", "Contact"]].map(([id, label], i) => <button key={id} onClick={() => navigate(id)}><span>{String(i + 1).padStart(2, "0")}</span>{label}</button>)}</nav><Wordmark /><p>SHIVAM PHOTOGRAPHY<br />VIDEOGRAPHER · FILM EDITOR</p></SheetContent></Sheet>
    {/* Film modal — official YouTube player with sound and controls, plus a
        fallback link if the embed is blocked in this browser. */}
    <Dialog open={selected !== null} onOpenChange={(v) => { if (!v) setSelected(null); }}><DialogContent className="film-dialog"><DialogTitle>{selected !== null ? films[selected].title : "Shivam Photography"}</DialogTitle><DialogDescription>YouTube film by Shivam Photography — plays in high quality with sound & controls.</DialogDescription>{selected !== null && <><iframe title={films[selected].title} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" onError={() => setPlayerError(true)} src={`https://www.youtube.com/embed/${films[selected].id}?autoplay=1&rel=0&playsinline=1&vq=hd1080&hd=1&quality=hd1080&modestbranding=1&enablejsapi=1&origin=${encodeURIComponent(origin)}&widget_referrer=${encodeURIComponent(origin)}`} /><a className="player-fallback" target="_blank" rel="noreferrer" href={`https://www.youtube.com/watch?v=${films[selected].id}`}>{playerError ? "Player unavailable — watch on YouTube" : "Open film on YouTube"}</a></>}</DialogContent></Dialog>
    <Dialog open={bookingOpen} onOpenChange={setBookingOpen}><DialogContent className="booking-dialog"><DialogTitle>Let’s make something unforgettable.</DialogTitle><DialogDescription>Now booking wedding films, engagement stories and jewellery product shoots.</DialogDescription><a className="booking-instagram" href={socialLinks[0].href} target="_blank" rel="noreferrer">BOOK THROUGH INSTAGRAM <span aria-hidden="true">↗</span></a></DialogContent></Dialog>
  </main>;
}
