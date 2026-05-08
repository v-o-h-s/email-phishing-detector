import React, { useEffect, useState } from "react";
import {
  Activity,
  ChevronRight,
  Clock,
  Info,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Wifi,
} from "lucide-react";
import {
  AnalysisLayers,
  type AnalysisSnapshot,
  type ExtensionMessage,
  type ExtensionSettings,
} from "../shared/types";
import { DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY, mergeSettings } from "../shared/settings";

const STATUS_CONFIG = {
  idle: {
    icon: Info,
    color: "text-slate-400",
    border: "border-white/[0.06]",
    bg: "rgba(255,255,255,0.01)",
    glow: "",
    label: "STANDBY",
    desc: "Open an email in Gmail to begin analysis.",
    dot: "#64748b",
    pulse: false,
  },
  safe: {
    icon: ShieldCheck,
    color: "text-cyan-400",
    border: "border-cyan-500/20",
    bg: "rgba(34,211,238,0.04)",
    glow: "0 0 20px rgba(34,211,238,0.15)",
    label: "SECURE",
    desc: "All authentication checks passed.",
    dot: "#22d3ee",
    pulse: true,
  },
  warning: {
    icon: ShieldAlert,
    color: "text-amber-400",
    border: "border-amber-500/20",
    bg: "rgba(245,158,11,0.04)",
    glow: "0 0 20px rgba(245,158,11,0.12)",
    label: "SUSPICIOUS",
    desc: "Anomalies detected across signal layers.",
    dot: "#f59e0b",
    pulse: true,
  },
  danger: {
    icon: ShieldX,
    color: "text-rose-400",
    border: "border-rose-500/25",
    bg: "rgba(239,68,68,0.05)",
    glow: "0 0 20px rgba(239,68,68,0.15)",
    label: "THREAT",
    desc: "High-confidence phishing indicators found.",
    dot: "#f43f5e",
    pulse: true,
  },
  checking: {
    icon: Clock,
    color: "text-blue-400",
    border: "border-blue-500/20",
    bg: "rgba(59,130,246,0.04)",
    glow: "",
    label: "ANALYZING",
    desc: "Extracting and scoring signal layers…",
    dot: "#60a5fa",
    pulse: false,
  },
};

type TabType = "diagnostics" | "settings";

export default function Popup(): React.JSX.Element {
  const [analysis, setAnalysis] = useState<AnalysisSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<ExtensionSettings>(DEFAULT_SETTINGS);
  const [tab, setTab] = useState<TabType>("diagnostics");

  useEffect(() => {
    chrome.storage.local
      .get(SETTINGS_STORAGE_KEY)
      .then((data) => {
        const stored = mergeSettings(data[SETTINGS_STORAGE_KEY] as Partial<ExtensionSettings> | undefined);
        setSettings(stored);
      })
      .catch(() => {
        setSettings(DEFAULT_SETTINGS);
      });

    chrome.runtime.sendMessage({ type: "GET_ANALYSIS" } satisfies ExtensionMessage, (response: ExtensionMessage) => {
      if (response?.type === "ANALYSIS_RESULT") setAnalysis(response.payload);
      setLoading(false);
    });
    chrome.runtime.sendMessage({ type: "GET_SETTINGS" } satisfies ExtensionMessage, (response: ExtensionMessage) => {
      if (response?.type === "SETTINGS_RESULT") setSettings(response.payload);
    });
  }, []);

  function updateSettings(patch: Partial<ExtensionSettings>): void {
    chrome.runtime.sendMessage(
      { type: "UPDATE_SETTINGS", payload: patch } satisfies ExtensionMessage,
      (response: ExtensionMessage) => {
        if (response?.type === "SETTINGS_RESULT") setSettings(response.payload);
      },
    );
  }

  if (loading) {
    return (
      <div className="w-[360px] h-[600px] bg-[#020814] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-8 h-8">
            <div className="absolute inset-0 rounded-full border border-blue-500/20" />
            <div className="absolute inset-0 rounded-full border border-transparent border-t-blue-500 spin" />
          </div>
          <span className="text-[9px] text-slate-600 uppercase tracking-[0.2em]">initializing sentinel</span>
        </div>
      </div>
    );
  }

  const status = analysis?.status ?? "idle";
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  const score = analysis?.score ?? 0;
  const scoreGradient =
    score > 50 ? "from-amber-500 to-rose-500" :
    score > 20 ? "from-yellow-400 to-amber-500" :
    "from-cyan-400 to-blue-500";

  const scoreGlowColor =
    score > 50 ? "rgba(239,68,68,0.55)" :
    score > 20 ? "rgba(245,158,11,0.55)" :
    "rgba(34,211,238,0.55)";
  const isBodyLayerEnabled = settings.layerEnabled[AnalysisLayers.bodyAnalysis] ?? true;
  const showGeminiSection = isBodyLayerEnabled;
  // Gemini toggle controls both API-key forms:
  // - OFF: hide both key forms
  // - ON: show both Safe Browsing + Gemini key forms
  const showApiKeys = isBodyLayerEnabled && settings.geminiConsent;  const layerEntries = analysis
    ? (Object.entries(analysis.scores) as Array<[AnalysisLayers, number | undefined]>)
        .filter(([, v]) => v != null)
        .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
    : [];

  return (
    <div className="relative w-[360px] h-[600px] bg-[#020814] text-slate-200 flex flex-col select-none overflow-hidden">

      {/* Blueprint grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(59,130,246,0.045) 1px, transparent 1px)," +
            "linear-gradient(90deg, rgba(59,130,246,0.045) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />
      {/* Ambient glow */}
      <div className="absolute -top-32 -left-16 w-72 h-72 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(59,130,246,0.18) 0%, transparent 70%)", filter: "blur(24px)" }} />
      <div className="absolute -bottom-20 -right-20 w-56 h-56 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(34,211,238,0.12) 0%, transparent 70%)", filter: "blur(24px)" }} />

      {/* ── HEADER ─────────────────────────────────────────────── */}
      <header
        className="relative z-10 flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06] flex-shrink-0"
        style={{ background: "rgba(2,8,20,0.85)", backdropFilter: "blur(12px)" }}
      >
        <div className="flex items-center gap-2.5">
          {/* Status dot */}
          <div className="relative flex items-center justify-center w-3 h-3 flex-shrink-0">
            <span className="w-2 h-2 rounded-full block" style={{ background: config.dot }} />
            {config.pulse && (
              <span
                className="absolute inset-0 w-2 h-2 m-auto rounded-full pulse-ring"
                style={{ background: config.dot, opacity: 0.5 }}
              />
            )}
          </div>
          <div className="leading-none">
            <div className="text-[11px] font-bold tracking-[0.14em] text-slate-100">E-SENTINEL</div>
            <div className="text-[8px] text-blue-400/70 tracking-[0.1em] mt-0.5">GMAIL THREAT ANALYZER</div>
          </div>
        </div>

        {/* Pill tabs */}
        <div className="flex items-center p-0.5 gap-0.5 rounded-md border border-white/[0.07]"
          style={{ background: "rgba(255,255,255,0.04)" }}>
          <TabPill active={tab === "diagnostics"} onClick={() => setTab("diagnostics")}
            icon={<Activity className="w-3 h-3" />} label="DIAG" />
          <TabPill active={tab === "settings"} onClick={() => setTab("settings")}
            icon={<Settings2 className="w-3 h-3" />} label="CFG" />
        </div>
      </header>

      {/* ── STATUS CARD ────────────────────────────────────────── */}
      <section
        className={`relative z-10 mx-3 mt-2.5 rounded-xl border flex-shrink-0 overflow-hidden ${config.border}`}
        style={{ background: config.bg, boxShadow: config.glow }}
      >
        <div className="flex items-center gap-3 px-3 pt-3 pb-2">
          <div className={`p-2 rounded-lg border border-white/[0.08] ${config.color}`}
            style={{ background: "rgba(255,255,255,0.04)" }}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className={`text-[10px] font-bold tracking-[0.14em] ${config.color}`}>{config.label}</div>
            <div className="text-[9px] text-slate-500 mt-0.5 truncate">{config.desc}</div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-[22px] font-bold leading-none text-slate-100 tabular-nums">{score}</div>
            <div className="text-[8px] text-slate-600 mt-0.5">/100</div>
          </div>
        </div>

        {/* Score bar */}
        <div className="px-3 pb-3">
          <div className="h-[2px] w-full rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
            <div
              className={`h-full rounded-full bg-gradient-to-r score-fill ${scoreGradient}`}
              style={{ width: `${Math.min(100, Math.max(0, score))}%`, boxShadow: `0 0 6px ${scoreGlowColor}` }}
            />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-[8px] text-slate-700 uppercase tracking-[0.08em]">
              {layerEntries.length} layers
            </span>
            <span className="text-[8px] text-slate-700 tabular-nums">
              {analysis?.detectedAt
                ? new Date(analysis.detectedAt).toLocaleTimeString([], { hour12: false })
                : "—"}
            </span>
          </div>
        </div>
      </section>

      {/* ── MAIN (ONLY SCROLLABLE ZONE) ────────────────────────── */}
      <main className="relative z-10 flex-1 overflow-y-auto px-3 py-2.5 min-h-0">
        {tab === "diagnostics" ? (
          !analysis ? (
            <div className="h-full flex items-center justify-center rounded-xl border border-dashed border-white/[0.06]">
              <div className="flex flex-col items-center gap-2 text-slate-600">
                <Wifi className="w-4 h-4" />
                <span className="text-[9px] uppercase tracking-[0.1em]">Open a Gmail email to analyze</span>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              {layerEntries.map(([layer, layerScore]) => (
                <LayerCard
                  key={layer}
                  layer={layer}
                  layerScore={layerScore ?? 0}
                  reasons={analysis.reasons[layer] ?? []}
                />
              ))}
            </div>
          )
        ) : (
          <div className="space-y-1.5">
            <ToggleRow label="Extension Enabled" value={settings.extensionEnabled}
              onChange={(v) => updateSettings({ extensionEnabled: v })} />
            {showGeminiSection && (
              <>
                <ToggleRow label="Gemini Body Analysis" value={settings.geminiConsent}
                  onChange={(v) => updateSettings({ geminiConsent: v })} />
                <p className="text-[9px] text-slate-500 leading-5 px-3 py-2.5 rounded-lg border border-blue-500/10"
                  style={{ background: "rgba(59,130,246,0.04)" }}>
                  Enabling this shows both Google URL Scan and Gemini API key forms for advanced link and body-text analysis.
                </p>
              </>
            )}
            {showApiKeys && (
              <ApiKeyRow
                label="Safe Browsing Key"
                description="Checks extracted email links against Google Safe Browsing threat feeds."
                value={settings.apiKeys.safeBrowsing}
                onChange={(v) => updateSettings({ apiKeys: { ...settings.apiKeys, safeBrowsing: v } })}
              />
            )}
            {showApiKeys && (
              <ApiKeyRow
                label="Gemini Key"
                description="Enables AI-based email body phishing tactic analysis."
                value={settings.apiKeys.gemini}
                onChange={(v) => updateSettings({ apiKeys: { ...settings.apiKeys, gemini: v } })}
              />
            )}
            <div className="pt-2 pb-0.5 px-1 text-[8px] text-slate-600 uppercase tracking-[0.14em]">
              Layer Toggles
            </div>
            {(Object.values(AnalysisLayers) as AnalysisLayers[]).map((layer) => (
              <ToggleRow key={layer} label={layer}
                value={settings.layerEnabled[layer] ?? true}
                onChange={(v) => updateSettings({ layerEnabled: { [layer]: v } })} />
            ))}
          </div>
        )}
      </main>

      {/* ── FOOTER ─────────────────────────────────────────────── */}
      <footer
        className="relative z-10 flex items-center justify-between px-4 py-2 border-t border-white/[0.06] flex-shrink-0"
        style={{ background: "rgba(2,8,20,0.85)" }}
      >
        <span className="flex items-center gap-1.5 text-[8px] text-slate-600 uppercase tracking-[0.1em]">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" style={{ boxShadow: "0 0 4px rgba(34,211,238,0.9)" }} />
          sys.active
        </span>
        <span className="text-[8px] text-slate-700 uppercase tracking-[0.08em]">ch:gmail</span>
      </footer>
    </div>
  );
}

function TabPill({
  active, onClick, icon, label,
}: { active: boolean; onClick: () => void; icon: React.JSX.Element; label: string }): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1 px-2.5 py-1 rounded text-[9px] font-semibold tracking-[0.1em] transition-all duration-150 ${
        active
          ? "bg-blue-500 text-white shadow-[0_0_10px_rgba(59,130,246,0.5)]"
          : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function ToggleRow({
  label, value, onChange,
}: { label: string; value: boolean; onChange: (next: boolean) => void }): React.JSX.Element {
  return (
    <div
      className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-white/[0.06] cursor-pointer"
      style={{ background: "rgba(10,18,40,0.5)" }}
      onClick={() => onChange(!value)}
    >
      <span className="text-[9px] uppercase tracking-[0.1em] text-slate-300">{label}</span>
      <div
        className="toggle-track"
        data-on={String(value)}
        onClick={(e) => { e.stopPropagation(); onChange(!value); }}
      >
        <span className="toggle-knob" />
      </div>
    </div>
  );
}

function LayerCard({
  layer, layerScore, reasons,
}: { layer: string; layerScore: number; reasons: string[] }): React.JSX.Element {
  const high = layerScore > 40;
  const mid  = layerScore > 20;
  const scoreColor = high ? "text-rose-400" : mid ? "text-amber-400" : "text-cyan-400";
  const barColor   = high ? "#f43f5e"       : mid ? "#f59e0b"       : "#22d3ee";
  const fallbackReason =
    layerScore === 0
      ? "Test passed: no suspicious signals detected."
      : "Layer triggered, but no details were returned.";

  return (
    <details
      className="group rounded-xl border border-white/[0.06] overflow-hidden"
      style={{ background: "rgba(10,18,40,0.55)" }}
    >
      <summary className="flex items-center gap-2 px-3 py-2.5 cursor-pointer">
        <ChevronRight className="w-3 h-3 text-slate-600 chevron flex-shrink-0" />
        <span className="text-[9px] uppercase tracking-[0.1em] text-slate-300 flex-1 truncate">{layer}</span>
        <span className={`text-[10px] font-bold tabular-nums flex-shrink-0 ${scoreColor}`}>{layerScore}</span>
      </summary>
      <div className="px-3 pb-3">
        <div className="h-px w-full mb-2.5" style={{ background: `linear-gradient(90deg, ${barColor}55 ${Math.min(100, layerScore)}%, rgba(255,255,255,0.05) 0%)` }} />
        <ul className="space-y-1">
          {reasons.length
            ? reasons.map((r, i) => (
              <li key={`${layer}-${i}`} className="flex items-start gap-1.5 text-[9px] text-slate-400">
                <span className="text-blue-500 flex-shrink-0">›</span>
                {r}
              </li>
            ))
            : (
              <li className="flex items-start gap-1.5 text-[9px] text-slate-500">
                <span className="text-blue-500 flex-shrink-0">›</span>
                {fallbackReason}
              </li>
            )}
        </ul>
      </div>
    </details>
  );
}

function ApiKeyRow({
  label, description, value, onChange,
}: { label: string; description: string; value: string; onChange: (next: string) => void }): React.JSX.Element {
  return (
    <div className="rounded-xl border border-white/[0.06] overflow-hidden" style={{ background: "rgba(10,18,40,0.5)" }}>
      <label className="block px-3 pt-2.5 pb-2.5">
        <span className="text-[8px] uppercase tracking-[0.14em] text-slate-600 block mb-1.5">{label}</span>
        <span className="text-[8px] text-slate-500 block mb-2">{description}</span>
        <input
          type="password"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full text-[10px] text-slate-300 placeholder-slate-700 font-mono"
          placeholder="stored locally in chrome"
        />
      </label>
    </div>
  );
}
