# OP-17 hype page

Fan-made static page for the One Piece Card Game set OP-17 "The World's Strongest Warriors":
SP cards, chase cards, leaders and parallels with holographic foil cards and Cardmarket prices.

- `index.html`, `styles.css`, `app.js`: the whole site. No framework, no build step.
- `cards.json`: the card list. Prices may be `null`; the page shows "price soon" until they are filled in.

Run locally:

```sh
python3 -m http.server 8417
# open http://localhost:8417/
```

All paths are relative, so it works on GitHub Pages under a subpath such as `/op17-hype/`.

## Card images

Card images are copies of the official card list images, stored in `img/` (one PNG per card id).
Prices are Cardmarket EN prices (lowest listing and price trend), checked 2026-11-25, in `prices.json` and merged into `cards.json`.

Fan-made, not affiliated with Bandai. Card images © Eiichiro Oda/Shueisha, Toei Animation, Bandai.
