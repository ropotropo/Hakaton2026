# Kinetic Core — presentation materials

Created by **Mykyta Borisov**, the sole game author.

| Material | Purpose |
| --- | --- |
| **[English PDF](Kinetic-Core-EN.pdf)** | Final presentation already submitted to the judges |
| [Ukrainian PDF](Kinetic-Core-UA.pdf) | Companion edition for rehearsal |
| [English speaking notes](source/speaker-notes-en.md) | Timed pitch |
| [Ukrainian speaking notes](source/speaker-notes-uk.md) | Companion script |
| [Video and revision status](../VIDEO.md) | Stable link to the independently maintained film |

**[Original submitted PDF URL](https://github.com/ropotropo/Hakaton2026/blob/codex/final-presentations/presentation/Kinetic-Core-EN.pdf)** remains available. This repository preparation preserves both PDF files byte-for-byte and does not change the presentation branch.

Both PDFs contain fourteen widescreen slides, designed for a 280-second pitch plus a 20-second margin. The seven information slides are interleaved with seven full-screen game captures. Original English game text remains in the Ukrainian edition's captures. The PDFs contain no website URL or hyperlink annotations.

The captures are genuine historical game images; the cinematic cover portrait and logo are artwork, with generation provenance retained in technical records. Presentation images are not new gameplay verification. The model's approximations remain visible.

## Reproduce or inspect

[source/content.json](source/content.json) contains the bilingual copy and timing. [source/captures.json](source/captures.json) records capture hashes and limits. [source/MANIFEST.json](source/MANIFEST.json) is the **historical upstream receipt** from presentation commit `163ff885`. It covers that original full branch package, including video paths intentionally absent here. This index was rewritten during repository preparation, so the receipt does not validate this combined tree. The original receipt is preserved unchanged; its video files remain on the presentation branch.

Rebuild with Python, ReportLab and Pillow using `python source/build_pdfs.py`. On macOS the script uses installed Arial. Elsewhere set `KC_FONT_REGULAR` and `KC_FONT_BOLD` to Unicode-capable TrueType files. Original font files are not distributed.

## Supporting design archive

[design-kit/](design-kit/) retains editable drafts, earlier cover options, logos, flag artwork, design tokens and screenshot tools. These are supporting authoring materials, not alternative final PDFs. Use the PDF links above for judging. Image provenance and source records remain with the kit.

The canonical video viewer is [https://ropotropo.github.io/Kinetic-Core-2026/demo/](https://ropotropo.github.io/Kinetic-Core-2026/demo/). Video edits and their publication remain separate from this preparation. This source-tree preparation intentionally does not copy, overwrite or freeze the video folder while it is being revised.
