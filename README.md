# Shivam Photography — Stories in Motion

A cinematic portfolio for videographer and film editor Shivam. The site keeps the reference repo’s scroll-driven intro, rotating image mosaic, chapter transitions, parallax scenes, film archive and guided showcase, with Shivam’s portrait and six supplied YouTube works.

## Run locally

Requires Node 22.13 or newer and pnpm 11.

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

For production, run `pnpm build` then `pnpm start`. Deploy the repository root to Vercel; no environment variables are required.

## Portfolio content

- `app/page.tsx` contains the portfolio copy and six video entries.
- `app/globals.css` contains the original motion design and responsive styles.
- `public/media/shivam-profile.jpg` is the supplied profile photo.
- `public/media/` contains local preview thumbnails for the six YouTube works.
- Each film opens an embedded YouTube player; the source videos remain hosted by their creator.
- The Instagram link in the end card is Shivam’s supplied contact profile.

The optional `?showcase=1` route plays the guided 55-second page tour and offers tab recording in supported desktop browsers.
