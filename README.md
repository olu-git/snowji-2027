# SNOWJI 2027 website

A static site with no build step: a lean home page plus a FAQ page. The skier in the hero photo (SNOWJI 2025, Basil's `Hero/Snowji-Hero-56.jpg`) rides a trail down the page as you scroll. All bookings link out to WeTravel.

```
index.html        home: hero, the trip, passes, add-ons, booking, 2025 photos, finish
faq.html          FAQ and the fine print (refunds, payments, gear, passports)
css/styles.css    colours and fonts at the top
js/main.js        trail and skier animation
assets/img/       hero.webp (with skier), hero-clean.webp (skier removed), skier.webp (cut-out), share.jpg (link preview), photos
assets/fonts/     CC Smash (headings) and CC Mighty Mouth (text), converted to WOFF
```

**Preview locally:** `python -m http.server 5177 --directory snowji-2027`, then open http://localhost:5177

**Deploy:** GitHub Pages from `main` (repo `olu-git/snowji-2027`), served at https://snowji.soji.au. Push to `main` and it's live in about a minute.

**Link previews:** `assets/img/preview.jpg` (1200×630). Messaging apps cache previews per URL, so after changing it, rename the file and update `og:image` / `twitter:image` in both pages.

**Changing the hero photo:** the skier's position is hard-coded in `js/main.js` (`SKIER`, `ANCHOR`). A new photo needs a new cut-out and new numbers.

## Still to confirm

- Whether the ski bus is extra for the extra snow day and extra night session. The site doesn't mention the bus on the home page.
- Coronet Peak for the night session is named only in the FAQ.
- The two activities aren't named anywhere yet.

## Fonts

Headings use **CC Smash** and body text uses **CC Mighty Mouth**, self-hosted from `assets/fonts/` (converted from the CapCut OTFs). Neither font has a `→`, and CC Smash has no `·`, so those characters fall back to Bangers and Inter (loaded from Google Fonts).

The repo is public, so anyone can download the font files from it.
