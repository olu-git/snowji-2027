# SNOWJI 2027 website

A static site with no build step: a lean home page plus a FAQ page. The skier in the hero photo (SNOWJI 2025, Basil's `Hero/Snowji-Hero-56.jpg`) rides a trail down the page as you scroll. All bookings link out to WeTravel.

```
index.html        home: hero, the trip, passes, add-ons, booking, 2025 photos, finish
faq.html          FAQ and the fine print (refunds, payments, gear, passports)
css/styles.css    colours and fonts at the top (Unbounded headings, Inter body)
js/main.js        trail and skier animation
assets/img/       hero.webp (with skier), hero-clean.webp (skier removed), skier.webp (cut-out), photos
```

**Preview locally:** `python -m http.server 5177 --directory snowji-2027`, then open http://localhost:5177

**Deploy:** it's plain static files. Drag the `snowji-2027` folder into Netlify Drop, or host it on GitHub Pages, Vercel or the SOJI domain. Once it has a domain, change `og:image` to an absolute URL so WhatsApp and Instagram link previews show the photo.

**Changing the hero photo:** the skier's position is hard-coded in `js/main.js` (`SKIER`, `ANCHOR`). A new photo needs a new cut-out and new numbers.

## Still to confirm

- Whether the ski bus is extra for the extra snow day and extra night session. The site doesn't mention the bus on the home page.
- Coronet Peak for the night session is named only in the FAQ.
- The two activities aren't named anywhere yet.

## Fonts (Adobe Fonts)

Headings use **CC Smash** (Open style) and body text uses **CC Mighty Mouth Variable**, both from Adobe Fonts. Until the kit is linked, the site falls back to Bangers and Inter.

1. At fonts.adobe.com, add CC Smash and CC Mighty Mouth Variable to a **Web Project**, with `snowji.soji.au` as the domain.
2. Copy the project's `<link rel="stylesheet" href="https://use.typekit.net/XXXXXXX.css">` into the `<head>` of `index.html` and `faq.html`, above `css/styles.css`.
3. Check the CSS family names Adobe shows. The stylesheet expects `cc-smash` and `cc-mighty-mouth-variable` (`--display` and `--body` in `css/styles.css`).
