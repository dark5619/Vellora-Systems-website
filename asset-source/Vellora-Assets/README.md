# Vellora Systems website assets

Open **index.html** in a browser after extracting the ZIP. The gallery runs offline. Choose a thumbnail to open its PNG or choose **Locate on page** to see the exact source area. Use **Light backdrop** to inspect alpha edges.

## Contents

- 277 asset PNGs from the seven supplied designs, including 180 files with varying transparency.
- Shared-Brand contains the primary Home logo, its component mark and wordmark, page-specific variants and client marks.
- Shared-Icons groups native-size glyphs by usage. Shared-UI contains empty control surfaces for live labels.
- Page folders contain photographs, rendered objects, background plates and full card references.
- Guide contains seven visual contact sheets and seven reduced source maps. PNGs are full native size. The maps and contact sheets are for navigation.

## Pixel placement

Read manifest.csv in a spreadsheet or manifest.json in code. Coordinates use the top-left of the named full-page source. Use x and y for the top-left of the PNG, including its transparent padding. For a nested parent, subtract the parent's source x and y. For a responsive version, multiply both position and dimensions by the same scale factor.

An **Exact crop** preserves the complete source rectangle, including any baked-in content. A **Masked cutout** isolates source pixels on alpha. A **Reconstructed** asset includes restored, approximated or redrawn pixels. The per-file notes describe these changes. A photo or device clipped by its original card ends at that same boundary. The five portraits stop above their name overlays.

## Animating the Home hero

Use the 1672 × 581 artwork canvas in 01-Home/motion-home-hero. Stack the PNGs in filename order using the positions in the manifest. The landscape is the fixed backing. The orbit is continuous through the area hidden by the V. The V contains its original shading and a soft edge light.

The optional **04-resting-light** layer recovers the original interplay of screen-space reflections, shadows and light when everything is at rest. Fade this pass away as the V and orbit leave their resting positions. Restore it when they return. The gallery demonstrates a short float. For a still hero, backgrounds/hero-with-v.png already has the finished image with room for live headings.

## Animating a page-edge ribbon

Each motion-ribbons subfolder contains a backing, a transparent light strip and an exact reference. Align the two layers using their source positions. Translate the strip a few pixels, keeping its parent clipped to the source section. The available edge artwork ends at the screenshot boundary. A long pan reveals those ends.

## Verification

Compared 77 exact crops pixel for pixel with their source rectangles. Checked all PNG dimensions and placement bounds. Reassembled the Home hero and each of the 6 ribbon stacks at their manifest positions. The largest resting-pose difference was 0 level on an 8-bit color channel. That comparison uses the text-free hero plate for the Home rig and exact source crops for the ribbons. Hidden scenery, obscured orbit spans and glow edges are reconstructions.
