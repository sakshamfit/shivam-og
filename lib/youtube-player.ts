/* PAWAN KALYAN SHOWCASE WEBSITE — single shared loader for the YouTube iframe
 * API. The script tag is appended once per page and the resulting promise is
 * memoised, so every CinemaMedia panel reuses one API instance instead of
 * racing to load it. Failures (blocked network, 15s timeout) reject so the
 * caller can fall back to the poster still and bundled clip. */
export type YouTubePlayer = {
  mute(): void;
  unMute(): void;
  setVolume(volume: number): void;
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  getPlayerState(): number;
  destroy(): void;
};
type PlayerEvent = { target: YouTubePlayer; data: number };
type YouTubeAPI = {
  Player: new (element: HTMLElement, options: {
    videoId: string;
    playerVars: Record<string, string | number>;
    events: {
      onReady(event: PlayerEvent): void;
      onStateChange(event: PlayerEvent): void;
      onError(event: PlayerEvent): void;
      onAutoplayBlocked(event: PlayerEvent): void;
    };
  }) => YouTubePlayer;
};
declare global {
  interface Window {
    YT?: YouTubeAPI;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let api: Promise<YouTubeAPI> | undefined;
export function loadYouTubePlayer(): Promise<YouTubeAPI> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (api) return api;
  api = new Promise((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    const timeout = window.setTimeout(() => reject(new Error("Film player timed out")), 15000);
    window.onYouTubeIframeAPIReady = () => {
      clearTimeout(timeout);
      previous?.();
      if (window.YT?.Player) resolve(window.YT);
      else reject(new Error("Film player unavailable"));
    };
    script.onerror = () => { clearTimeout(timeout); reject(new Error("Film player unavailable")); };
    document.head.appendChild(script);
  });
  return api;
}
