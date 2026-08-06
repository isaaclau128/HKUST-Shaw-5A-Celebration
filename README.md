# HKUST-Shaw-5A-Celebration

A mobile-friendly singing practice page with 3 tabs (Act 1/2/3), per-part toggles, and per-part volume controls.

## Run locally

```bash
npm start
```

Then open `http://localhost:4173`.

## Music folder layout

Place your files in this structure:

```text
music/
  act1/
    non singing parts/
      Soloists.(mp3|wav|ogg|m4a)
      Trumpet.(mp3|wav|ogg|m4a)
      Clarinet.(mp3|wav|ogg|m4a)
      Saxophone.(mp3|wav|ogg|m4a)
      Percussion.(mp3|wav|ogg|m4a)
      Piano.(mp3|wav|ogg|m4a)
    singing parts/
      Soprano.(mp3|wav|ogg|m4a)
      Alto.(mp3|wav|ogg|m4a)
      Tenor.(mp3|wav|ogg|m4a)
      Bass.(mp3|wav|ogg|m4a)
  act2/
    ... same as act1
  act3/
    ... same as act1
```

The page automatically tries common name variants and supported file extensions.
