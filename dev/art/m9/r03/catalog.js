const ART_REVIEW = {
  "id": "noe-m9-sheet-art-r03",
  "date": "2026-11-15",
  "status": "original-field-kit-selected-for-main-character-sheet",
  "generation": "Built-in image_gen, four referenced-image variations; WEBP encoding with ffmpeg, no crop or generative postprocessing afterward.",
  "reference": "../r02/sources/field-kit.png",
  "decisions": [
    {
      "id": "field-kit",
      "decision": "preferred-direction",
      "by": "user",
      "text": "I particularly like the physical nylon material background. Create variants of it. Lean into the rip-stop mesh, the nylon MOLLE strap, the reinforced stiching and sewing techniques."
    },
    {
      "id": "workshop",
      "decision": "keep",
      "by": "user"
    },
    {
      "id": "field-drawing-r01",
      "decision": "reject",
      "by": "user"
    },
    {
      "id": "field-kit",
      "decision": "selected-for-main-character-sheet",
      "by": "user",
      "sourceFilename": "exec-8ccae121-0700-4316-892a-2dd037b3a8df.png",
      "selection": "../selection.json"
    }
  ],
  "candidates": [
    {
      "id": "field-kit",
      "label": "Original Field kit",
      "file": "../r02/field-kit-v1.webp",
      "master": "../r02/sources/field-kit.png",
      "kind": "generated-material",
      "status": "approved-for-main-character-sheet",
      "description": "Original preferred nylon material reference.",
      "size": [
        2172,
        724
      ],
      "sourceSha256": "bf223634f0be028e6551c4f5b3c15117fab3eb159323f9789fa5d3230a99b731",
      "outputSha256": "a72c9919617397ba052f622e35354dcfe5b27117645bc288ef586c55a632a0b1",
      "bytes": 545230
    },
    {
      "id": "ripstop",
      "label": "Rip-stop",
      "file": "ripstop-v1.webp",
      "master": "sources/ripstop.png",
      "kind": "generated-material-variant",
      "status": "not-selected-for-main-character-sheet",
      "description": "Fine square rip-stop weave; restrained bound edge and double stitch.",
      "prompt": "Use case: photorealistic-natural. Image 1 is the material, palette and composition reference: the Field kit background the user particularly likes. Create a fresh, clearly distinct variant within that same physical nylon equipment family. Deliver the background artwork alone, opaque, very wide 3:1 horizontal, approximately 2172 x 724 px. Flat straight-on macro photograph of used tactical nylon, neutral dark graphite and charcoal, with subtle gray olive undertone as in the reference. This sits behind a real dense RPG character-sheet UI: left 60 percent stays quiet and low contrast under a white character name; stronger fabric construction and details are in the rightmost third. Physical woven fibers, restrained wear, visible but dark thread, believable sewing, soft diffuse light. Keep the same overall restrained darkness and tangible material quality. No text, numbers, badges, logos, interface, weapons, buckles, decorative metal hardware, drawings, schematics, camouflage print, bright colors, stylized fantasy ornament, heavy fraying or theatrical damage. Show real fabric construction rather than embossed/printed fake sewing. Variant 1: RIP-STOP. Replace the plain canvas with dark tightly woven rip-stop nylon: an unmistakable fine square grid made from slightly heavier reinforcing yarn woven through the cloth, not white printed graph lines. Fine mesh-like surface texture, tiny gentle ripples and compressed fibers. On the far right, one narrow nylon binding tape finishes a straight reinforced edge, with two parallel rows of small, consistent stitches that visibly enter the fabric. Keep almost the whole banner an uninterrupted rip-stop field; only a narrow construction detail at the edge. The rip-stop grid must be legible at sheet-header scale without becoming a bright moire pattern.",
      "size": [
        2172,
        724
      ],
      "sourceSha256": "4a368927037ab04f647077854d760709b184e83360be0337da83ae18035b9ba6",
      "outputSha256": "8ba0b2e2fe62eafc1d6c6dfcc0976b2666812c84bc6a794a0bc0e013a1f3451e",
      "bytes": 626234
    },
    {
      "id": "molle",
      "label": "MOLLE",
      "file": "molle-v1.webp",
      "master": "sources/molle.png",
      "kind": "generated-material-variant",
      "status": "not-selected-for-main-character-sheet",
      "description": "Horizontal webbing rows, clear loops and short vertical bar-tacks.",
      "prompt": "Use case: photorealistic-natural. Image 1 is the material, palette and composition reference: the Field kit background the user particularly likes. Create a fresh, clearly distinct variant within that same physical nylon equipment family. Deliver the background artwork alone, opaque, very wide 3:1 horizontal, approximately 2172 x 724 px. Flat straight-on macro photograph of used tactical nylon, neutral dark graphite and charcoal, with subtle gray olive undertone as in the reference. This sits behind a real dense RPG character-sheet UI: left 60 percent stays quiet and low contrast under a white character name; stronger fabric construction and details are in the rightmost third. Physical woven fibers, restrained wear, visible but dark thread, believable sewing, soft diffuse light. Keep the same overall restrained darkness and tangible material quality. No text, numbers, badges, logos, interface, weapons, buckles, decorative metal hardware, drawings, schematics, camouflage print, bright colors, stylized fantasy ornament, heavy fraying or theatrical damage. Show real fabric construction rather than embossed/printed fake sewing. Variant 2: MOLLE WEBBING. Dark rip-stop nylon base with a small practical panel of horizontal woven nylon webbing rows occupying the rightmost 35 percent. The horizontal straps run parallel, with consistent spacing, and are fixed to the base at regular intervals by short dense vertical bar-tack stitches; between attachment points are subtle shallow strap loops, with physically plausible shadows. Tightly woven webbing has its own ribbed texture distinct from the finer rip-stop base. Show three rows, broad and clear at small sheet size. Keep the left 60 percent plain rip-stop. The sewing is structural, dark gray thread, controlled and slightly worn, without loose crossing thread or floating stitch marks.",
      "size": [
        2172,
        724
      ],
      "sourceSha256": "cd0c77227d943f7a36290fee3dc4a2b9f00b2c0479a48b020b74578568230b6d",
      "outputSha256": "5c828a1f0ffac444ec29f2159744eec08875fe4dc5342a50ab9b0ece601ebc8d",
      "bytes": 584162
    },
    {
      "id": "reinforced",
      "label": "Reinforced",
      "file": "reinforced-v1.webp",
      "master": "sources/reinforced.png",
      "kind": "generated-material-variant",
      "status": "not-selected-for-main-character-sheet",
      "description": "A broad strap anchor, box-X reinforcement, double rows and bar-tacks.",
      "prompt": "Use case: photorealistic-natural. Image 1 is the material, palette and composition reference: the Field kit background the user particularly likes. Create a fresh, clearly distinct variant within that same physical nylon equipment family. Deliver the background artwork alone, opaque, very wide 3:1 horizontal, approximately 2172 x 724 px. Flat straight-on macro photograph of used tactical nylon, neutral dark graphite and charcoal, with subtle gray olive undertone as in the reference. This sits behind a real dense RPG character-sheet UI: left 60 percent stays quiet and low contrast under a white character name; stronger fabric construction and details are in the rightmost third. Physical woven fibers, restrained wear, visible but dark thread, believable sewing, soft diffuse light. Keep the same overall restrained darkness and tangible material quality. No text, numbers, badges, logos, interface, weapons, buckles, decorative metal hardware, drawings, schematics, camouflage print, bright colors, stylized fantasy ornament, heavy fraying or theatrical damage. Show real fabric construction rather than embossed/printed fake sewing. Variant 3: REINFORCED SEWING. A broad vertical graphite nylon strap is securely anchored to a layered rip-stop panel near the right edge, taking no more than the rightmost 30 percent. Show one clear, deliberate box-X stitch at the strap anchor: a stitched rectangle with two straight diagonals joining its corners, thread seated through the fabric, plus short dense bar-tacks at the strap end. Two parallel straight stitch lines follow a nearby folded panel seam. Sewing should look like durable load-bearing construction on real worn field gear: even thread tension, darker puncture holes, slightly rubbed edges, convincing doubled layers. The left remains calm fine rip-stop nylon. Do not multiply decorative stitch rectangles; one strong anchor construction is the focus.",
      "size": [
        2172,
        724
      ],
      "sourceSha256": "31e444962c9f8ba53b69e618a4df4c6f561ab607f341bed7906920799e482d37",
      "outputSha256": "79560cbe70fcb06446bd7ddcd64ba9c7ee3d89808763349db578ec43e5d80179",
      "bytes": 551730
    },
    {
      "id": "field-pouch",
      "label": "Field pouch",
      "file": "field-pouch-v1.webp",
      "master": "sources/field-pouch.png",
      "kind": "generated-material-variant",
      "status": "not-selected-for-main-character-sheet",
      "description": "Layered pouch corner, bound seam, webbing and reinforced stitching.",
      "prompt": "Use case: photorealistic-natural. Image 1 is the material, palette and composition reference: the Field kit background the user particularly likes. Create a fresh, clearly distinct variant within that same physical nylon equipment family. Deliver the background artwork alone, opaque, very wide 3:1 horizontal, approximately 2172 x 724 px. Flat straight-on macro photograph of used tactical nylon, neutral dark graphite and charcoal, with subtle gray olive undertone as in the reference. This sits behind a real dense RPG character-sheet UI: left 60 percent stays quiet and low contrast under a white character name; stronger fabric construction and details are in the rightmost third. Physical woven fibers, restrained wear, visible but dark thread, believable sewing, soft diffuse light. Keep the same overall restrained darkness and tangible material quality. No text, numbers, badges, logos, interface, weapons, buckles, decorative metal hardware, drawings, schematics, camouflage print, bright colors, stylized fantasy ornament, heavy fraying or theatrical damage. Show real fabric construction rather than embossed/printed fake sewing. Variant 4: FIELD POUCH CONSTRUCTION. Show a quiet broad dark rip-stop nylon panel, with a clearly layered folded pouch corner entering from the lower right and a short section of nylon webbing near the far right. The pouch corner uses a smooth bound edge, two clean parallel rows of topstitching and a short dense bar-tack at the seam junction. Subtle rounded fabric thickness and a small realistic shadow reveal the layered construction; no open black holes, zippers or added objects. A more tangible, softly worn sewn assembly than the flat reference. Keep all distinctive construction within the rightmost third and lower right corner, and the left 65 percent calm. Ribbed webbing, square rip-stop grid, binding tape and strong sewing should each have distinct believable material texture.",
      "size": [
        2172,
        724
      ],
      "sourceSha256": "059513aa8b2f5ddd6988cd556ce62ed3ca81e15c28c56b322d7eba3962117a03",
      "outputSha256": "d3240be1bc207bab9ee87912102dc8465a614a9016e3e8025adedfa915c02690",
      "bytes": 561118
    }
  ],
  "selection": "../selection.json"
};
