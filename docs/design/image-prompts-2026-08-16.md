# DirectHired — image generation prompts

**For DirectHired to run in DALL·E, 2026-08-16.**

Two image slots on this site may be filled with a generated image. Each one
below gives you a prompt you can paste **verbatim** — nothing to fill in — the
exact size the site needs, what the result must and must not contain, and the
`alt` text to send back with the file.

Every slot here is also recorded in the image provenance registry
(`src/data/images.json`), which feeds the **Category D** section of
`docs/INFORMATION-REQUIRED-BEFORE-PRODUCTION.md`. At production you open that
one generated file and it tells you, for every image on the site, what it
currently is and every line of code that uses it — so a decision to swap in
your own photograph is a known, located change rather than a hunt.

---

## Read this before you generate anything

### Three kinds of image on this site cannot be generated, ever

No prompt exists below for them, and none should be written.

| Slot | Where it would go | Why not |
|---|---|---|
| Helper profile portraits | Block 10a, `src/sections/MeetHelpers.astro` | A generated helper *is* a fabricated helper. A face on a profile card asserts that this specific person exists and can be placed. Master brief §78 (never invent helper details) and §55 (never present placeholder people as actual DirectHired helpers). |
| Reviewer / testimonial faces | Block 10b, `src/sections/Reviews.astro` | A generated face beside a named review manufactures a customer, even when the quote itself is real. §78. |
| "Our team" / "our office" | No such block exists yet | A generated office is a false statement about a real, licensed business (MOM 23C1443). §55 and §78. |

Both of those blocks are currently **absent from the page by design** — not
empty, not "coming soon", not a skeleton. That is the honest state and it must
stay that way until real, consented photographs exist. Nor should you
substitute a silhouette, a grey avatar or an initial-in-a-circle: the blocks
are already complete without one.

The photographer's brief for these — framing, consent, dignity, what is
forbidden on set — is §7 of `docs/design/brand-assessment-2026-08-15.md`. Hand
that to whoever you book.

### Why these prompts do not ask for photographs

Every prompt below asks for something that reads unmistakably as an
**illustration**: flat shapes, matte paper texture, figures with no facial
features drawn.

That is deliberate, and it is worth understanding rather than just accepting.
A photorealistic AI image of a family in a kitchen, on the website of a
licensed employment agency, reads to a visitor as **evidence** — as a real
DirectHired client, in a real placement, photographed. It is not labelled as a
picture of anyone, but it functions as one. The moment it is mistaken for
documentary photography, the site is making a claim it cannot support, which is
exactly what §55 exists to prevent.

An illustration cannot be mistaken for a record. It depicts a *situation* — a
shared task, one room, one light — rather than claiming a *person*. It is also
the honest signal to a visitor that your real photography is still to come,
which costs you nothing, because the page never says otherwise.

The trade is real and you should make it knowingly: illustration is warmer and
safer but less immediate than a good photograph. When your own photography
lands, it should replace these. Nothing about the code makes that hard — the
hero's dimensions are fixed independently of the source file, so the swap is one
line plus new `alt` text.

### How to run these

1. Open DALL·E (ChatGPT with image generation).
2. Paste the prompt **exactly as written**, including the hex codes. Do not
   summarise it — the constraint list is doing most of the work.
3. Ask for the **wide landscape** size (1792 × 1024). That is DALL·E's largest
   landscape output and every crop below is taken from it.
4. Generate it **three or four times** and pick. First results are rarely the
   best, and the "What to reject" list under each prompt is there so you can
   judge a generation instead of accepting one.
5. Send back the **original, uncropped** file plus a note of which prompt it
   came from. Do not run it through an AI upscaler — those invent detail,
   including faces.

---

## Slot A — hero-together

**Used at** `src/sections/Hero.astro:33` (the import), `:58` (the `<Image>`),
`:59` (the `alt` text). This is the first thing anyone sees and it is the
page's LCP element — the single image the browser is measured on for speed.

**Currently** a hand-drawn SVG, `src/assets/hero-placeholder.svg`. It is 4KB
and resolution-independent, which is worth naming: replacing it with any
raster image is a real speed cost, not a free swap. If a generation is only
*slightly* better than the drawing, keep the drawing.

### What it must depict, and why

One frame. One room. One light. Two adults **at the same scale, on the same
plane, both engaged in the same ordinary task**, and a counter that runs
unbroken across the whole frame and passes behind both of them.

That is not decoration, it is the argument the page is making. Your logo's H is
two figures joined at a crossbar — *Happy Employer, Happy Helper*. An earlier
version of this hero showed two people in two separate panels with a line
between them, and both the taste audit and the brand assessment named it the
loudest contradiction on the site: a page selling a match, illustrated with a
wall. Whatever fills this slot must **join**, never divide. No seam, no split,
no diptych, no vertical rule through the middle.

Neither adult may be marked out as employer or helper. No uniform, no apron on
one and not the other, no one seated while the other stands, no one carrying
something for the other, no one in the background.

### Size

- **Generate at 1792 × 1024** (DALL·E wide landscape).
- **Crop to 5:4** — centre crop to **1280 × 1024**. That is the file to send.
- The slot renders at 520 × 416 CSS px in the two-column layout, and widens to
  936 × 749 at a 1920px browser window and 1256 × 1005 at 2560px, because the
  image deliberately breaks the container and bleeds to the right edge of the
  screen (`src/sections/Hero.astro:164-170`).
- So 1280 × 1024 covers every desktop width at 1×, but it is **not** a 2× asset
  for a Retina display. It will look slightly softer than the current vector on
  a high-DPI screen. That is the ceiling of what DALL·E can produce, and it is
  one of the reasons the illustration may be worth keeping until real
  photography lands.
- The site crops this to 4:3 on phones, taking roughly 3% off the top and
  bottom. Keep everything that matters inside the **middle 94% of the height**.

### Prompt A1 — warm editorial illustration (recommended)

```
A warm editorial illustration in a flat gouache and screen-print style, landscape orientation, of a domestic kitchen in a Singapore apartment in the late morning. Two adults of similar build stand at the same long kitchen counter, one slightly left of centre and one slightly right of centre, both leaning in toward the same bowl between them, both pairs of hands on the counter and both engaged in the same task. A child stands in front of the counter with one hand raised to its edge. All three figures are rendered as simplified stylised shapes with no facial features drawn at all — no eyes, no mouths, no rendered skin detail — clearly an illustration and never a photograph. The counter runs unbroken from the left edge of the frame to the right edge and passes behind all three figures, joining them; nothing divides the frame vertically and there is no line, seam or panel edge through the middle. A single tall window with a simple metal grille sits on the left wall and is the only light source, casting one soft warm shaft across the floor. Ordinary lived-in details: a kettle, a folded cloth, a small potted plant, a pair of shoes by a doorway. The colour palette is strictly limited to warm off-white (#FAF8F5), soft white (#FFFFFF), warm near-black (#2A2724), warm mid-grey (#4d4d4d), deep teal (#046A6C) for the child and small accents, and one thin bright teal line (#00a4a6) along the front edge of the counter. Matte paper texture with soft grain, no gloss. Flat even lighting with gentle soft shadows, no dramatic contrast, no lens flare, no depth-of-field blur. Both adults are drawn at exactly the same height and on the same plane, neither behind the other, neither in a uniform, neither seated while the other stands. Generous calm empty space across the upper third of the frame. No text, no letters, no numbers, no logos, no watermarks, no signage.
```

**Alt text to ship with it:**
`Illustration of two adults and a child together at one kitchen counter, sharing the same everyday task`

### Prompt A2 — the room without people (lower risk)

Use this if A1's figures come out looking too much like specific individuals,
or if you would rather not show any human figure at all before your own
photography exists. It says the same thing — one counter, two places, one light
— using objects instead of people.

```
A minimal editorial illustration, landscape orientation, of a bright empty kitchen in a Singapore apartment in the late morning, drawn as flat geometric shapes with clean straight edges, matte colour and no people anywhere in the frame. One long counter runs unbroken from the left edge of the image to the right edge, with two identical settings laid at it — two bowls, two cloths, two cups — one to the left of centre and one to the right, and a third smaller cup placed between them. A tall window with a simple metal grille on the left wall is the only light source, casting a single soft warm shaft across the counter and the floor. Ordinary lived-in objects: a kettle, a bamboo drying pole visible through the window, a folded stack of linen, a small potted plant, a pair of shoes by a doorway. The colour palette is strictly limited to warm off-white (#FAF8F5), soft white (#FFFFFF), warm near-black (#2A2724), warm mid-grey (#4d4d4d), deep teal (#046A6C), and one thin bright teal line (#00a4a6) along the front edge of the counter. Matte paper texture with soft grain, flat even light, gentle soft shadows, no gloss and no reflections. Calm, spacious and editorial, with generous empty space across the upper third of the frame and nothing dividing the image vertically. No people, no figures, no silhouettes, no hands, no text, no letters, no numbers, no logos, no watermarks, no signage.
```

**Alt text to ship with it:**
`Illustration of a sunlit kitchen counter laid with two matching settings side by side`

### Palette

The page ground is warm off-white `#FAF8F5` and the image sits directly on it,
so the image's own background must be that same warm off-white — a pure white
or a cool grey will show as a visible rectangle. The deep teal `#0E3A3B` may
appear as a shadow tone. Bright teal `#00a4a6` is the brand colour and belongs
to **one thin line and nothing else** — it is a graphic accent here, never a
field, never a wash, never behind anything.

**Not in the palette, at all:** blue, purple, orange, pink, red, any
teal-and-orange film grade, any neon, any glow. If the image has a colour cast
that is not warm, reject it.

### What to reject

- Anything that could be mistaken for a photograph. If you have to look twice,
  it is wrong for this slot.
- Any face with rendered eyes, mouth or expression — even a small one, even in
  the background.
- One figure in a uniform, an apron, a maid's dress, or otherwise marked out
  as staff; one figure seated while the other stands; one figure behind the
  other or smaller than the other.
- Any vertical line, seam, panel edge, doorframe or column running down the
  middle of the frame and separating the two figures.
- A counter that stops short of the frame edges, or that is interrupted.
- More than one light source, hard directional shadows, golden-hour drama, lens
  flare, motion blur.
- Any text, letters or numbers anywhere — DALL·E's lettering is always wrong and
  it will read as a mistake.
- A show-flat, a magazine kitchen, marble everywhere, no clutter. The premium
  reading comes from the room being **real**, not expensive.
- Cool white or grey backgrounds; anything that will not sit on `#FAF8F5`.
- Six fingers, fused hands, extra limbs. Check the hands specifically — they
  are the whole point of this frame, so they have to be right.

---

## Slot B — og-share

**Used at** `src/layouts/BaseLayout.astro:94`, which currently declares
`twitter:card="summary"` — a small card with no image — because shipping a
large-image card with no image renders *worse* than not asking for one.

**Currently** nothing. There is no share image.

### What it must depict, and why

This is the highest-value single image on the site, and it is the one most
people will see first. **WhatsApp reads `og:image` directly**, and WhatsApp is
this business's live conversion channel — every time someone forwards your link
to a friend looking for a helper, this image is the whole first impression, at
roughly 300 pixels wide in a chat bubble.

Which sets the brief: it has to survive being small. Large simple shapes, one
clear subject, high separation between the subject and the ground. A detailed
scene turns to mush at 300px. Whatever is in it, you should be able to read it
at arm's length from a phone.

It must not contain text. DALL·E cannot render words reliably, and a share card
with a misspelt word on it is worse than a share card with none. If you want
your wordmark on the card, it gets set over the image afterwards in a design
tool — say so when you send the file back and leave the calm area of the frame
clear for it.

### Size

- **Generate at 1792 × 1024**.
- **Crop to 1.91:1** — centre crop to **1792 × 941**, then resize to
  **1200 × 630**. That is the exact size Open Graph wants.
- Some apps crop the card slightly. Keep the subject inside the **middle 90%**
  of the frame.

### Prompt B1 — the shared counter, at share-card scale (recommended)

```
A warm editorial illustration in a flat gouache and screen-print style, wide landscape orientation, of a single long kitchen counter in a Singapore home seen straight on in the late morning. The counter runs unbroken from the left edge of the frame to the right edge. Two simplified stylised adult figures stand at it, one left of centre and one right of centre, both leaning in toward the same bowl placed between them, both drawn at exactly the same height and on the same plane. The figures have no facial features drawn at all — no eyes, no mouths, no rendered skin detail — clearly an illustration and never a photograph, and neither figure wears a uniform. The right third of the frame is calm and almost empty, holding only a soft wash of warm light from an unseen window. The colour palette is strictly limited to warm off-white (#FAF8F5), soft white (#FFFFFF), warm near-black (#2A2724), warm mid-grey (#4d4d4d), deep teal (#046A6C), and one thin bright teal line (#00a4a6) along the front edge of the counter. Matte paper texture with soft grain, flat even lighting, gentle soft shadows, no gloss and no reflections. Large simple shapes and strong silhouette separation so that the image still reads clearly when shown at 300 pixels wide. No text, no letters, no numbers, no logos, no watermarks, no signage, no user interface elements.
```

**`og:image:alt` to ship with it:**
`Illustration of two people working side by side at one kitchen counter`

### Prompt B2 — the quiet still life (safest)

No figures at all. This is the safest image on the whole site to publish before
any release is signed, and it holds up better than B1 at thumbnail size.

```
A warm editorial still-life illustration in a flat gouache and screen-print style, wide landscape orientation. A plain wooden table seen from a low three-quarter angle in the late morning, holding a neatly folded stack of linen, a simple kettle, a single ceramic cup and a small potted plant. Light from an unseen window on the left falls in one soft warm shaft across the surface of the table. There are no people, no hands and no figures anywhere in the frame. The colour palette is strictly limited to warm off-white (#FAF8F5), soft white (#FFFFFF), warm near-black (#2A2724), warm mid-grey (#4d4d4d) and deep teal (#046A6C), with one small bright teal (#00a4a6) detail on the cup. Matte paper texture with soft grain, flat even lighting, gentle soft shadows, no gloss and no reflections. Large simple shapes with strong readability when shown at 300 pixels wide, and generous calm empty space in the upper right of the frame. No text, no letters, no numbers, no logos, no watermarks, no signage.
```

**`og:image:alt` to ship with it:**
`Illustration of folded linen, a kettle and a cup on a table in morning light`

### Palette

Same rules as Slot A, with one addition: the card is seen against **both** a
white and a dark chat background depending on the reader's phone. Warm
off-white `#FAF8F5` works on both. Do not accept a generation with a
transparent-looking or very pale edge that will bleed into a white chat bubble
— it needs a defined frame.

### What to reject

- Anything unreadable at 300 pixels wide. Shrink the image on your screen and
  look at it before you decide.
- Text of any kind, including a fake logo, a sign, or letterforms on packaging.
- Faces, expressions, or any figure detailed enough to identify.
- Busy scenes, many small objects, fine pattern, thin lines — all of it
  disappears at chat-bubble size.
- Cool, grey, blue or purple casts; anything that will look wrong beside the
  warm off-white site it links to.
- A composition with the subject dead centre and no calm area — you will want
  somewhere to put the wordmark later.

---

## After you send the images back

For each file, tell us **which prompt** it came from and **which slot** it is
for. Both facts get recorded in `src/data/images.json` along with every line of
code that uses the image, its provenance changes from `hand-svg` / `none-yet`
to `ai-generated`, and it appears in Category D of
`docs/INFORMATION-REQUIRED-BEFORE-PRODUCTION.md` — the one file to open at
production when you decide, image by image, whether to keep it or replace it
with your own photograph.

Nothing on the site will ever caption, credit or imply that a generated image
depicts an actual DirectHired family, helper, client or member of staff. That
applies to the `alt` text as much as to anything visible, which is why the alt
text above says "illustration" and names no one.
