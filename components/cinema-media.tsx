"use client";

/* =============================================================================
 * SHIVAM PHOTOGRAPHY — CinemaMedia, the moving-image layer
 * -----------------------------------------------------------------------------
 * Every animated portfolio panel uses this component. A local thumbnail and
 * muted YouTube excerpt sit inside one cinematic aperture:
 *
 *   layer 1  poster still (public/media/*)      always present as a fallback
 *   layer 2  muted YouTube excerpt (iframe API)  appears once frames advance
 *
 * The thumbnail keeps the composition intact while the YouTube iframe loads.
 * The stream layer is only revealed
 *   (data-stream-playing) once three consecutive samples prove the video is
 *   actually advancing — API readiness alone is not accepted as proof.
 *
 * QUALITY
 *   YouTube chooses adaptive quality. We request hd1080 via the `vq` playerVar
 *   and via the IFrame API `setPlaybackQuality('hd1080')` / highres fallback.
 *   See lib/cinema-playback.ts which re-asserts the hint on play and on loop.
 *
 * PLAYBACK RULES
 *   - A clip plays only while its panel is at least 8% visible, the tab is
 *     visible, the panel is not CSS-hidden, and the global pause is off.
 *   - Nearby panels are prepared (rootMargin 100%) but not played, so page
 *     load does not start six competing downloads.
 *   - Opening a film modal, hiding the tab or pressing PAUSE FILMS stops all
 *     background motion; the `og-showcase-play` event restarts it.
 *   - `aperture` (default 2.39) sets the --film-width/--film-height custom
 *     properties so the layer letterboxes instead of stretching.
 *
 * The exported data-playing / data-local-playing / data-stream-playing /
 * data-media-state attributes are the contract the showcase controller and
 * the playback regression tests read.
 * ============================================================================= */

import { useEffect, useRef, useState } from "react";
import { loadYouTubePlayer, type YouTubePlayer } from "@/lib/youtube-player";
import { cinemaPlayback } from "@/lib/cinema-playback";

type Props = {
  image: string;
  id: string;
  start?: number;
  end?: number;
  className?: string;
  priority?: boolean;
  paused?: boolean;
  label: string;
  aperture?: number;
};

export function CinemaMedia({ image, id, start, end, className = "", priority = false, paused = false, label, aperture = 2.39 }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const transport = useRef<ReturnType<typeof cinemaPlayback> | null>(null);
  const visible = useRef(false);
  const pausedRef = useRef(paused);
  const [active, setActive] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [mediaState, setMediaState] = useState("idle");
  const [posterQuality, setPosterQuality] = useState<"maxres" | "sd" | "local">("maxres");
  const loopStart = start ?? 0;
  const loopEnd = end ?? loopStart + 20;
  const posterSrc = posterQuality === "maxres"
    ? `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`
    : posterQuality === "sd"
      ? `https://i.ytimg.com/vi/${id}/sddefault.jpg`
      : `/media/${image}`;
  const refinePoster = (element: HTMLImageElement) => {
    if (posterQuality === "maxres" && element.naturalWidth < 960) setPosterQuality("sd");
    else if (posterQuality === "sd" && element.naturalWidth < 600) setPosterQuality("local");
  };

  useEffect(() => {
    pausedRef.current = paused;
    transport.current?.visibility(visible.current && !paused);
  }, [paused]);

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const sizeVideo = () => {
      const planeWidth = Math.max(element.clientWidth, element.clientHeight * aperture);
      element.style.setProperty("--film-width", `${planeWidth}px`);
      element.style.setProperty("--film-height", `${planeWidth * 9 / 16}px`);
    };
    const resize = new ResizeObserver(sizeVideo);
    resize.observe(element);
    sizeVideo();
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return () => resize.disconnect();
    if (priority) setActive(true);
    const observer = new IntersectionObserver(([entry]) => {
      visible.current = entry.isIntersecting && entry.intersectionRatio >= 0.08;
      if (visible.current) setActive(true);
      transport.current?.visibility(visible.current && !pausedRef.current);
    }, { threshold: [0, 0.08] });
    // Cue nearby players, but autoplay only the visible film. Distant sections
    // no longer create six competing video downloads at page load.
    const prepare = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setActive(true);
    }, { rootMargin: "100% 0px" });
    observer.observe(element);
    prepare.observe(element);
    const resume = () => transport.current?.resume();
    window.addEventListener("og-showcase-play", resume);
    return () => {
      resize.disconnect();
      observer.disconnect();
      prepare.disconnect();
      window.removeEventListener("og-showcase-play", resume);
    };
  }, [priority, aperture]);

  useEffect(() => {
    if (!active || !host.current) return;
    let disposed = false,
      player: YouTubePlayer | undefined;
    let lastTime = 0,
      movingSamples = 0;
    let timer: number | undefined;
    const element = root.current!;
    const mount = document.createElement("div");
    host.current.appendChild(mount);
    setMediaState("loading");
    const fail = () => {
      if (!disposed) {
        setPlaying(false);
        setMediaState("unavailable");
      }
    };
    loadYouTubePlayer()
      .then((YT) => {
        if (disposed) return;
        player = new YT.Player(mount, {
          videoId: id,
          // vq=hd1080 is the documented hint for highest quality. YouTube may still adapt to bandwidth,
          // but we force hd1080/highres via the API onReady/playing as well (cinema-playback).
          playerVars: {
            autoplay: 0,
            mute: 1,
            playsinline: 1,
            controls: 0,
            disablekb: 1,
            rel: 0,
            start: loopStart,
            iv_load_policy: 3,
            origin: window.location.origin,
            vq: "hd1080",
            // modestbranding keeps YouTube chrome minimal behind the cinematic crop
            modestbranding: 1,
          },
          events: {
            onReady(event) {
              if (disposed) return;
              // Immediately request highest quality before first paint
              try {
                event.target.setPlaybackQuality?.("hd1080");
              } catch {}
              try {
                event.target.setPlaybackQualityRange?.("hd1080", "hd1080");
              } catch {}
              const control = cinemaPlayback(event.target, loopStart, loopEnd);
              transport.current = control;
              control.visibility(visible.current && !pausedRef.current);
              control.ready();
              setMediaState("ready");
              timer = window.setInterval(() => {
                control.visibility(
                  visible.current && !pausedRef.current && getComputedStyle(element).visibility !== "hidden" && !document.hidden,
                );
                const { state, time } = control.sample();
                element.dataset.filmTime = time.toFixed(2);
                if (state === 1 && time > lastTime + 0.08) movingSamples++;
                else movingSamples = 0;
                lastTime = time;
                // API readiness alone is not proof that decoded footage is moving.
                const moving = movingSamples >= 3 && visible.current && !pausedRef.current;
                if (moving) {
                  setPlaying(true);
                  setMediaState("playing");
                } else if (state !== 1) {
                  setPlaying(false);
                  setMediaState(state === 3 ? "buffering" : state === 2 ? "paused" : "ready");
                }
              }, 250);
            },
            onStateChange(event) {
              if (disposed) return;
              transport.current?.state(event.data);
              // When YouTube actually starts playing (state 1), lock quality
              if (event.data === 1) {
                try {
                  event.target.setPlaybackQuality?.("hd1080");
                } catch {}
              }
              if (event.data !== 1) {
                movingSamples = 0;
                setPlaying(false);
              }
              if (event.data === 3) setMediaState("buffering");
            },
            onError: fail,
            onAutoplayBlocked() {
              if (!disposed) {
                setPlaying(false);
                setMediaState("blocked");
              }
            },
          },
        });
        const iframe = host.current?.querySelector("iframe");
        if (iframe) {
          iframe.title = `${label} — muted background film`;
          iframe.tabIndex = -1;
          iframe.setAttribute("aria-hidden", "true");
          iframe.setAttribute("allow", "autoplay; encrypted-media");
          iframe.referrerPolicy = "strict-origin-when-cross-origin";
        }
      })
      .catch(fail);
    return () => {
      disposed = true;
      if (timer !== undefined) clearInterval(timer);
      transport.current = null;
      player?.destroy();
      mount.remove();
    };
  }, [active, id, loopStart, loopEnd, label]);

  return (
    <div
      className={`cinema-media ${className}`}
      ref={root}
      data-playing={playing}
      data-stream-playing={playing}
      data-paused={paused}
      data-media-state={playing ? "playing" : mediaState}
      data-priority={priority}
    >
      <img
        src={posterSrc}
        alt={label}
        width="2048"
        height="1152"
        // Prefer YouTube's 1280px poster, then its 640px version, and use the
        // bundled still only when neither high-resolution thumbnail exists.
        onLoad={(event) => refinePoster(event.currentTarget)}
        onError={() => setPosterQuality((quality) => quality === "maxres" ? "sd" : quality === "sd" ? "local" : quality)}
        style={{ imageRendering: "auto" }}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        draggable={false}
      />
      <div className="cinema-player" ref={host} />
    </div>
  );
}
