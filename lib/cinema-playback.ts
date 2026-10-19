/* SHIVAM PHOTOGRAPHY — YouTube transport state machine.
 * Wraps one muted background excerpt into a loop between `start` and `end`
 * seconds and answers visibility changes with play/pause. Kept transport-only:
 * it never owns React state, so CinemaMedia can poll it at 250ms without
 * re-rendering the page.
 *
 * Quality: we force hd1080/highres on ready and on every loop so the
 * background excerpt never settles on 360p/480p. YouTube still adapts to
 * bandwidth, but we always request the highest available.
 */
import type { YouTubePlayer } from "./youtube-player";

const PREFERRED_QUALITY = "hd1080";
const FALLBACK_QUALITY = "highres";

function forceHighQuality(player: YouTubePlayer) {
  try {
    // Newer API: range lock; older: single quality hint
    if (typeof player.setPlaybackQualityRange === "function") {
      player.setPlaybackQualityRange(PREFERRED_QUALITY, PREFERRED_QUALITY);
    }
  } catch {}
  try {
    if (typeof player.setPlaybackQuality === "function") {
      player.setPlaybackQuality(PREFERRED_QUALITY);
      // retry with highres if hd1080 not available (some embeds report highres for 1080p)
      const avail = typeof player.getAvailableQualityLevels === "function" ? player.getAvailableQualityLevels() : [];
      if (avail.length && !avail.includes(PREFERRED_QUALITY) && avail.includes(FALLBACK_QUALITY)) {
        player.setPlaybackQuality(FALLBACK_QUALITY);
      }
    }
  } catch {}
}

// Only issue transport commands when intent changes. In particular, a startup
// timestamp of zero while buffering must never trigger another seek request.
export function cinemaPlayback(player: YouTubePlayer, start: number, end: number) {
  let ready = false,
    wanted = false,
    seeking = false;
  const apply = () => {
    if (!ready) return;
    if (wanted) player.playVideo();
    else player.pauseVideo();
  };
  const loop = () => {
    if (!ready || !wanted || seeking) return;
    seeking = true;
    player.seekTo(start, true);
    player.playVideo();
    forceHighQuality(player);
  };
  return {
    ready() {
      ready = true;
      player.mute();
      forceHighQuality(player);
      apply();
    },
    visibility(next: boolean) {
      if (wanted === next) return;
      wanted = next;
      apply();
      if (wanted) forceHighQuality(player);
    },
    state(state: number) {
      if (state === 0) loop();
    },
    sample() {
      if (!ready) return { state: -1, time: 0 };
      const state = player.getPlayerState(),
        time = player.getCurrentTime();
      if (seeking && state === 1 && time < end - 1) seeking = false;
      if (state === 1 && time >= end) loop();
      // Periodically re-assert quality while playing — YouTube can downgrade on bandwidth dips
      if (state === 1) {
        try {
          const q = typeof player.getPlaybackQuality === "function" ? player.getPlaybackQuality() : "";
          if (q && q !== PREFERRED_QUALITY && q !== FALLBACK_QUALITY && q !== "hd1440" && q !== "hd2160") {
            // don't thrash every tick: only if clearly low
            if (["small", "medium", "large", "hd720", "medium"].includes(q)) forceHighQuality(player);
          }
        } catch {}
      }
      return { state, time };
    },
    resume() {
      if (ready && wanted) {
        player.playVideo();
        forceHighQuality(player);
      }
    },
  };
}
