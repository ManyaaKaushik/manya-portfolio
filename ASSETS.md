# Asset provenance

Source board: https://www.figma.com/design/iXariOVvEL3FH2NnXOEm7f/NID-SEM-4?node-id=1720-7419

| Local asset | Source node |
| --- | --- |
| manya.png | 1622:26, Manya portrait |
| flowers.png | 1729:6368, dithered floral collage |
| leaves-left.png | 1729:6333 |
| leaves-right.png | 1729:6334 |
| botanical.png | 1729:6338 |
| lotus.png | 1729:6378 |
| sunflower.png | 1729:6358 |

Downloaded via Figma's supplied curl instructions. All runtime paths are local. Original images preserved; source board reference posters were not reused as portfolio work.

Project images copied from the existing `../site/assets/images`:
- scam.png: CMASqALuM9THCc8myrMtRHl5rF4-5ec134.png
- celebto.png: Mqwj1ty0FUX8ENVfpozwXzYmPM-5cb1b7.png
- sakhi.png: WHISf89KVnJUW5iGHzS4A1XmZnM-566ef8.png
- zeevam.png: JF0Ts8BylWTR4uLax0b6cusDnAs.png
- life360.png: 5IIEDbaOzA6Gaz7jcgem5TLoAg.png

Instrument Serif and Instrument Sans fonts copied from the existing portfolio's local font files. Favicon and pixel garden are original code assets made for this implementation.

Production portrait is proportionally resized to 900px wide and encoded as manya.webp (quality 88); original Figma PNG retained locally in ignored original-assets/. No content was altered.

## Growing garden additions

| Shipped asset | Source and treatment |
| --- | --- |
| family-grandma.webp | Figma node 1624:24; proportional 1000px long edge, rotated clockwise to match the board orientation, WebP quality 88. |
| family-together.webp | Figma node 1624:25; proportional 1000px long edge, WebP quality 88. |
| canopy.webp | Figma reference node 1729:6405; original tree-canopy image, WebP quality 88; softly cropped in CSS. |
| carey.png | Figma node 1729:6354, dithered botanical. |
| sceneria.png | Figma node 1729:6362, dithered tree. |
| hills.webp | Original image created with built-in image generation for this portfolio, proportionally resized to 1672×941 and encoded WebP quality 88. |

Family and canopy PNG sources are preserved locally in ignored original-assets/. No movie posters or film stills are used.

### Exact hill image generation prompt

Create a high-resolution original photographic landscape asset for a sophisticated botanical product designer portfolio website. Wide panoramic landscape, 16:9. A quietly beautiful green rolling hill under a broad soft blue sky with a few sculptural white cumulus clouds. Ground-level perspective from a wild meadow: delicate grass and tiny white daisies along the very bottom edge, a gently curving velvety green hill across the lower 40 percent, airy sky across upper 60 percent. Warm late afternoon sunlight, fresh yellow-green tones, a subtle analog-film photographic softness and tactile natural color. Nostalgic and optimistic without resembling any specific copyrighted wallpaper. Real landscape photography, not an illustration, not cartoon, not 3D render. No people, no buildings, no trees, no signs, no text, no interface. Keep the center sky open and quiet so dark editorial text can be overlaid legibly. Output one polished wide background photograph.

Generation mode: built-in image generation. Shipped path: public/assets/hills.webp. Original generated PNG preserved in original-assets/.

## Updated board assets

- blue-clouds.webp — node 1729:6425, blue dithered cloud artwork; lossless WebP at original 1024×579, used as footer sky.
- dreaming.webp — node 1638:57, Manya behind a laptop; proportional WebP, diary creative spread.
- sketch-world.webp — node 1622:12, supplied architectural story sketch; proportional 1400px WebP, retains Figma crop in diary.
- sketch-creature.webp — node 1622:14, supplied creature story sketch; proportional 1400px WebP, retains Figma crop in diary.
- tiny-glade.webp — node 1637:47, supplied game artwork, small interest sticker in diary.
- letterboxd.webp — node 1749:7444, supplied Letterboxd icon, small interest sticker in diary.

All PNG originals are preserved in ignored original-assets/. Source reference website screenshots and sunflower/butterfly posters are not used as portfolio screens or personal art. The new blue ASCII sunflower is rendered from the pre-existing supplied sunflower.png using a canvas character sampler, not a raster of another website.
