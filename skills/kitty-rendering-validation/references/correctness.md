# Rendering correctness

## Prove the chosen path

Kitty producer updates and host output are distinct. Rozi may ingest small producer patches yet compose and transmit a whole image to Ghostty. Capture PNGs are intentionally composed. They validate the retained scene, not the host forwarding path.

In the tui-lipan implementation introduced by PR #328, ordinary native placements use `a=p` without `c=`, while composed placements include explicit cell dimensions. Both paths can emit `a=p`; counting that token alone is insufficient. Verify this distinction against current `native_patches.rs` and `image.rs` before using the wiretap counters. Transmission uses `a=T` and placement uses `a=p`. Chunked uploads can have continuation APCs without another action token, so header counts are command counts, not full image or byte counts.

Do not assert exact traffic from a synthetic scene using an uncontrolled browser. First run deterministic raw-pixel fixtures, then confirm the real page separately. Match measured pixel-cell dimensions; estimated fallback dimensions must not enable natural-size native placement. A fixture constructed before host probing must refresh its source dimensions at initialization and resize. Otherwise a scene called “native” may silently remain composed.

## Fixtures and visible layering

Use the current `terminal_patch_layers` example with a stable font/size and fresh host for each mode. Explicitly set `TUI_LIPAN_TERMINAL_IMAGES=composed` for the reference and `native` for the candidate, after confirming these current environment values in the source. Native eligibility can still choose composition.

Capture text, block, image-only, return-to-text, resize-smaller and restore-original states. The ordinary overlay should cover the middle of the image while leaving its anchor uncovered. Compare the image/UI rectangle at identical dimensions. Exclude documented host decoration or transient badges only; do not choose a crop that removes the defect. Require a native command in the image-only candidate state. Negative controls should fail meaningfully, not merely fail compilation.

For Rozi, run `tools/graphics-patches.py` in an isolated pane, let it report rows/columns/pixel size through `--status`, and verify the static base, higher-z toolbar, small offset patch and translucent moving patch remain visible. Transparent Canvas, inactive Animated and label-free Frame wrappers should not force composition. Painted text, frame fills and active fades must correctly cover image pixels. A clipping test should put a potentially painted widget beneath a genuinely zero-width ancestor.

For a saved pair use `scripts/compare_png.py reference.png candidate.png --roi X Y WIDTH HEIGHT --diff scratch-diff.png`. Omit `--roi` for whole-frame equality. Use an existing Pillow environment or a temporary virtual environment rather than modifying system Python. Record the crop with the result.

## Lifecycle matrix

Choose checks relevant to the change rather than running a large matrix blindly:

| Trigger | Required observation |
| --- | --- |
| Image in unchanged pane A, text-only update in B | A's actual host placement survives the backend draw |
| Same source, same anchor, distinct z and placement IDs | One pending transmission precedes both surviving placements |
| Cache eviction/cleanup between resolutions | Canonical native upload remains unique; no duplicate transmission for one ID |
| Anchor overwritten by a later widget | No upload acknowledgement for an unsent upload; retry remains possible |
| Discarded output or failed flush | Upload is acknowledged only after successful output; later retry transmits as needed |
| Resize and restore | Correct clipping, dimensions, offsets, toolbar and corners |
| Native/composed mode transition | Old placements are removed, retained scene renders through the new path |
| Client reconnect after producer stops | Scene replays from retained state without new producer output |
| Close pane then idle | Retired resources expire; unrelated panes and placements survive |

Actual backend output tests need to use the real damage planner and draw lifecycle. Intermediate geometry or cache assertions alone miss deletion/recreation failures. Preserve anchor indexing; correctness fixes need not become a persistent-placement-diff redesign.

When doing an old-code negative control, save the exact working diff, temporarily restore only the implicated implementation, run the targeted regression, require the expected assertion failure, then restore in `finally`. Never alter unrelated user changes or use a broad checkout/reset. A compile failure is not evidence the regression detects the old bug.

## Overlay fallback and text captures

Check the composed fallback too. Batched image rows can mark text cells skipped, so falling back from native is not enough if ordinary glyphs still fail to reach the host. Verify host bytes contain the overlay text, backend cells contain it, and the physical screenshot shows it.

Captured underlay metadata must agree with final PNG contribution through the entire image stack, wide glyphs, private-use glyph room, and cursor layers. Span/recording replay needs the same z order and original contributing cells as live capture. Redact fully occluded text while retaining cells with visible pixels. Compare recording keyframes and deltas to live PNGs using both bitmap and font renderers when touching that contract. These are separate from native host eligibility tests.
