// PAWAN KALYAN SHOWCASE WEBSITE — playback regression test.
// Runs the real cinemaPlayback() transport from lib/cinema-playback.ts against a
// fake YouTube player and proves the invariants the showcase depends on: a
// buffering start of t=0 must not fire repeated seeks, each loop seeks exactly
// once, and pause requests are not re-sent when the intent has not changed.
// Run with: pnpm test:playback
import assert from "node:assert/strict";
import test from "node:test";
import { cinemaPlayback } from "../../lib/cinema-playback.ts";

test("a buffering start cannot trigger a seek storm; each real loop seeks once", () => {
  const calls = [];
  let time = 0, state = 3;
  const player = {
    mute: () => calls.push("mute"),
    playVideo: () => calls.push("play"),
    pauseVideo: () => calls.push("pause"),
    seekTo: (at) => calls.push(`seek:${at}`),
    getCurrentTime: () => time,
    getPlayerState: () => state,
    destroy() {},
  };
  const playback = cinemaPlayback(player, 42, 64);
  playback.visibility(true);
  playback.ready();
  for (let i = 0; i < 100; i++) { playback.sample(); playback.visibility(true); }
  assert.deepEqual(calls, ["mute", "play"]);
  time = 64; state = 1;
  for (let i = 0; i < 30; i++) playback.sample();
  assert.deepEqual(calls, ["mute", "play", "seek:42", "play"]);
  state = 0;
  playback.state(0);
  assert.equal(calls.filter(x => x.startsWith("seek")).length, 1);
  state = 1; time = 43;
  playback.sample();
  playback.visibility(false);
  for (let i = 0; i < 30; i++) playback.visibility(false);
  assert.equal(calls.filter(x => x === "pause").length, 1);
  time = 64;
  playback.sample();
  assert.equal(calls.filter(x => x.startsWith("seek")).length, 1);
  playback.visibility(true);
  playback.sample();
  assert.equal(calls.filter(x => x.startsWith("seek")).length, 2);
});
