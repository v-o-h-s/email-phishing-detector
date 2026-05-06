import React from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Download,
  Eye,
  Globe,
  Lock,
  Mail,
  Shield,
  ShieldAlert,
  Zap,
} from "lucide-react";

export default function Site(): React.JSX.Element {
  const FEATURES = [
    {
      icon: Shield,
      title: "SPF / DKIM / DMARC",
      desc: "Deep header authentication checks to detect unauthorized and spoofed senders at the protocol level.",
      accent: "#22d3ee",
      accentBg: "rgba(34,211,238,0.06)",
      accentBorder: "rgba(34,211,238,0.18)",
    },
    {
      icon: AlertTriangle,
      title: "Display Name Spoofing",
      desc: "Flags brand-impersonating display names sent from freemail or unrelated domains.",
      accent: "#f43f5e",
      accentBg: "rgba(244,63,94,0.05)",
      accentBorder: "rgba(244,63,94,0.18)",
    },
    {
      icon: Globe,
      title: "Lookalike Domains",
      desc: "Detects typosquatting, homoglyph substitutions, and confusable domain variations.",
      accent: "#f59e0b",
      accentBg: "rgba(245,158,11,0.05)",
      accentBorder: "rgba(245,158,11,0.18)",
    },
    {
      icon: Eye,
      title: "URL Threat Scan",
      desc: "Checks every link in the email against Google Safe Browsing in real time.",
      accent: "#60a5fa",
      accentBg: "rgba(96,165,250,0.05)",
      accentBorder: "rgba(96,165,250,0.18)",
    },
    {
      icon: Zap,
      title: "AI Body Analysis",
      desc: "Optional Gemini-powered semantic analysis to catch social engineering language patterns.",
      accent: "#a78bfa",
      accentBg: "rgba(167,139,250,0.05)",
      accentBorder: "rgba(167,139,250,0.18)",
    },
    {
      icon: Lock,
      title: "Privacy Signals",
      desc: "Tracking pixel detection, QR code warnings, and received-chain anomaly scanning.",
      accent: "#34d399",
      accentBg: "rgba(52,211,153,0.05)",
      accentBorder: "rgba(52,211,153,0.18)",
    },
    {
      icon: Shield,
      title: "Reply-To Mismatch",
      desc: "Compares From vs Reply-To domains to catch redirection attempts.",
      accent: "#22d3ee",
      accentBg: "rgba(34,211,238,0.06)",
      accentBorder: "rgba(34,211,238,0.18)",
    },
    {
      icon: Globe,
      title: "Domain Age (RDAP)",
      desc: "Checks domain registration age to flag newly created phishing domains.",
      accent: "#60a5fa",
      accentBg: "rgba(96,165,250,0.05)",
      accentBorder: "rgba(96,165,250,0.18)",
    },
    {
      icon: Activity,
      title: "Timezone Mismatch",
      desc: "Flags unusual Date header timezone offsets for sender ccTLD context.",
      accent: "#f59e0b",
      accentBg: "rgba(245,158,11,0.05)",
      accentBorder: "rgba(245,158,11,0.18)",
    },
    {
      icon: Mail,
      title: "Received Chain Analysis",
      desc: "Inspects hop chain anomalies, missing sender domain, and local routing hints.",
      accent: "#a78bfa",
      accentBg: "rgba(167,139,250,0.05)",
      accentBorder: "rgba(167,139,250,0.18)",
    },
    {
      icon: Eye,
      title: "Tracking Pixel Detector",
      desc: "Detects 1x1 and external image beacons used for open tracking.",
      accent: "#34d399",
      accentBg: "rgba(52,211,153,0.05)",
      accentBorder: "rgba(52,211,153,0.18)",
    },
    {
      icon: AlertTriangle,
      title: "QR Code Warning",
      desc: "Warns users when email images may contain QR-based phishing lures.",
      accent: "#f43f5e",
      accentBg: "rgba(244,63,94,0.05)",
      accentBorder: "rgba(244,63,94,0.18)",
    },
  ];

  const STATS = [
    { value: "11", label: "Detection Layers" },
    { value: "0ms", label: "Added Page Load" },
    { value: "100%", label: "Local Processing" },
    { value: "0", label: "Data Collected" },
  ];

  const STEPS = [
    { n: "01", title: "Open Gmail", desc: "Extension activates the moment you open a message." },
    { n: "02", title: "Extract Signals", desc: "Headers, links, images, and metadata are captured silently." },
    { n: "03", title: "Run Layers", desc: "11 analysis layers execute in parallel and produce weighted scores." },
    { n: "04", title: "See Results", desc: "Threat score, layer breakdown, and suggested actions appear instantly." },
  ];

  return (
    <div className="min-h-screen bg-[#020814] text-slate-200 overflow-x-hidden">
      <div className="site-grid-bg fixed inset-0 pointer-events-none z-0" />
      <div
        className="fixed pointer-events-none z-0"
        style={{
          top: "-15vh",
          left: "-10vw",
          width: "70vw",
          height: "70vh",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(37,99,235,0.18) 0%, transparent 65%)",
          filter: "blur(40px)",
          animation: "orb-a 12s ease-in-out infinite",
        }}
      />
      <div
        className="fixed pointer-events-none z-0"
        style={{
          bottom: "-10vh",
          right: "-8vw",
          width: "55vw",
          height: "55vh",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(34,211,238,0.1) 0%, transparent 65%)",
          filter: "blur(40px)",
          animation: "orb-b 14s ease-in-out infinite",
        }}
      />
      <div className="scan-line" />

      <header
        className="sticky top-0 z-30 border-b border-white/[0.06]"
        style={{ background: "rgba(2,8,20,0.85)", backdropFilter: "blur(16px)" }}
      >
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg border border-blue-400/30 flex items-center justify-center"
              style={{ background: "rgba(59,130,246,0.1)" }}
            >
              <Shield className="w-4 h-4 text-blue-400" />
            </div>
            <div className="leading-none">
              <div className="text-sm font-bold tracking-[0.12em] text-slate-100">E-SENTINEL</div>
              <div className="text-[9px] text-blue-400/70 tracking-[0.12em] mono mt-0.5">
                AI PHISHING DETECTOR
              </div>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6">
            {["Features", "How It Works", "Install"].map((l) => (
              <a
                key={l}
                href={`#${l.toLowerCase().replace(/ /g, "-")}`}
                className="text-[12px] text-slate-400 hover:text-slate-100 tracking-wide transition-colors"
              >
                {l}
              </a>
            ))}
          </nav>

          <a
            href="#install"
            className="btn-glow flex items-center gap-2 px-4 py-2 rounded-lg border border-blue-400/40 text-[11px] font-medium tracking-[0.08em] text-blue-200"
            style={{ background: "rgba(59,130,246,0.12)" }}
          >
            <Download className="w-3.5 h-3.5" />
            Get Extension
          </a>
        </div>
      </header>

      <section className="relative z-10 max-w-6xl mx-auto px-6 pt-24 pb-20">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <div
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-400/25 mono text-[10px] text-blue-300 tracking-[0.1em] mb-8 fade-up badge-pulse"
              style={{ background: "rgba(59,130,246,0.08)" }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              Chrome Extension · Gmail · MV3
            </div>

            <h1 className="text-[52px] font-extrabold leading-[1.03] tracking-tight fade-up-1">
              Catch Phishing
              <span className="block shimmer-text">Before It Catches</span>
              <span className="block text-slate-100">You.</span>
            </h1>

            <p className="mt-6 text-[15px] text-slate-400 leading-7 max-w-md fade-up-2">
              E-Sentinel runs 11 parallel threat layers on every Gmail message - header auth, domain
              heuristics, AI body analysis, and more - giving you a clear risk score before you click
              anything.
            </p>

            <div className="mt-10 flex flex-wrap gap-3 fade-up-3">
              <a
                href="#install"
                className="btn-glow flex items-center gap-2 px-6 py-3 rounded-xl text-[13px] font-semibold text-white"
                style={{ background: "linear-gradient(135deg, #2563eb, #1d4ed8)", boxShadow: "0 4px 20px rgba(37,99,235,0.35)" }}
              >
                <Download className="w-4 h-4" />
                Install Free
              </a>
              <a
                href="#features"
                className="flex items-center gap-2 px-6 py-3 rounded-xl text-[13px] font-medium text-slate-300 border border-white/10 hover:border-white/20 transition-colors"
                style={{ background: "rgba(255,255,255,0.03)" }}
              >
                <Activity className="w-4 h-4" />
                See Features
              </a>
            </div>
          </div>

          <div className="flex justify-center lg:justify-end fade-up-2">
            <div
              className="float-anim relative w-[300px] rounded-2xl border border-blue-400/20 overflow-hidden"
              style={{
                background: "rgba(10,18,40,0.9)",
                backdropFilter: "blur(20px)",
                boxShadow: "0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(59,130,246,0.08)",
              }}
            >
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="radar-ring absolute"
                    style={{ width: 80, height: 80, animationDelay: `${i * 1.1}s` }}
                  />
                ))}
              </div>

              <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.07]">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" style={{ boxShadow: "0 0 5px rgba(244,63,94,0.9)" }} />
                  <span className="text-[10px] font-bold tracking-[0.12em] text-slate-200">E-SENTINEL</span>
                </div>
                <div className="flex gap-0.5">
                  {["#f59e0b", "#22c55e", "#ef4444"].map((c, i) => (
                    <span key={i} className="w-2 h-2 rounded-full" style={{ background: c, opacity: 0.7 }} />
                  ))}
                </div>
              </div>

              <div className="m-3 rounded-xl border border-rose-500/25 p-3" style={{ background: "rgba(244,63,94,0.06)" }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-rose-400">
                    <ShieldAlert className="w-4 h-4" />
                    <span className="text-[11px] font-bold tracking-[0.1em]">THREAT</span>
                  </div>
                  <span className="text-[22px] font-extrabold text-rose-300 leading-none">74</span>
                </div>
                <div className="mt-3 h-[2px] rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
                  <div
                    className="h-full w-[74%] rounded-full"
                    style={{ background: "linear-gradient(90deg, #f59e0b, #f43f5e)", boxShadow: "0 0 6px rgba(244,63,94,0.6)" }}
                  />
                </div>
              </div>

              <div className="px-3 pb-3 space-y-1.5">
                {[
                  ["display name spoofing", 45, "#f43f5e"],
                  ["url-scan", 20, "#f59e0b"],
                  ["body-analysis", 18, "#f59e0b"],
                  ["reply-to mismatch", 9, "#22d3ee"],
                ].map(([name, val, color]) => (
                  <div
                    key={String(name)}
                    className="rounded-lg border border-white/[0.06] px-3 py-2"
                    style={{ background: "rgba(255,255,255,0.02)" }}
                  >
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-[8px] mono uppercase tracking-[0.08em] text-slate-400">{String(name)}</span>
                      <span className="text-[9px] font-bold" style={{ color: String(color) }}>
                        {val}
                      </span>
                    </div>
                    <div className="h-px" style={{ background: `linear-gradient(90deg, ${String(color)}55 ${Number(val)}%, rgba(255,255,255,0.04) 0%)` }} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="relative z-10 border-y border-white/[0.06]" style={{ background: "rgba(10,18,40,0.6)", backdropFilter: "blur(8px)" }}>
        <div className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-6">
          {STATS.map(({ value, label }, i) => (
            <div key={label} className="text-center stat-num" style={{ animationDelay: `${i * 0.08}s` }}>
              <div className="text-3xl font-extrabold text-blue-400 tracking-tight">{value}</div>
              <div className="text-[11px] text-slate-500 mt-1 uppercase tracking-[0.1em]">{label}</div>
            </div>
          ))}
        </div>
      </div>

      <section id="features" className="relative z-10 max-w-6xl mx-auto px-6 py-24">
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 mono text-[11px] text-blue-300 tracking-[0.18em] mb-4">
            <Activity className="w-4 h-4" />
            DETECTION ENGINE
          </div>
          <h2 className="text-4xl font-bold leading-tight">
            11 Layers of
            <br />
            <span className="shimmer-text">Deep Analysis</span>
          </h2>
          <p className="mt-4 text-[15px] text-slate-400 max-w-xl leading-7">
            Combining protocol validation, domain intelligence, behavioral heuristics, and optional AI
            classification into a single threat score.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <FeatureCard key={f.title} {...f} />
          ))}
        </div>
      </section>

      <section id="how-it-works" className="relative z-10 border-t border-white/[0.06] py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-12">
            <div className="inline-flex items-center gap-2 mono text-[11px] text-cyan-300 tracking-[0.18em] mb-4">
              <Zap className="w-4 h-4" />
              WORKFLOW
            </div>
            <h2 className="text-4xl font-bold">Works Automatically</h2>
            <p className="mt-4 text-[15px] text-slate-400 max-w-lg leading-7">
              No setup, no manual scanning. Open Gmail, open a message, and E-Sentinel handles the rest in
              milliseconds.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-4">
            {STEPS.map((step, i) => (
              <div
                key={step.n}
                className="relative rounded-2xl border border-white/[0.07] p-5 feat-card"
                style={{ background: "rgba(10,18,40,0.6)" }}
              >
                <div className="mono text-[11px] text-blue-400 tracking-[0.12em] font-semibold mb-4">
                  {step.n}
                </div>
                <div className="text-[15px] font-semibold text-slate-100 mb-2">{step.title}</div>
                <p className="text-[12px] text-slate-400 leading-6">{step.desc}</p>
                {i < STEPS.length - 1 && <div className="hidden md:block step-line" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="install" className="relative z-10 border-t border-white/[0.06] py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-start">
            <div>
              <div className="inline-flex items-center gap-2 mono text-[11px] text-blue-300 tracking-[0.18em] mb-4">
                <Download className="w-4 h-4" />
                INSTALLATION
              </div>
              <h2 className="text-4xl font-bold mb-2">Up in 2 Minutes</h2>
              <p className="text-[14px] text-slate-400 mb-8 leading-7">
                Load the unpacked extension directly - no store submission required.
              </p>
              <ol className="space-y-3">
                {[
                  ["Build", "Run bun run build to generate the dist/ folder."],
                  ["Extensions page", "Navigate to chrome://extensions in Chrome."],
                  ["Developer mode", "Toggle Developer mode on (top-right)."],
                  ["Load unpacked", "Click Load unpacked and select the dist/ folder."],
                ].map(([title, desc], i) => (
                  <li
                    key={String(title)}
                    className="flex gap-4 rounded-xl border border-white/[0.07] p-4 feat-card"
                    style={{ background: "rgba(10,18,40,0.5)" }}
                  >
                    <span className="mono text-[11px] text-blue-400 font-bold flex-shrink-0 mt-0.5">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <div className="text-[13px] font-semibold text-slate-200 mb-0.5">{String(title)}</div>
                      <div className="text-[12px] text-slate-400 leading-5">{String(desc)}</div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <div
              className="rounded-2xl border border-blue-400/20 p-8"
              style={{
                background: "rgba(10,18,40,0.7)",
                backdropFilter: "blur(12px)",
                boxShadow: "0 0 60px rgba(37,99,235,0.08)",
              }}
            >
              <div
                className="w-14 h-14 rounded-2xl border border-blue-400/25 flex items-center justify-center mb-6"
                style={{ background: "rgba(37,99,235,0.12)" }}
              >
                <Shield className="w-7 h-7 text-blue-400" />
              </div>

              <h3 className="text-2xl font-bold text-slate-100 mb-2">E-Sentinel</h3>
              <p className="text-[13px] text-slate-400 leading-7 mb-6">
                Privacy-first Gmail threat analyzer. Core analysis runs entirely locally. API integrations are
                optional and fully user-controlled.
              </p>

              <div className="space-y-2 mb-8">
                {[
                  [CheckCircle2, "No data leaves your browser"],
                  [CheckCircle2, "11 analysis layers included free"],
                  [CheckCircle2, "Works offline for core checks"],
                  [Mail, "Gmail-only, MV3 compliant"],
                ].map(([Icon, text]) => (
                  <div key={String(text)} className="flex items-center gap-2.5 text-[13px] text-slate-300">
                    {React.createElement(Icon as React.ComponentType<{ className?: string }>, {
                      className: "w-4 h-4 text-cyan-400 flex-shrink-0",
                    })}
                    {String(text)}
                  </div>
                ))}
              </div>

              <a
                href="extension.zip"
                className="btn-glow flex items-center justify-center gap-2.5 w-full py-3.5 rounded-xl text-[13px] font-semibold text-white"
                style={{ background: "linear-gradient(135deg, #2563eb, #1d4ed8)", boxShadow: "0 4px 20px rgba(37,99,235,0.3)" }}
              >
                <Download className="w-4 h-4" />
                Download extension.zip
              </a>
            </div>
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/[0.06] py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="w-6 h-6 rounded border border-blue-400/25 flex items-center justify-center"
              style={{ background: "rgba(59,130,246,0.1)" }}
            >
              <Shield className="w-3 h-3 text-blue-400" />
            </div>
            <span className="mono text-[11px] text-slate-500 tracking-[0.1em]">E-SENTINEL</span>
          </div>
          <div className="flex items-center gap-6">
            {["Gmail · MV3", "React + TypeScript", "Privacy First"].map((t) => (
              <span key={t} className="text-[11px] text-slate-600 tracking-wide">
                {t}
              </span>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  desc,
  accent,
  accentBg,
  accentBorder,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  title: string;
  desc: string;
  accent: string;
  accentBg: string;
  accentBorder: string;
}): React.JSX.Element {
  return (
    <article className="feat-card rounded-2xl border p-5" style={{ background: accentBg, borderColor: accentBorder }}>
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center mb-4 border"
        style={{ background: `${accent}18`, borderColor: `${accent}30` }}
      >
        <Icon className="w-4 h-4" style={{ color: accent }} />
      </div>
      <h3 className="text-[14px] font-semibold text-slate-100 mb-2">{title}</h3>
      <p className="text-[12px] text-slate-400 leading-6">{desc}</p>
    </article>
  );
}
