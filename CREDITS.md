# Credits

Everything visual and audible on this site is made in code for this project: the 3D tunnel (three.js geometry and
GLSL shaders), the light gates, their aluminium housings and halo glows, the far portal, the sparks, the small studio scene the housings reflect, the no-WebGL poster (SVG), the favicon (SVG), the Open Graph / Twitter
image (a screenshot of this site, `src/app/opengraph-image.png`) and the demo music set (synthesised live with the Web Audio API).
The only third-party assets are two CC0 photogrammetry scans of real cliffs used as the quarry walls (below); there are
no third-party images or audio files.

## Fonts (SIL Open Font License 1.1, self-hosted at build time via `next/font/google`)

- **Unbounded** — NARS / Google Fonts — https://fonts.google.com/specimen/Unbounded
- **Manrope** — Mikhail Sharanda — https://fonts.google.com/specimen/Manrope

## npm libraries

| package | license |
|---|---|
| next | MIT |
| react, react-dom | MIT |
| three | MIT |
| @react-three/fiber, @react-three/drei | MIT |
| tailwindcss, @tailwindcss/postcss | MIT |
| typescript | Apache-2.0 |
| eslint, eslint-config-next | MIT |

Full license texts ship with each package in `node_modules`.

## CC0 assets

| File | Asset | Source | Licence |
|---|---|---|---|
| `public/models/namaqualand_cliff_02.glb` | Namaqualand Cliff 02, a scan of a real cliff face in Namaqualand, South Africa (the wall behind the stage) | Poly Haven, https://polyhaven.com/a/namaqualand_cliff_02 | CC0 1.0 |
| `public/models/rock_face_01.glb` | Rock Face 01, a scanned rock face (the quarry walls flanking the stage and the crowd) | Poly Haven, https://polyhaven.com/a/rock_face_01 | CC0 1.0 |

Both were downloaded at 1k, the unused roughness/AO map dropped, simplified and compressed with gltf-transform
(meshopt geometry, 1024 px WebP colour and normal maps). They are decoded with three.js's bundled MeshoptDecoder
(no CDN) and lit only by the show (LED wall wash, up-beams, laser streaks) in a custom shader.
