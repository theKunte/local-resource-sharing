import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFirebaseAuth } from "../hooks/useFirebaseAuth";

/* ---------- Brand tokens (inline for single-file portability) ---------- */
const C = {
  forest: "#1A2E1E",
  forestDeep: "#132218",
  pine: "#2D6A4F",
  topo: "#7EC8A0",
  cream: "#F4EFE6",
  clay: "#C57B40",
  stone: "#8A7A6A",
};

/* ---------- Peak mark (nested triangles + summit dot) ---------- */
function PeakMark({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
    >
      <path d="M2 28 L16 4 L30 28 Z" stroke={C.topo} strokeWidth="1.5" />
      <path
        d="M7 28 L16 10 L25 28 Z"
        stroke={C.topo}
        strokeWidth="1.2"
        opacity="0.75"
      />
      <path
        d="M11 28 L16 16 L21 28 Z"
        stroke={C.topo}
        strokeWidth="1"
        opacity="0.55"
      />
      <circle cx="16" cy="4" r="1.6" fill={C.topo} />
    </svg>
  );
}

/* ---------- Hero canvas animation ---------- */
function HeroCanvas() {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let w = 0;
    let h = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const stars = Array.from({ length: 150 }, () => ({
      x: Math.random(),
      y: Math.random() * 0.6,
      r: Math.random() * 1.2 + 0.2,
      tw: Math.random() * Math.PI * 2,
      sp: 0.005 + Math.random() * 0.01,
    }));

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const mountainLayer = (
      offset: number,
      color: string,
      amp: number,
      base: number,
      t: number,
    ) => {
      ctx.beginPath();
      ctx.moveTo(0, h);
      const peaks = 7;
      for (let i = 0; i <= peaks; i++) {
        const x = (w / peaks) * i;
        const drift = Math.sin(t * 0.0004 + i * 0.6 + offset) * 8;
        const y = base + Math.sin(i * 1.3 + offset) * amp + drift;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
    };

    const drawPines = () => {
      ctx.fillStyle = "#0c1a10";
      const count = Math.max(18, Math.floor(w / 40));
      for (let i = 0; i < count; i++) {
        const x = (w / count) * i + (i % 2 === 0 ? 6 : -6);
        const baseY = h - 6;
        const treeH = 22 + ((i * 7) % 18);
        ctx.beginPath();
        ctx.moveTo(x, baseY);
        ctx.lineTo(x - 7, baseY);
        ctx.lineTo(x, baseY - treeH);
        ctx.lineTo(x + 7, baseY);
        ctx.closePath();
        ctx.fill();
      }
    };

    const drawSnowCap = () => {
      const cx = w * 0.62;
      const peakY = h * 0.32;
      const grad = ctx.createLinearGradient(cx, peakY, cx, peakY + 40);
      grad.addColorStop(0, "rgba(244,239,230,0.85)");
      grad.addColorStop(1, "rgba(244,239,230,0)");
      ctx.beginPath();
      ctx.moveTo(cx - 30, peakY + 35);
      ctx.lineTo(cx, peakY);
      ctx.lineTo(cx + 30, peakY + 35);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
    };

    const drawTopoRings = (t: number) => {
      const cx = w / 2;
      const cy = h * 0.55;
      for (let i = 0; i < 8; i++) {
        const pulse = (Math.sin(t * 0.0008 + i * 0.4) + 1) / 2;
        ctx.beginPath();
        ctx.ellipse(cx, cy, 60 + i * 28, 22 + i * 10, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(126,200,160,${0.04 + pulse * 0.05})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    };

    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h);

      // sky gradient
      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, "#0d1a12");
      sky.addColorStop(1, C.forest);
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);

      // stars
      stars.forEach((s) => {
        s.tw += s.sp;
        const a = 0.3 + (Math.sin(s.tw) + 1) * 0.35;
        ctx.fillStyle = `rgba(244,239,230,${a})`;
        ctx.beginPath();
        ctx.arc(s.x * w, s.y * h, s.r, 0, Math.PI * 2);
        ctx.fill();
      });

      drawTopoRings(t);

      // mountains back to front
      mountainLayer(0.4, "#152a1c", 40, h * 0.55, t);
      mountainLayer(1.2, "#11241a", 60, h * 0.65, t);
      mountainLayer(2.1, "#0b1c12", 80, h * 0.78, t);
      drawSnowCap();
      drawPines();

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      className="absolute inset-0 h-full w-full"
      aria-hidden="true"
    />
  );
}

/* ---------- Reusable buttons (Tailwind only, no UI lib) ---------- */
function ClayButton({
  children,
  onClick,
  className = "",
  ariaLabel,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      className={`inline-flex items-center justify-center rounded-md px-5 py-3 text-sm font-medium tracking-wide text-white transition hover:brightness-110 active:translate-y-px ${className}`}
      style={{ backgroundColor: C.clay }}
    >
      {children}
    </button>
  );
}

function GhostButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center justify-center rounded-md border px-5 py-3 text-sm font-medium tracking-wide transition hover:bg-white/5"
      style={{ borderColor: "rgba(244,239,230,0.3)", color: C.cream }}
    >
      {children}
    </button>
  );
}

/* ---------- Count-up on scroll ---------- */
function CountUp({ value, suffix = "" }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [n, setN] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const start = performance.now();
            const dur = 1400;
            const step = (now: number) => {
              const p = Math.min(1, (now - start) / dur);
              const eased = 1 - Math.pow(1 - p, 3);
              setN(Math.round(value * eased));
              if (p < 1) requestAnimationFrame(step);
            };
            requestAnimationFrame(step);
            io.disconnect();
          }
        });
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [value]);
  return (
    <span ref={ref}>
      {n.toLocaleString()}
      {suffix}
    </span>
  );
}

/* ---------- Activity feed ---------- */
const ACTIVITY = [
  {
    who: "Maya K.",
    what: "borrowed",
    item: "MSR Hubba Hubba tent",
    when: "just now",
  },
  {
    who: "Tom R.",
    what: "listed",
    item: "La Sportiva G2 boots",
    when: "2m ago",
  },
  {
    who: "Jake C.",
    what: "returned",
    item: "BD harness + belay",
    when: "6m ago",
  },
  {
    who: "Sara L.",
    what: "joined",
    item: "Olympic Climbers group",
    when: "12m ago",
  },
  {
    who: "Devon P.",
    what: "borrowed",
    item: "Pungo 120 kayak",
    when: "18m ago",
  },
];

/* ---------- Reviews ---------- */
const REVIEWS = [
  {
    quote:
      "Borrowed a tent from a friend-of-a-friend the night before a Cascades trip. Smoother than any rental shop.",
    name: "Eli M.",
    place: "Seattle, WA",
  },
  {
    quote:
      "I list my old climbing rack here. It pays for new gear and I only loan to people I'd belay.",
    name: "Priya S.",
    place: "Portland, OR",
  },
  {
    quote:
      "Our club's gear closet finally has a system. No more spreadsheet chaos.",
    name: "Cole T.",
    place: "Bellingham, WA",
  },
];

/* ---------- Steps ---------- */
const STEPS = [
  {
    t: "Join a trusted group",
    d: "Get vouched in by a friend or club. No open marketplace.",
  },
  { t: "Browse gear nearby", d: "Filter by group, distance, and trust score." },
  {
    t: "Request and meet",
    d: "Owner approves. Chat, meet, hand off the gear.",
  },
  {
    t: "Return + build trust",
    d: "Clean borrows raise your standing. Fees can drop over time.",
  },
];

/* ---------- Listings ---------- */
const LISTINGS = [
  {
    icon: "⛺",
    name: "MSR Hubba Hubba NX 2P tent",
    owner: "Maya K.",
    borrows: 14,
    loc: "Ballard, Seattle",
    price: "free",
  },
  {
    icon: "🥾",
    name: "La Sportiva G2 SM boots",
    owner: "Tom R.",
    borrows: 8,
    loc: "Bend, OR",
    price: "$25/day",
  },
  {
    icon: "🧗",
    name: "Black Diamond harness + belay",
    owner: "Jake C.",
    borrows: 5,
    loc: "Squamish-adjacent",
    price: "$15/day",
  },
  {
    icon: "🛶",
    name: "Wilderness Systems Pungo kayak",
    owner: "Sara L.",
    borrows: 11,
    loc: "Lake Union",
    price: "$40/day",
  },
];

/* ---------- Meetups ---------- */
const MEETUPS = [
  {
    m: "JUL",
    d: "12",
    t: "Beginner trad day — Index",
    loc: "Index, WA",
    spots: 4,
  },
  {
    m: "JUL",
    d: "20",
    t: "Sound paddle + potluck",
    loc: "Alki Beach",
    spots: 9,
  },
  {
    m: "AUG",
    d: "03",
    t: "Enchantments gear share",
    loc: "Leavenworth",
    spots: 2,
  },
];

/* ===================================================================== */

export default function Landing() {
  const { signInWithGoogle } = useFirebaseAuth();
  const handleSignIn = useCallback(() => {
    void signInWithGoogle();
  }, [signInWithGoogle]);

  /* Calculator */
  const [val, setVal] = useState(400);
  const daily = useMemo(() => Math.round(val * 0.05), [val]);

  /* Activity feed */
  const [feedIdx, setFeedIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(
      () => setFeedIdx((i) => (i + 1) % ACTIVITY.length),
      3200,
    );
    return () => clearInterval(id);
  }, []);
  const visibleFeed = useMemo(() => {
    const out = [];
    for (let i = 0; i < 4; i++)
      out.push(ACTIVITY[(feedIdx + i) % ACTIVITY.length]);
    return out;
  }, [feedIdx]);

  /* Stepper */
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setStep((s) => {
        if (s >= STEPS.length - 1) {
          setPlaying(false);
          return s;
        }
        return s + 1;
      });
    }, 2400);
    return () => clearInterval(id);
  }, [playing]);

  /* Gift card */
  const [gift, setGift] = useState(25);

  const fontSerif = { fontFamily: "Georgia, 'Times New Roman', serif" };
  const fontMono = {
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  };

  return (
    <div
      style={{ backgroundColor: C.cream, color: C.forest }}
      className="min-h-screen"
    >
      {/* ============ NAV ============ */}
      <nav
        style={{ backgroundColor: C.forest }}
        className="sticky top-0 z-40 text-white"
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-8">
          <a href="#top" className="flex items-center gap-2">
            <PeakMark size={26} />
            <span className="text-xl" style={fontSerif}>
              <span style={{ color: C.cream, fontStyle: "italic" }}>Wild</span>
              <span style={{ color: C.topo, fontStyle: "italic" }}>Peer</span>
            </span>
          </a>
          <div
            className="hidden items-center gap-7 text-sm sm:flex"
            style={{ color: C.cream }}
          >
            <a href="#listings" className="hover:opacity-80">
              Browse gear
            </a>
            <a href="#community" className="hover:opacity-80">
              Groups
            </a>
            <a href="#how" className="hover:opacity-80">
              How it works
            </a>
          </div>
          <ClayButton onClick={handleSignIn} ariaLabel="Sign in with Google">
            Sign in with Google
          </ClayButton>
        </div>
      </nav>

      {/* ============ HERO ============ */}
      <header
        id="top"
        className="relative flex items-center justify-center overflow-hidden text-white"
        style={{ backgroundColor: C.forest, minHeight: 520 }}
      >
        <HeroCanvas />
        <div className="relative z-10 mx-auto max-w-3xl px-6 py-24 text-center">
          <span
            className="inline-block rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.18em]"
            style={{ color: C.topo, borderColor: "rgba(126,200,160,0.45)" }}
          >
            Pacific Northwest · Gear for every trail
          </span>
          <h1
            className="mt-6 text-5xl leading-[1.05] sm:text-6xl"
            style={{ ...fontSerif, fontStyle: "italic", color: C.cream }}
          >
            Good things,
            <br />
            <span style={{ color: C.topo }}>shared.</span>
          </h1>
          <p
            className="mx-auto mt-6 max-w-xl text-base leading-relaxed"
            style={{ color: "rgba(244,239,230,0.78)" }}
          >
            Borrow from people you already trust. No strangers, no rental
            platforms — just friends, clubs, and the gear to get you outside.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <ClayButton onClick={handleSignIn}>Get started free</ClayButton>
            <GhostButton
              onClick={() =>
                document
                  .getElementById("listings")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
            >
              Browse gear
            </GhostButton>
          </div>
          <div className="mt-16 flex flex-col items-center gap-2 opacity-70">
            <div className="h-10 w-px" style={{ backgroundColor: C.topo }} />
            <span
              className="text-[10px] uppercase tracking-[0.3em]"
              style={{ color: C.topo }}
            >
              Explore
            </span>
          </div>
        </div>
      </header>

      {/* ============ TRUST STRIP ============ */}
      <section
        style={{ backgroundColor: C.forestDeep }}
        className="text-white/85"
      >
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-6 py-6 sm:grid-cols-3 sm:gap-12 sm:py-5">
          {[
            { i: "👥", t: "4,200+ members across PNW" },
            { i: "🔒", t: "Trusted groups only — no strangers" },
            { i: "🌲", t: "Free to join, free to share" },
          ].map((x) => (
            <div
              key={x.t}
              className="flex items-center justify-center gap-3 text-sm"
            >
              <span aria-hidden="true">{x.i}</span>
              <span>{x.t}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ============ WHY ============ */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="mb-12 text-center">
          <p
            className="text-[11px] uppercase tracking-[0.25em]"
            style={{ color: C.stone }}
          >
            Why WildPeer
          </p>
          <h2
            className="mt-3 text-4xl"
            style={{ ...fontSerif, fontStyle: "italic" }}
          >
            Built on trust, not transactions.
          </h2>
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          <div
            className="rounded-lg p-8"
            style={{
              backgroundColor: "#EFE8DA",
              border: `1px solid ${C.topo}`,
            }}
          >
            <h3 className="mb-4 text-xl" style={fontSerif}>
              WildPeer
            </h3>
            <ul className="space-y-3 text-[15px]">
              {[
                "Vouched-in members only",
                "Owner sets the price — or shares free",
                "Trust grows over time, fees drop",
                "Group-based, not anonymous",
                "Real gear, real people, real PNW",
              ].map((t) => (
                <li key={t} className="flex gap-3">
                  <span style={{ color: C.pine }} aria-hidden="true">
                    ✓
                  </span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
          <div
            className="rounded-lg bg-white p-8"
            style={{ border: `1px solid rgba(0,0,0,0.08)` }}
          >
            <h3
              className="mb-4 text-xl"
              style={{ ...fontSerif, color: C.stone }}
            >
              Generic rental platforms
            </h3>
            <ul className="space-y-3 text-[15px]" style={{ color: C.stone }}>
              {[
                "Open to anyone with a credit card",
                "Platform sets the price, takes a cut",
                "Every transaction starts from zero",
                "Strangers, insurance disputes, deposits",
                "Gear sits in warehouses, not trailheads",
              ].map((t) => (
                <li key={t} className="flex gap-3">
                  <span style={{ color: C.clay }} aria-hidden="true">
                    ✕
                  </span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ============ TRUST LADDER ============ */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <h2
          className="mb-8 text-3xl"
          style={{ ...fontSerif, fontStyle: "italic" }}
        >
          The trust ladder
        </h2>
        <div
          className="grid grid-cols-1 overflow-hidden rounded-lg sm:grid-cols-3"
          style={{ border: `1px solid ${C.stone}` }}
        >
          {[
            {
              tag: "Close friends",
              body: "Share free. The default for your inner circle.",
              badge: "Free",
              color: C.topo,
              text: C.forest,
            },
            {
              tag: "Acquaintances",
              body: "Small rental fee. Owner sets the price.",
              badge: "Owner-set",
              color: "#E2B770",
              text: C.forest,
            },
            {
              tag: "Trusted over time",
              body: "Clean borrows raise standing. Fees drop.",
              badge: "Trust grows",
              color: "#9DB7D6",
              text: C.forest,
            },
          ].map((r, i) => (
            <div
              key={r.tag}
              className="bg-white p-6"
              style={{
                borderLeft: i === 0 ? undefined : `1px solid ${C.stone}40`,
              }}
            >
              <span
                className="inline-block rounded-full px-2.5 py-1 text-[11px] font-medium"
                style={{ backgroundColor: r.color, color: r.text }}
              >
                {r.badge}
              </span>
              <h3 className="mt-3 text-lg" style={fontSerif}>
                {r.tag}
              </h3>
              <p className="mt-1.5 text-sm" style={{ color: C.stone }}>
                {r.body}
              </p>
            </div>
          ))}
        </div>

        {/* Calculator */}
        <div
          className="mt-8 rounded-lg bg-white p-8"
          style={{ border: `1px solid ${C.stone}40` }}
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-xl" style={fontSerif}>
              Rental price guide
            </h3>
            <span className="text-xs" style={{ color: C.stone }}>
              ~5% of gear value per day
            </span>
          </div>
          <div className="mt-6 grid items-center gap-6 sm:grid-cols-2">
            <div>
              <label
                className="text-xs uppercase tracking-[0.18em]"
                style={{ color: C.stone }}
              >
                Gear value
              </label>
              <input
                type="range"
                min={50}
                max={2000}
                step={10}
                value={val}
                onChange={(e) => setVal(Number(e.target.value))}
                className="mt-3 w-full"
                aria-label="Gear value in dollars"
                style={{ accentColor: C.pine }}
              />
              <div
                className="mt-2 flex justify-between text-xs"
                style={{ color: C.stone }}
              >
                <span>$50</span>
                <span style={fontMono}>${val.toLocaleString()}</span>
                <span>$2,000</span>
              </div>
            </div>
            <div
              className="rounded-md p-6 text-center"
              style={{ backgroundColor: "#EFE8DA" }}
            >
              <p
                className="text-xs uppercase tracking-[0.18em]"
                style={{ color: C.stone }}
              >
                Suggested daily rate
              </p>
              <p
                className="mt-2 text-4xl"
                style={{ ...fontSerif, color: C.pine }}
              >
                ${daily}
                <span className="text-base" style={{ color: C.stone }}>
                  {" "}
                  /day
                </span>
              </p>
              <p className="mt-3 text-xs italic" style={{ color: C.stone }}>
                You set the final price — this is just a guide.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============ LISTINGS ============ */}
      <section id="listings" className="mx-auto max-w-6xl px-6 pb-24">
        <h2
          className="mb-8 text-3xl"
          style={{ ...fontSerif, fontStyle: "italic" }}
        >
          Gear out there right now
        </h2>
        <div
          className="overflow-hidden rounded-lg bg-white"
          style={{ border: `1px solid ${C.stone}40` }}
        >
          {LISTINGS.map((g, i) => (
            <div
              key={g.name}
              className="grid grid-cols-12 items-center gap-3 px-5 py-4 text-sm"
              style={{
                borderTop: i === 0 ? undefined : `1px solid ${C.stone}30`,
              }}
            >
              <div className="col-span-1 text-2xl" aria-hidden="true">
                {g.icon}
              </div>
              <div className="col-span-12 sm:col-span-4">
                <div style={fontSerif} className="text-base">
                  {g.name}
                </div>
                <div className="text-xs" style={{ color: C.stone }}>
                  {g.loc}
                </div>
              </div>
              <div className="col-span-6 flex items-center gap-2 sm:col-span-3">
                <span
                  className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-medium text-white"
                  style={{ backgroundColor: C.pine }}
                >
                  {g.owner
                    .split(" ")
                    .map((p) => p[0])
                    .join("")}
                </span>
                <div>
                  <div>{g.owner}</div>
                  <div
                    className="text-[11px]"
                    style={{ color: C.stone }}
                    title="Clean borrows"
                  >
                    {g.borrows} clean borrows
                  </div>
                </div>
              </div>
              <div className="col-span-3 sm:col-span-2">
                <span
                  className="rounded-full px-2.5 py-1 text-[11px] font-medium"
                  style={{
                    backgroundColor: g.price === "free" ? C.topo : "#EFE8DA",
                    color: C.forest,
                  }}
                >
                  {g.price}
                </span>
              </div>
              <div className="col-span-3 text-right sm:col-span-2">
                <button
                  onClick={handleSignIn}
                  className="rounded-md border px-3 py-1.5 text-xs font-medium transition hover:bg-black/5"
                  style={{ borderColor: C.pine, color: C.pine }}
                >
                  Request
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ============ COMMUNITY ============ */}
      <section
        id="community"
        style={{ backgroundColor: "#EFE8DA" }}
        className="py-24"
      >
        <div className="mx-auto max-w-6xl px-6">
          <h2
            className="mb-12 text-3xl"
            style={{ ...fontSerif, fontStyle: "italic" }}
          >
            A community, not a marketplace.
          </h2>

          {/* stats */}
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            {[
              { v: 4218, l: "members", d: "+312 this month" },
              { v: 2341, l: "items shared", d: "+187 this month" },
              { v: 8902, l: "borrows completed", d: "+604 this month" },
              { v: 67, l: "trusted groups", d: "+5 this month" },
            ].map((s) => (
              <div key={s.l}>
                <div
                  className="text-4xl"
                  style={{ ...fontSerif, color: C.pine }}
                >
                  <CountUp value={s.v} />
                </div>
                <div className="mt-1 text-sm" style={{ color: C.forest }}>
                  {s.l}
                </div>
                <div className="text-xs" style={{ color: C.topo }}>
                  {s.d}
                </div>
              </div>
            ))}
          </div>

          {/* avatars */}
          <div className="mt-12 flex items-center gap-4">
            <div className="flex -space-x-2">
              {["MK", "TR", "JC", "SL", "EP", "DP", "RG"].map((i, idx) => (
                <span
                  key={i}
                  className="flex h-9 w-9 items-center justify-center rounded-full border-2 text-[11px] font-medium text-white"
                  style={{
                    backgroundColor: [
                      C.pine,
                      C.clay,
                      C.topo,
                      C.forest,
                      C.stone,
                      C.pine,
                      C.clay,
                    ][idx],
                    borderColor: "#EFE8DA",
                  }}
                >
                  {i}
                </span>
              ))}
            </div>
            <p className="text-sm" style={{ color: C.forest }}>
              4,200+ adventurers across the Pacific Northwest
            </p>
          </div>

          {/* feed + meetups */}
          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            <div
              className="rounded-lg bg-white p-6"
              style={{ border: `1px solid ${C.stone}40` }}
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 style={fontSerif} className="text-lg">
                  Live activity
                </h3>
                <span
                  className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider"
                  style={{ color: C.topo }}
                >
                  <span
                    className="inline-block h-1.5 w-1.5 animate-pulse rounded-full"
                    style={{ backgroundColor: C.topo }}
                  />
                  Live
                </span>
              </div>
              <ul className="space-y-2.5" aria-live="polite">
                {visibleFeed.map((a, i) => (
                  <li
                    key={`${a.who}-${feedIdx}-${i}`}
                    className="flex items-center justify-between rounded-md px-3 py-2.5 text-sm transition"
                    style={{
                      backgroundColor: i === 0 ? "#F4EFE6" : "transparent",
                      opacity: i === 3 ? 0.4 : 1,
                      animation: i === 0 ? "fadeIn 0.4s ease-out" : undefined,
                    }}
                  >
                    <span>
                      <span style={{ color: C.pine, fontWeight: 500 }}>
                        {a.who}
                      </span>{" "}
                      <span style={{ color: C.stone }}>{a.what}</span>{" "}
                      <span>{a.item}</span>
                    </span>
                    <span
                      className="text-[11px]"
                      style={{ ...fontMono, color: C.stone }}
                    >
                      {a.when}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div
              className="rounded-lg bg-white p-6"
              style={{ border: `1px solid ${C.stone}40` }}
            >
              <h3 style={fontSerif} className="mb-4 text-lg">
                Upcoming meetups
              </h3>
              <ul className="space-y-3">
                {MEETUPS.map((m) => (
                  <li
                    key={m.t}
                    className="flex items-center gap-4 rounded-md p-3"
                    style={{ backgroundColor: "#F4EFE6" }}
                  >
                    <div
                      className="flex h-12 w-12 flex-col items-center justify-center rounded-md text-white"
                      style={{ backgroundColor: C.forest }}
                    >
                      <span className="text-[10px]" style={fontMono}>
                        {m.m}
                      </span>
                      <span style={fontSerif} className="leading-none">
                        {m.d}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div style={fontSerif}>{m.t}</div>
                      <div className="text-xs" style={{ color: C.stone }}>
                        {m.loc}
                      </div>
                    </div>
                    <span className="text-xs" style={{ color: C.pine }}>
                      {m.spots} spots
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ============ HOW IT WORKS ============ */}
      <section
        id="how"
        style={{ backgroundColor: C.forest }}
        className="py-24 text-white"
      >
        <div className="mx-auto grid max-w-6xl gap-12 px-6 sm:grid-cols-2">
          {/* stepper */}
          <div>
            <p
              className="text-[11px] uppercase tracking-[0.25em]"
              style={{ color: C.topo }}
            >
              How it works
            </p>
            <h2
              className="mt-3 text-4xl"
              style={{ ...fontSerif, fontStyle: "italic", color: C.cream }}
            >
              Four steps, no friction.
            </h2>

            <div className="mt-8 space-y-3">
              {STEPS.map((s, i) => {
                const active = i === step;
                const done = i < step;
                return (
                  <button
                    key={s.t}
                    onClick={() => {
                      setStep(i);
                      setPlaying(false);
                    }}
                    className="flex w-full items-start gap-4 rounded-md border p-4 text-left transition"
                    style={{
                      borderColor: active ? C.topo : "rgba(255,255,255,0.12)",
                      backgroundColor: active
                        ? "rgba(126,200,160,0.08)"
                        : "transparent",
                    }}
                  >
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: done
                          ? C.topo
                          : active
                            ? C.pine
                            : "rgba(255,255,255,0.1)",
                        color: done || active ? C.forest : C.cream,
                      }}
                    >
                      {done ? "✓" : i + 1}
                    </span>
                    <span>
                      <span
                        className="block"
                        style={{ ...fontSerif, color: C.cream }}
                      >
                        {s.t}
                      </span>
                      <span
                        className="mt-1 block text-sm"
                        style={{ color: "rgba(244,239,230,0.65)" }}
                      >
                        {s.d}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-6 flex items-center gap-3">
              <ClayButton
                onClick={() => {
                  setStep(0);
                  setPlaying(true);
                }}
              >
                {playing ? "Playing…" : "Play walkthrough"}
              </ClayButton>
              <span
                className="text-xs"
                style={{ color: "rgba(244,239,230,0.55)" }}
              >
                Auto-advances every 2.4s
              </span>
            </div>
          </div>

          {/* gift card */}
          <div>
            <p
              className="text-[11px] uppercase tracking-[0.25em]"
              style={{ color: C.topo }}
            >
              Gift cards
            </p>
            <h2
              className="mt-3 text-4xl"
              style={{ ...fontSerif, fontStyle: "italic", color: C.cream }}
            >
              Say thanks, the outdoor way.
            </h2>
            <ul
              className="mt-6 space-y-2 text-sm"
              style={{ color: "rgba(244,239,230,0.78)" }}
            >
              <li>· After a paid rental, tip the lender</li>
              <li>
                · Reward a borrower who returned gear cleaner than they got it
              </li>
              <li>· Welcome a new member to your group</li>
            </ul>

            {/* card */}
            <div
              className="relative mt-8 overflow-hidden rounded-xl p-6"
              style={{
                background: `linear-gradient(135deg, ${C.pine}, ${C.forest})`,
                border: `1px solid ${C.topo}40`,
              }}
            >
              <svg
                className="absolute inset-0 h-full w-full opacity-20"
                viewBox="0 0 400 200"
                aria-hidden="true"
              >
                {Array.from({ length: 8 }).map((_, i) => (
                  <ellipse
                    key={i}
                    cx="200"
                    cy="100"
                    rx={40 + i * 22}
                    ry={14 + i * 8}
                    fill="none"
                    stroke={C.topo}
                    strokeWidth="0.6"
                  />
                ))}
              </svg>
              <div className="relative">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2" style={fontSerif}>
                    <PeakMark size={20} />
                    <span style={{ color: C.cream }}>WildPeer Gift</span>
                  </span>
                  <span
                    className="text-[10px] uppercase tracking-[0.2em]"
                    style={{ color: C.topo }}
                  >
                    PNW · Gear · Trust
                  </span>
                </div>
                <div className="mt-10 flex items-end justify-between">
                  <div>
                    <p
                      className="text-[11px] uppercase tracking-[0.18em]"
                      style={{ color: C.topo }}
                    >
                      Amount
                    </p>
                    <p
                      style={{ ...fontSerif, color: C.cream }}
                      className="text-5xl"
                    >
                      ${gift}
                    </p>
                  </div>
                  <p
                    className="text-[10px]"
                    style={{ ...fontMono, color: "rgba(244,239,230,0.55)" }}
                  >
                    NO. WP-{(gift * 137).toString().padStart(6, "0")}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {[15, 25, 50, 100].map((a) => (
                <button
                  key={a}
                  onClick={() => setGift(a)}
                  className="rounded-md border px-4 py-2 text-sm transition"
                  style={{
                    borderColor: gift === a ? C.topo : "rgba(255,255,255,0.2)",
                    backgroundColor:
                      gift === a ? "rgba(126,200,160,0.12)" : "transparent",
                    color: C.cream,
                  }}
                >
                  ${a}
                </button>
              ))}
              <ClayButton onClick={handleSignIn} className="ml-auto">
                Send gift card
              </ClayButton>
            </div>
          </div>
        </div>
      </section>

      {/* ============ REVIEWS ============ */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-6xl px-6">
          <h2
            className="mb-12 text-center text-3xl"
            style={{ ...fontSerif, fontStyle: "italic" }}
          >
            What members say
          </h2>
          <div className="grid gap-6 sm:grid-cols-3">
            {REVIEWS.map((r) => (
              <figure
                key={r.name}
                className="rounded-lg p-6"
                style={{
                  backgroundColor: "#EFE8DA",
                  border: `1px solid ${C.stone}30`,
                }}
              >
                <div
                  className="mb-3"
                  style={{ color: C.clay, letterSpacing: 2 }}
                >
                  ★★★★★
                </div>
                <blockquote
                  className="text-[15px] leading-relaxed"
                  style={{ ...fontSerif, fontStyle: "italic", color: C.forest }}
                >
                  "{r.quote}"
                </blockquote>
                <figcaption className="mt-5 flex items-center gap-3">
                  <span
                    className="flex h-9 w-9 items-center justify-center rounded-full text-[11px] font-medium text-white"
                    style={{ backgroundColor: C.pine }}
                  >
                    {r.name
                      .split(" ")
                      .map((p) => p[0])
                      .join("")}
                  </span>
                  <span className="text-sm">
                    <span className="block" style={{ color: C.forest }}>
                      {r.name}
                    </span>
                    <span className="text-xs" style={{ color: C.stone }}>
                      {r.place}
                    </span>
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ============ CTA FOOTER ============ */}
      <section style={{ backgroundColor: C.forest }} className="text-white">
        <div className="mx-auto max-w-3xl px-6 py-24 text-center">
          <h2
            className="text-5xl sm:text-6xl"
            style={{ ...fontSerif, fontStyle: "italic", color: C.cream }}
          >
            Ready to gear up?
          </h2>
          <p
            className="mx-auto mt-5 max-w-xl text-base"
            style={{ color: C.topo }}
          >
            Good things, shared with people who've earned them.
          </p>
          <div className="mt-8">
            <ClayButton
              onClick={handleSignIn}
              ariaLabel="Sign in with Google to join WildPeer"
            >
              Sign in with Google
            </ClayButton>
          </div>
        </div>
        <div
          className="border-t"
          style={{ borderColor: "rgba(244,239,230,0.1)" }}
        >
          <div
            className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-6 text-xs sm:flex-row"
            style={{ color: "rgba(244,239,230,0.6)" }}
          >
            <div className="flex items-center gap-2">
              <PeakMark size={18} />
              <span style={fontSerif}>
                <span style={{ color: C.cream, fontStyle: "italic" }}>
                  Wild
                </span>
                <span style={{ color: C.topo, fontStyle: "italic" }}>Peer</span>
              </span>
              <span className="ml-3">
                © {new Date().getFullYear()} — Pacific Northwest
              </span>
            </div>
            <div className="flex gap-6">
              <a href="#listings" className="hover:text-white">
                Browse gear
              </a>
              <a href="#community" className="hover:text-white">
                Groups
              </a>
              <a href="#how" className="hover:text-white">
                How it works
              </a>
              <a href="#" className="hover:text-white">
                Trust & safety
              </a>
            </div>
          </div>
        </div>
      </section>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
