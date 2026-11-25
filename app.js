/* OP-17 hype page: data loading, rendering, holo engine, modal. No deps. */
(() => {
  "use strict";

  const reduceMQ = window.matchMedia("(prefers-reduced-motion: reduce)");
  let reduced = reduceMQ.matches;
  reduceMQ.addEventListener?.("change", (e) => { reduced = e.matches; kick(); });

  const DEFAULT_FEATURED = ["OP17-118_p2", "OP17-119_p1", "OP17-040_p1"];
  const RARITY_ORDER = { "SP CARD": 0, SEC: 1, TR: 2, L: 3, SR: 4, R: 5, UC: 6, C: 7 };
  const VARIANT = { base: "Base", p1: "Parallel", p2: "Alt art p2", p3: "Alt art p3" };
  const COLORS = {
    Red: "#ff4d5e", Green: "#2fd38a", Blue: "#3da2ff",
    Purple: "#a66bff", Black: "#c9cbe0", Yellow: "#ffd23f",
  };
  // Image source for a card. Change this one line to point at another host.
  const imgUrl = (c) => `img/${c.id}.png`;
  const eur = new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" });
  const hasPrice = (c) => typeof c.price_eur === "number" && isFinite(c.price_eur);
  const $ = (s, r = document) => r.querySelector(s);

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function byPrice(order) {
    return (a, b) => {
      const pa = hasPrice(a), pb = hasPrice(b);
      if (pa && pb && b.price_eur !== a.price_eur) return b.price_eur - a.price_eur;
      if (pa !== pb) return pa ? -1 : 1;
      return order(a, b);
    };
  }
  const byRarityThenCode = (a, b) =>
    (RARITY_ORDER[a.rarity] ?? 9) - (RARITY_ORDER[b.rarity] ?? 9) ||
    a.code.localeCompare(b.code) || a.variant.localeCompare(b.variant);

  /* ---------- rendering ---------- */

  function holoKind(c) {
    if (c.category === "sp") return "sp";
    if (c.category === "chase") return "chase";
    if (c.category === "parallel") return "parallel";
    return "base";
  }

  function buildHolo(c, { eager = false } = {}) {
    const holo = el("div", `holo holo--${holoKind(c)}`);
    const tint = COLORS[c.color] || "#f5cf6a";
    holo.style.setProperty("--glow", tint + "88");
    holo.style.setProperty("--tint", tint);
    holo.append(el("div", "holo__shadow"), el("div", "holo__glow"));
    const face = el("div", "holo__face");
    const img = el("img", "holo__img");
    img.alt = `${c.name} (${c.code}${c.variant !== "base" ? " " + c.variant : ""}, ${c.rarity})`;
    img.decoding = "async";
    img.loading = eager ? "eager" : "lazy";
    img.referrerPolicy = "no-referrer";
    img.width = 600; img.height = 838;
    img.draggable = false;
    img.addEventListener("error", () => holo.classList.add("is-broken"), { once: true });
    img.src = imgUrl(c);
    // Shown if the image host refuses the request (see README: the official host
    // sends Cross-Origin-Resource-Policy: same-site).
    const fb = el("div", "holo__fallback");
    fb.append(el("em", null, c.rarity), el("strong", null, c.name), el("small", null, `${c.code}${c.variant !== "base" ? " · " + c.variant : ""}`));
    face.append(img, fb, el("div", "holo__foil"), el("div", "holo__glitter"), el("div", "holo__glare"), el("div", "holo__edge"));
    holo.append(face);
    return holo;
  }

  function priceBadge(c) {
    if (!hasPrice(c)) return el("span", "price price--soon", "price soon");
    const node = c.cardmarket_url ? el("a", "price") : el("span", "price");
    if (c.cardmarket_url) {
      node.href = c.cardmarket_url;
      node.target = "_blank";
      node.rel = "noopener";
      node.title = c.cardmarket_label ? `Cardmarket: ${c.cardmarket_label}` : "View on Cardmarket";
    }
    const from = el("span");
    from.append(el("b", null, eur.format(c.price_eur)), " from");
    node.append(from);
    if (typeof c.trend_eur === "number") node.append(el("span", "price__trend", `· trend ${eur.format(c.trend_eur)}`));
    return node;
  }

  function subline(c) {
    const sub = el("div", "card__sub");
    const dot = el("span", "dot");
    dot.style.setProperty("--dot", COLORS[c.color] || "#888");
    dot.title = c.color;
    sub.append(dot, el("span", "card__code", c.code), el("span", `tag tag--${c.rarity.replace(/\s+/g, "")}`, c.rarity));
    if (c.variant !== "base") sub.append(el("span", "tag tag--variant", VARIANT[c.variant] || c.variant));
    return sub;
  }

  function buildCard(c, opts = {}) {
    const wrap = el("article", "card");
    const btn = el("button", "card__btn");
    btn.type = "button";
    btn.setAttribute("aria-label", `Open ${c.name}, ${c.code} ${c.rarity}`);
    const holo = buildHolo(c, opts);
    btn.append(holo);
    btn.addEventListener("click", (e) => {
      if (btn._dragged) { e.preventDefault(); return; }
      openModal(c);
    });
    const label = el("div", "card__label");
    label.append(el("h3", "card__name", c.name), subline(c), priceBadge(c));
    wrap.append(btn, label);
    registerHolo(btn, holo, opts);
    return wrap;
  }

  function render(data) {
    const cards = data.cards || [];
    const sp = cards.filter((c) => c.category === "sp").sort(byPrice(byRarityThenCode));
    const chase = cards.filter((c) => c.category === "chase").sort(byPrice(byRarityThenCode));
    const par = cards
      .filter((c) => c.category === "parallel" || c.category === "base")
      .sort(byPrice(byRarityThenCode));

    const fill = (key, list) => {
      const grid = $(`[data-grid="${key}"]`);
      grid.replaceChildren(...list.map((c) => buildCard(c)));
    };
    fill("sp", sp);
    fill("chase", chase);
    fill("parallels", par);

    // featured: top-priced chase cards, else defaults
    const pricedChase = chase.filter(hasPrice);
    let featured = pricedChase.length >= 3
      ? pricedChase.slice(0, 3)
      : DEFAULT_FEATURED.map((id) => cards.find((c) => c.id === id)).filter(Boolean);
    if (featured.length < 3) featured = chase.slice(0, 3);
    // put the top card in the middle of the fan
    if (featured.length === 3) featured = [featured[1], featured[0], featured[2]];
    const fan = $("[data-featured]");
    fan.replaceChildren(...featured.map((c, i) => {
      const slot = el("div", "fan-slot");
      slot.append(buildCard(c, { eager: true, idle: true, phase: i * 2.1 }));
      return slot;
    }));

    // stats
    const stats = $("[data-stats]");
    const s = [
      [sp.length, "SP cards"],
      [chase.length, "chase cards"],
      [par.length, "leaders & parallels"],
    ];
    const top = cards.filter(hasPrice).sort((a, b) => b.price_eur - a.price_eur)[0];
    stats.replaceChildren(...s.map(([n, t]) => {
      const li = el("li");
      li.append(el("b", null, String(n)), t);
      return li;
    }));
    if (top) {
      const li = el("li");
      li.append(el("b", null, eur.format(top.price_eur)), `top pull: ${top.name}`);
      stats.append(li);
    }
    if (data.set?.code) $("[data-set-code]").textContent = data.set.code;

    $("[data-footer]").textContent =
      "Fan-made, not affiliated with Bandai. Card images © Eiichiro Oda/Shueisha, Toei Animation, Bandai, " +
      `from the official card list. Prices from Cardmarket, checked ${data.prices_checked || "soon"}.`;
  }

  /* ---------- holo engine ---------- */

  const holos = new Set();
  const MAX_TILT = 15;
  let scrollV = 0;           // smoothed scroll velocity (px/ms)
  let shimmer = 0;           // eased shimmer amount (-1..1)
  let lastScrollY = window.scrollY;
  let lastScrollT = performance.now();
  let lastScrollEvent = 0;
  let rafId = 0;
  let lastFrame = performance.now();

  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const h = e.target._holo;
      if (!h) continue;
      h.visible = e.isIntersecting;
      if (h.visible) kick();
    }
  }, { rootMargin: "80px 0px" });

  function registerHolo(btn, holo, opts = {}) {
    const h = {
      btn, holo,
      visible: false,
      idle: !!opts.idle,
      phase: opts.phase ?? Math.random() * 6.28,
      sign: Math.random() < .5 ? -1 : 1,
      hover: false,
      tx: 0, ty: 0,           // target pointer (-0.5..0.5)
      x: 0, y: 0,             // current pointer
      a: 0,                   // current activity
      rx: 0, ry: 0, fx: 0, fy: 0, px: 0, py: 0,
      cy: 0, lastA: -1,
      modal: !!opts.modal,
    };
    btn._holo = h;
    holos.add(h);
    io.observe(btn);
    attachPointer(h);
    return h;
  }

  function unregisterHolo(h) {
    io.unobserve(h.btn);
    holos.delete(h);
  }

  function attachPointer(h) {
    const { btn } = h;
    let startX = 0, startY = 0, down = false;
    const setFromEvent = (e) => {
      const r = btn.getBoundingClientRect();
      h.tx = Math.min(.5, Math.max(-.5, (e.clientX - r.left) / r.width - .5));
      h.ty = Math.min(.5, Math.max(-.5, (e.clientY - r.top) / r.height - .5));
    };
    btn.addEventListener("pointerenter", (e) => {
      if (e.pointerType === "mouse") { h.hover = true; setFromEvent(e); kick(); }
    });
    btn.addEventListener("pointermove", (e) => {
      if (e.pointerType !== "mouse" && !down) return;
      h.hover = true;
      setFromEvent(e);
      if (down && Math.hypot(e.clientX - startX, e.clientY - startY) > 8) btn._dragged = true;
      kick();
    });
    btn.addEventListener("pointerdown", (e) => {
      btn._dragged = false;
      startX = e.clientX; startY = e.clientY;
      if (e.pointerType !== "mouse") {
        down = true;
        h.hover = true;
        setFromEvent(e);
        try { btn.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
        kick();
      }
    });
    const end = (e) => {
      if (e.pointerType !== "mouse") {
        down = false;
        h.hover = false;
        h.tx = 0; h.ty = 0;
        // let the click (if any) see the drag flag, then reset
        setTimeout(() => { btn._dragged = false; }, 0);
      }
      kick();
    };
    btn.addEventListener("pointerup", end);
    btn.addEventListener("pointercancel", end);
    btn.addEventListener("pointerleave", (e) => {
      if (e.pointerType === "mouse") { h.hover = false; h.tx = 0; h.ty = 0; kick(); }
    });
  }

  function onScroll() {
    const now = performance.now();
    const dy = window.scrollY - lastScrollY;
    const dt = Math.max(8, now - lastScrollT);
    const v = dy / dt;
    scrollV = scrollV * .6 + v * .4;
    lastScrollY = window.scrollY;
    lastScrollT = now;
    lastScrollEvent = now;
    kick();
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", kick, { passive: true });

  function kick() {
    if (!rafId) { lastFrame = performance.now(); rafId = requestAnimationFrame(frame); }
  }

  function frame(now) {
    rafId = 0;
    const dt = Math.min(64, now - lastFrame) / 16.667; // frames @60fps
    lastFrame = now;
    const vh = window.innerHeight || 800;
    const t = now / 1000;

    // scroll velocity decays when scrolling stops
    if (now - lastScrollEvent > 90) scrollV *= Math.pow(.8, dt);
    const targetShimmer = reduced ? 0 : Math.max(-1, Math.min(1, scrollV * .55));
    shimmer += (targetShimmer - shimmer) * (1 - Math.pow(.78, dt));

    const ease = 1 - Math.pow(.84, dt);   // pointer follow
    const easeA = 1 - Math.pow(.82, dt);  // activity
    let busy = Math.abs(shimmer) > .002 || Math.abs(scrollV) > .002;

    // read phase (layout reads first, no writes)
    const active = [];
    for (const h of holos) {
      if (!h.visible && !h.modal) continue;
      if (!reduced) {
        const r = h.btn.getBoundingClientRect();
        h.cy = (r.top + r.height / 2 - vh / 2) / (vh / 2); // -1 (top) .. 1 (bottom)
      } else h.cy = 0;
      active.push(h);
    }

    // write phase
    for (const h of active) {
      let tx = h.tx, ty = h.ty;
      let idleA = 0;
      if (h.idle && !h.hover && !reduced) {
        tx = Math.sin(t * .7 + h.phase) * .22;
        ty = Math.cos(t * .55 + h.phase) * .16;
        idleA = .35;
        busy = true;
      }
      h.x += (tx - h.x) * ease;
      h.y += (ty - h.y) * ease;

      const pos = Math.max(-1.2, Math.min(1.2, h.cy));
      const sh = shimmer;
      const hoverA = h.hover ? 1 : 0;
      const scrollA = Math.min(1, Math.abs(sh) * 1.6);
      const targetA = Math.max(hoverA, idleA, scrollA * .9);
      h.a += (targetA - h.a) * easeA;

      const tiltMul = reduced ? 0 : 1;
      const rx = tiltMul * (-h.y * 2 * MAX_TILT + (-pos * 3.5) + sh * 12);
      const ry = tiltMul * (h.x * 2 * MAX_TILT + sh * 5 * h.sign);
      const fx = h.x * 2 + (reduced ? 0 : sh * .9 * h.sign + pos * .15);
      const fy = h.y * 2 + (reduced ? 0 : pos * .35 + sh * .8);
      const px = h.hover ? h.x : h.x + (reduced ? 0 : sh * .35 * h.sign);
      const py = h.hover ? h.y : h.y + (reduced ? 0 : -pos * .25 - sh * .3);
      const a = reduced ? Math.max(.35, h.a) : h.a;

      const changed =
        Math.abs(rx - h.rx) > .01 || Math.abs(ry - h.ry) > .01 ||
        Math.abs(fx - h.fx) > .001 || Math.abs(fy - h.fy) > .001 ||
        Math.abs(a - h.lastA) > .001 || Math.abs(px - h.px) > .001 || Math.abs(py - h.py) > .001;
      if (!changed) continue;
      busy = true;
      h.rx = rx; h.ry = ry; h.fx = fx; h.fy = fy; h.px = px; h.py = py; h.lastA = a;
      const s = h.holo.style;
      s.setProperty("--rx", rx.toFixed(2));
      s.setProperty("--ry", ry.toFixed(2));
      s.setProperty("--fx", fx.toFixed(3));
      s.setProperty("--fy", fy.toFixed(3));
      s.setProperty("--px", px.toFixed(3));
      s.setProperty("--py", py.toFixed(3));
      s.setProperty("--act", a.toFixed(3));
    }

    if (busy) rafId = requestAnimationFrame(frame);
  }

  /* ---------- modal ---------- */

  const modal = $("[data-modal]");
  const stage = $("[data-modal-stage]");
  const info = $("[data-modal-info]");
  let modalHolo = null;
  let lastFocus = null;

  function openModal(c) {
    lastFocus = document.activeElement;
    if (modalHolo) { unregisterHolo(modalHolo); modalHolo = null; }
    const btn = el("button", "card__btn");
    btn.type = "button";
    btn.setAttribute("aria-label", `${c.name} card. Drag to tilt.`);
    const holo = buildHolo(c, { eager: true });
    btn.append(holo);
    stage.replaceChildren(btn);
    modalHolo = registerHolo(btn, holo, { modal: true, idle: true, phase: 0 });
    modalHolo.visible = true;

    const kicker = el("p", "section__kicker",
      c.category === "sp" ? "SP card" : c.category === "chase" ? "Chase card" : c.category === "parallel" ? "Parallel" : "Base rare");
    const h = el("h3", null, c.name);
    h.id = "modal-name";
    const facts = el("dl", "modal__facts");
    const fact = (k, v) => { facts.append(el("dt", null, k), el("dd", null, v)); };
    fact("Card", c.code);
    fact("Rarity", c.rarity);
    fact("Version", VARIANT[c.variant] || c.variant);
    fact("Colour", c.color);
    if (c.cardmarket_label) fact("Cardmarket", c.cardmarket_label);

    const prices = el("div", "modal__prices");
    if (hasPrice(c)) {
      const p1 = el("div", "modal__price");
      p1.append(el("span", null, "From"), el("b", null, eur.format(c.price_eur)));
      prices.append(p1);
      if (typeof c.trend_eur === "number") {
        const p2 = el("div", "modal__price");
        p2.append(el("span", null, "Trend"), el("b", null, eur.format(c.trend_eur)));
        prices.append(p2);
      }
    } else {
      prices.append(el("span", "price price--soon", "price soon"));
    }

    const nodes = [kicker, h, subline(c), facts, prices];
    if (c.cardmarket_url) {
      const a = el("a", "btn btn--gold", "View on Cardmarket ↗");
      a.href = c.cardmarket_url;
      a.target = "_blank";
      a.rel = "noopener";
      nodes.push(a);
    }
    nodes.push(el("p", "modal__hint", "Drag or move over the card to tilt it."));
    info.replaceChildren(...nodes);

    if (typeof modal.showModal === "function") modal.showModal();
    else modal.setAttribute("open", "");
    document.documentElement.style.overflow = "hidden";
    $("[data-close]", modal).focus({ preventScroll: true });
    kick();
  }

  function closeModal() {
    if (modal.open) modal.close();
  }
  modal.addEventListener("close", () => {
    document.documentElement.style.overflow = "";
    if (modalHolo) { unregisterHolo(modalHolo); modalHolo = null; }
    stage.replaceChildren();
    lastFocus?.focus?.({ preventScroll: true });
  });
  $("[data-close]", modal).addEventListener("click", closeModal);
  // backdrop / empty-area tap closes
  modal.addEventListener("click", (e) => {
    if (e.target === modal || e.target.classList.contains("modal__inner")) closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.open) { e.preventDefault(); closeModal(); }
  });

  /* ---------- boot ---------- */

  fetch("cards.json", { cache: "no-cache" })
    .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
    .then((data) => { render(data); kick(); })
    .catch((err) => {
      console.warn("Could not load cards.json", err);
      const msg = el("p", "section__blurb", "Card list could not be loaded. Try refreshing.");
      $("[data-grid=sp]").replaceChildren(msg);
    });
})();
