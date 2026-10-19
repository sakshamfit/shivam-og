"use client";

/*
 * User-initiated background music for the OG showcase.
 *
 * The source is Sony Music South's official Firestorm lyric video, composed by
 * Thaman S. The track is streamed through YouTube's iframe API rather than
 * copied into the repository. It never starts with sound until the visitor
 * presses the sound control, and pauses while an official film modal is open
 * or the browser tab is hidden.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { loadYouTubePlayer, type YouTubePlayer } from "@/lib/youtube-player";

const VIDEO_ID = "FbXOsVByKmk";
const VOLUME = 32;
const OFFICIAL_TRACK_URL = `https://www.youtube.com/watch?v=${VIDEO_ID}`;

type Props = { suspended?: boolean };

export function BackgroundMusic({ suspended = false }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const player = useRef<YouTubePlayer | null>(null);
  const enabled = useRef(false);
  const suspendedRef = useRef(suspended);
  const [ready, setReady] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);

  const syncPlayback = useCallback(() => {
    const current = player.current;
    if (!current) return;

    if (enabled.current && !suspendedRef.current && !document.hidden) {
      current.unMute();
      current.setVolume(VOLUME);
      current.playVideo();
    } else {
      current.pauseVideo();
      current.mute();
    }
  }, []);

  useEffect(() => {
    suspendedRef.current = suspended;
    syncPlayback();
  }, [suspended, syncPlayback]);

  useEffect(() => {
    const element = host.current;
    if (!element) return;

    let disposed = false;
    let instance: YouTubePlayer | null = null;
    const mount = document.createElement("div");
    element.appendChild(mount);

    const handleVisibility = () => syncPlayback();
    document.addEventListener("visibilitychange", handleVisibility);

    void loadYouTubePlayer().then((YT) => {
      if (disposed) return;
      instance = new YT.Player(mount, {
        videoId: VIDEO_ID,
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          playsinline: 1,
          rel: 0,
          origin: window.location.origin,
        },
        events: {
          onReady(event) {
            if (disposed) return;
            player.current = event.target;
            event.target.mute();
            event.target.setVolume(VOLUME);

            const iframe = element.querySelector("iframe");
            if (iframe) {
              iframe.title = "Firestorm — official OG background soundtrack by Thaman S";
              iframe.tabIndex = -1;
              iframe.setAttribute("aria-hidden", "true");
              iframe.setAttribute("allow", "autoplay; encrypted-media");
              iframe.referrerPolicy = "strict-origin-when-cross-origin";
            }

            setReady(true);
            syncPlayback();
          },
          onStateChange(event) {
            if (disposed) return;
            // Loop the official full-length track after it finishes.
            if (event.data === 0 && enabled.current && !suspendedRef.current && !document.hidden) {
              event.target.seekTo(0, true);
              event.target.playVideo();
            }
          },
          onError() {
            if (disposed) return;
            enabled.current = false;
            setIsEnabled(false);
            setUnavailable(true);
          },
          onAutoplayBlocked() {
            if (disposed) return;
            enabled.current = false;
            setIsEnabled(false);
            setBlocked(true);
          },
        },
      });
    }).catch(() => {
      if (!disposed) setUnavailable(true);
    });

    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", handleVisibility);
      if (player.current === instance) player.current = null;
      instance?.destroy();
      mount.remove();
    };
  }, [syncPlayback]);

  function toggleMusic() {
    const current = player.current;
    if (!ready || unavailable || !current) return;

    const next = !enabled.current;
    enabled.current = next;
    setIsEnabled(next);
    setBlocked(false);

    // Start the song directly in the user's click gesture so browsers allow
    // audible playback. The follow-up effect handles modal/tab suspension.
    if (next && !suspendedRef.current && !document.hidden) {
      current.unMute();
      current.setVolume(VOLUME);
      current.playVideo();
    } else {
      current.pauseVideo();
      current.mute();
    }
  }

  const playing = isEnabled && !suspended;
  const stateLabel = !ready && !unavailable
    ? "LOADING SOUND"
    : unavailable
      ? "SOUND UNAVAILABLE"
      : playing
        ? "OG SOUND ON"
        : isEnabled
          ? "SOUND PAUSED"
          : blocked
            ? "TAP TO PLAY"
            : "OG SOUND OFF";

  return (
    <div className="music-control" data-playing={playing} data-loading={!ready && !unavailable}>
      {unavailable ? (
        <a className="music-toggle music-fallback" href={OFFICIAL_TRACK_URL} target="_blank" rel="noreferrer">
          <span className="music-equalizer" aria-hidden="true"><i /><i /><i /><i /></span>
          <span className="music-control-copy">
            <span className="music-control-state">OPEN OFFICIAL SONG</span>
            <span className="music-control-track">FIRESTORM · THAMAN S</span>
          </span>
          <span className="music-control-symbol" aria-hidden="true">↗</span>
        </a>
      ) : (
        <button
          className="music-toggle"
          type="button"
          onClick={toggleMusic}
          disabled={!ready}
          aria-label={playing ? "Pause OG background music, Firestorm by Thaman S" : "Play OG background music, Firestorm by Thaman S"}
          aria-pressed={isEnabled}
        >
          <span className="music-equalizer" aria-hidden="true"><i /><i /><i /><i /></span>
          <span className="music-control-copy" aria-live="polite">
            <span className="music-control-state">{stateLabel}</span>
            <span className="music-control-track">FIRESTORM · THAMAN S</span>
          </span>
          <span className="music-control-symbol" aria-hidden="true">{playing ? "Ⅱ" : "▷"}</span>
        </button>
      )}
      <div className="music-player-host" ref={host} aria-hidden="true" />
    </div>
  );
}
