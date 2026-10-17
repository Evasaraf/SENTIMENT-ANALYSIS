(() => {
  "use strict";

  const $ = (s) => document.querySelector(s);
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ------------------------------------------------------------------ *
   * Data
   * ------------------------------------------------------------------ */

  const ORDER = ["sadness", "joy", "love", "anger", "fear", "surprise"];

  const EMOJI = {
    sadness: "😢", joy: "😄", love: "❤️", anger: "😠", fear: "😨", surprise: "😲",
  };

  const COLORS = {
    sadness: "#6d9bf5", joy: "#ffc83d", love: "#ff6b97",
    anger: "#ff5d4d", fear: "#a78bfa", surprise: "#34d3be",
  };

  const EXAMPLES = [
    "I got the offer today and I can't stop smiling.",
    "Nobody showed up and the house feels so quiet.",
    "How dare you read my messages behind my back!",
    "I think someone is following me home.",
    "I adore the way you laugh at your own jokes.",
    "Wait, you flew all the way here for my birthday?",
  ];

  /* Orb personality per emotion: color + how it moves */
  const MOTION = {
    neutral:  { color: [163, 171, 217], speed: 0.6, wobble: 0.06, pulse: 0,    rate: 2,   jitter: 0,     squash: 1,    drop: 0 },
    sadness:  { color: [109, 155, 245], speed: 0.3, wobble: 0.045, pulse: 0.02, rate: 1,   jitter: 0,     squash: 0.86, drop: 0.05 },
    joy:      { color: [255, 200, 61],  speed: 1.3, wobble: 0.10, pulse: 0.05, rate: 3.2, jitter: 0,     squash: 1,    drop: -0.01 },
    love:     { color: [255, 107, 151], speed: 0.8, wobble: 0.05, pulse: 0.10, rate: 2.6, jitter: 0,     squash: 1,    drop: 0 },
    anger:    { color: [255, 93, 77],   speed: 2.4, wobble: 0.12, pulse: 0.03, rate: 6,   jitter: 0.022, squash: 1,    drop: 0 },
    fear:     { color: [167, 139, 250], speed: 1.7, wobble: 0.07, pulse: 0.02, rate: 5,   jitter: 0.014, squash: 0.97, drop: 0.01 },
    surprise: { color: [52, 211, 190],  speed: 1.0, wobble: 0.08, pulse: 0.06, rate: 1.6, jitter: 0,     squash: 1,    drop: -0.02 },
    /* applied on top of the current emotion while waiting for the server */
    thinking: { speed: 2.8, wobble: 0.11, pulse: 0.03, rate: 4, jitter: 0, squash: 1, drop: 0 },
  };

  /* ------------------------------------------------------------------ *
   * Elements
   * ------------------------------------------------------------------ */

  const textEl = $("#text");
  const goBtn = $("#go");
  const clearBtn = $("#clear");
  const countEl = $("#count");
  const noteEl = $("#note");
  const chipsEl = $("#chips");
  const historyWrap = $("#historyWrap");
  const historyEl = $("#history");
  const orbEmoji = $("#orbEmoji");
  const resultTitle = $("#resultTitle");
  const verdictSub = $("#verdictSub");
  const barsEl = $("#bars");
  const healthEl = $("#health");
  const healthText = $("#healthText");

  /* ------------------------------------------------------------------ *
   * Orb (canvas)
   * ------------------------------------------------------------------ */

  const canvas = $("#orb");
  const ctx = canvas.getContext("2d");
  let W = 0, H = 0;

  const cur = { r: 163, g: 171, b: 217, ...strip(MOTION.neutral) };
  const tgt = { r: 163, g: 171, b: 217, ...strip(MOTION.neutral) };

  let energy = 0;      // bumps while typing
  let burst = 0;       // ring on new result
  let burstScale = 1;
  let time = 0;
  let last = performance.now();
  let px = 0, py = 0, tpx = 0, tpy = 0; // pointer lean

  function strip(m) {
    const { color, ...rest } = m;
    return rest;
  }

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = rect.width;
    H = rect.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (reduceMotion) render(performance.now(), 0);
  }

  function setOrb(name) {
    const m = MOTION[name];
    if (m.color) [tgt.r, tgt.g, tgt.b] = m.color;
    Object.assign(tgt, strip(m));
    if (reduceMotion) {
      Object.assign(cur, tgt);
      render(performance.now(), 0);
    }
  }

  function render(now, dt) {
    const k = 1 - Math.exp(-dt * 3);
    for (const key in tgt) cur[key] += (tgt[key] - cur[key]) * k;
    px += (tpx - px) * (1 - Math.exp(-dt * 4));
    py += (tpy - py) * (1 - Math.exp(-dt * 4));
    energy *= Math.exp(-dt * 2.2);
    time += dt * (cur.speed + energy * 1.5);

    ctx.clearRect(0, 0, W, H);

    const cx = W / 2 + px * W * 0.035;
    const cy = H / 2 + py * H * 0.035 + cur.drop * H;
    const base = Math.min(W, H) * 0.3;
    const beat = Math.pow(Math.abs(Math.sin((now / 1000) * cur.rate * 0.5)), 6) * cur.pulse;
    const r = cur.r | 0, g = cur.g | 0, b = cur.b | 0;

    ctx.globalCompositeOperation = "lighter";

    const layers = [
      { scale: 1.0,  alpha: 0.55, phase: 0 },
      { scale: 0.88, alpha: 0.35, phase: 1.7 },
      { scale: 0.74, alpha: 0.22, phase: 3.1 },
    ];

    for (const L of layers) {
      const N = 120;
      ctx.beginPath();
      for (let j = 0; j <= N; j++) {
        const a = (j / N) * Math.PI * 2;
        const n =
          Math.sin(a * 3 + time * 1.1 + L.phase) * 0.6 +
          Math.sin(a * 5 - time * 1.6 + L.phase * 1.3) * 0.4 +
          Math.sin(a * 2 + time * 0.7 - L.phase) * 0.5;
        const jit = cur.jitter * (Math.sin(a * 17 + now / 40) + Math.sin(a * 11 - now / 55)) * 0.5;
        const rad = base * L.scale * (1 + (cur.wobble + energy * 0.05) * n + beat + jit);
        const x = cx + Math.cos(a) * rad;
        const y = cy + Math.sin(a) * rad * cur.squash;
        j ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.closePath();
      const grad = ctx.createRadialGradient(cx, cy, base * 0.05, cx, cy, base * 1.25 * L.scale);
      grad.addColorStop(0, `rgba(${Math.min(255, r + 70)},${Math.min(255, g + 70)},${Math.min(255, b + 70)},${L.alpha + 0.25})`);
      grad.addColorStop(0.55, `rgba(${r},${g},${b},${L.alpha})`);
      grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = grad;
      ctx.fill();
    }

    /* soft halo */
    const halo = ctx.createRadialGradient(cx, cy, base * 0.9, cx, cy, base * 1.7);
    halo.addColorStop(0, `rgba(${r},${g},${b},0.16)`);
    halo.addColorStop(1, `rgba(${r},${g},${b},0)`);
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, W, H);

    /* ring when a result lands */
    if (burst > 0.01) {
      burst *= Math.exp(-dt * 1.8);
      ctx.globalCompositeOperation = "source-over";
      ctx.beginPath();
      ctx.arc(cx, cy, base * (1.05 + (1 - burst) * 0.75 * burstScale), 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${r},${g},${b},${burst * 0.7})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  function loop(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    render(now, dt);
    requestAnimationFrame(loop);
  }

  new ResizeObserver(resizeCanvas).observe(canvas);
  resizeCanvas();
  if (!reduceMotion) {
    requestAnimationFrame(loop);
    window.addEventListener("pointermove", (e) => {
      tpx = (e.clientX / window.innerWidth) * 2 - 1;
      tpy = (e.clientY / window.innerHeight) * 2 - 1;
    }, { passive: true });
  }

  /* ------------------------------------------------------------------ *
   * Bars
   * ------------------------------------------------------------------ */

  const barRefs = {};

  ORDER.forEach((name) => {
    const li = document.createElement("li");
    li.className = "bar";
    li.style.setProperty("--c", COLORS[name]);
    li.innerHTML =
      `<span class="bar-emoji" aria-hidden="true">${EMOJI[name]}</span>` +
      `<span class="bar-name">${name}</span>` +
      `<div class="bar-track"><div class="bar-fill"></div></div>` +
      `<span class="bar-val">0%</span>`;
    barsEl.appendChild(li);
    barRefs[name] = {
      li,
      fill: li.querySelector(".bar-fill"),
      val: li.querySelector(".bar-val"),
      shown: 0,
    };
  });

  function formatPct(p) {
    if (p > 0 && p < 0.01) return "<1%";
    return Math.round(p * 100) + "%";
  }

  function tween(ref, to, delay) {
    const from = ref.shown;
    const dur = 900;
    if (reduceMotion) {
      ref.shown = to;
      ref.val.textContent = formatPct(to);
      return;
    }
    setTimeout(() => {
      const t0 = performance.now();
      const step = (now) => {
        const t = Math.min((now - t0) / dur, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        const v = from + (to - from) * eased;
        ref.val.textContent = formatPct(v);
        if (t < 1) requestAnimationFrame(step);
        else ref.shown = to;
      };
      requestAnimationFrame(step);
    }, delay);
  }

  function updateBars(probs, top) {
    barsEl.classList.add("has-result");
    ORDER.forEach((name, i) => {
      const p = probs[name] ?? 0;
      const ref = barRefs[name];
      ref.li.classList.toggle("is-top", name === top);
      ref.fill.style.transitionDelay = `${i * 60}ms`;
      ref.fill.style.transform = `scaleX(${Math.max(p, 0.012)})`;
      tween(ref, p, i * 60);
    });
  }

  /* ------------------------------------------------------------------ *
   * Result display
   * ------------------------------------------------------------------ */

  function pop(el, keyframes, opts) {
    if (reduceMotion || !el.animate) return;
    el.animate(keyframes, opts);
  }

  function showResult(data) {
    const probs = data.all_probabilites || {};
    const top = data.predicted_emotion;
    const conf = data.confidence;

    document.body.dataset.emotion = top;
    setOrb(top);
    burst = 1;
    burstScale = top === "surprise" ? 1.6 : 1;

    orbEmoji.classList.remove("thinking");
    orbEmoji.textContent = EMOJI[top] || "💭";
    pop(orbEmoji, [
      { transform: "scale(0.3) rotate(-12deg)", opacity: 0 },
      { transform: "scale(1.2) rotate(4deg)", opacity: 1, offset: 0.6 },
      { transform: "scale(1) rotate(0)", opacity: 1 },
    ], { duration: 650, easing: "cubic-bezier(0.22, 1, 0.36, 1)" });

    resultTitle.textContent = top.charAt(0).toUpperCase() + top.slice(1);
    pop(resultTitle, [
      { opacity: 0, transform: "translateY(10px)" },
      { opacity: 1, transform: "none" },
    ], { duration: 500, easing: "ease-out" });

    /* second-best emotion, to be honest about close calls */
    const ranked = ORDER.map((n) => [n, probs[n] ?? 0]).sort((a, b) => b[1] - a[1]);
    const [second, secondP] = ranked[1];
    if (conf < 0.5) {
      verdictSub.innerHTML = `Mixed signals: <strong>${top}</strong> edges out ${second} (${formatPct(conf)} vs ${formatPct(secondP)}).`;
    } else {
      verdictSub.innerHTML = `<strong>${formatPct(conf)}</strong> confident. Next closest is ${second} at ${formatPct(secondP)}.`;
    }

    updateBars(probs, top);
    addHistory(data.text, top, conf);

    /* on small screens the result sits below the input */
    if (window.innerWidth <= 880) {
      $(".stage").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    }
  }

  /* ------------------------------------------------------------------ *
   * Requests
   * ------------------------------------------------------------------ */

  let busy = false;

  function setNote(msg, isError = false) {
    noteEl.textContent = msg;
    noteEl.classList.toggle("error", isError);
  }

  function setLoading(on) {
    busy = on;
    goBtn.classList.toggle("loading", on);
    goBtn.disabled = on || !textEl.value.trim();
    orbEmoji.classList.toggle("thinking", on);
    if (on) {
      orbEmoji.textContent = "💭";
      setOrb("thinking");
      resultTitle.textContent = "Reading…";
      verdictSub.textContent = "Cleaning the text and running the model.";
    }
  }

  async function analyze() {
    const text = textEl.value.trim();
    if (!text || busy) return;

    setNote("");
    setLoading(true);

    const slowTimer = setTimeout(() => {
      setNote("Still working. If the server was idle, waking it up can take up to a minute.");
    }, 4500);
    const ctrl = new AbortController();
    const abortTimer = setTimeout(() => ctrl.abort(), 90000);

    try {
      const res = await fetch("/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
        signal: ctrl.signal,
      });

      if (!res.ok) {
        if (res.status === 503) throw new Error("The model is still loading. Try again in a few seconds.");
        if (res.status === 422) throw new Error("Enter between 1 and 2000 characters.");
        throw new Error("The server hit an error. Try again.");
      }

      const data = await res.json();
      setNote("");
      showResult(data);
    } catch (err) {
      let msg = err.message;
      if (err.name === "AbortError") msg = "The request timed out. Try again.";
      else if (err instanceof TypeError) msg = "Can't reach the server. Check your connection and try again.";

      setNote(msg, true);
      setOrb(document.body.dataset.emotion && MOTION[document.body.dataset.emotion] ? document.body.dataset.emotion : "neutral");
      resultTitle.textContent = "No result";
      verdictSub.textContent = "Fix the issue above and read again.";
      orbEmoji.textContent = "💭";
    } finally {
      clearTimeout(slowTimer);
      clearTimeout(abortTimer);
      setLoading(false);
    }
  }

  /* ------------------------------------------------------------------ *
   * Input handling
   * ------------------------------------------------------------------ */

  function syncInput() {
    const len = textEl.value.length;
    countEl.textContent = `${len} / 2000`;
    countEl.classList.toggle("warn", len > 1800);
    goBtn.disabled = busy || !textEl.value.trim();
    clearBtn.hidden = len === 0;
  }

  textEl.addEventListener("input", () => {
    energy = Math.min(1, energy + 0.35);
    syncInput();
  });

  textEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      analyze();
    }
  });

  goBtn.addEventListener("click", analyze);

  clearBtn.addEventListener("click", () => {
    textEl.value = "";
    syncInput();
    textEl.focus();
  });

  /* Examples */
  EXAMPLES.forEach((t) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chip";
    b.textContent = t;
    b.addEventListener("click", () => {
      textEl.value = t;
      syncInput();
      analyze();
    });
    chipsEl.appendChild(b);
  });

  /* History (this session only) */
  const history = [];

  function addHistory(text, emotion, conf) {
    const existing = history.findIndex((h) => h.text === text);
    if (existing !== -1) history.splice(existing, 1);
    history.unshift({ text, emotion, conf });
    if (history.length > 5) history.pop();

    historyEl.innerHTML = "";
    history.forEach((h) => {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.title = "Load this sentence again";
      btn.innerHTML =
        `<span class="h-emoji" aria-hidden="true">${EMOJI[h.emotion]}</span>` +
        `<span class="h-text"></span>` +
        `<span class="h-pct">${formatPct(h.conf)}</span>`;
      btn.querySelector(".h-text").textContent = h.text; // textContent keeps user input safe
      btn.addEventListener("click", () => {
        textEl.value = h.text;
        syncInput();
        textEl.focus();
      });
      li.appendChild(btn);
      historyEl.appendChild(li);
    });
    historyWrap.hidden = false;
  }

  /* ------------------------------------------------------------------ *
   * Server health (also covers Render cold starts)
   * ------------------------------------------------------------------ */

  function setHealth(state, text) {
    healthEl.dataset.state = state;
    healthText.textContent = text;
  }

  async function checkHealth(attempt = 0) {
    try {
      const res = await fetch("/health", { cache: "no-store" });
      const data = await res.json();
      if (data.model_loaded) {
        setHealth("ready", "Model ready");
        return;
      }
      setHealth("waiting", "Loading model");
    } catch {
      setHealth(attempt > 6 ? "down" : "waiting", attempt > 6 ? "Server unreachable" : "Waking up server");
    }
    setTimeout(() => checkHealth(attempt + 1), 3000);
  }

  /* ------------------------------------------------------------------ */

  syncInput();
  checkHealth();
})();
