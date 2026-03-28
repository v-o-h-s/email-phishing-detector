import React, { useEffect, useState } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Info,
  Clock,
  Terminal,
  ChevronRight,
} from "lucide-react";
import type { AnalysisLayers, AnalysisSnapshot, ExtensionMessage } from "../shared/types";

const STATUS_CONFIG = {
  idle: {
    color: "text-zinc-500",
    border: "border-zinc-800",
    bg: "bg-zinc-950",
    icon: Info,
    label: "STANDBY",
    desc: "AWAITING TARGET SIGNAL",
  },
  safe: {
    color: "text-green-500",
    border: "border-green-500/30",
    bg: "bg-green-500/5",
    icon: ShieldCheck,
    label: "SECURE",
    desc: "AUTH PROTOCOLS VERIFIED",
  },
  warning: {
    color: "text-amber-500",
    border: "border-amber-500/30",
    bg: "bg-amber-500/5",
    icon: ShieldAlert,
    label: "WARNING",
    desc: "ANOMALOUS MARKERS DETECTED",
  },
  danger: {
    color: "text-red-500",
    border: "border-red-500/30",
    bg: "bg-red-500/5",
    icon: ShieldX,
    label: "SPOOFED",
    desc: "IMPERSONATION IMMINENT",
  },
  checking: {
    color: "text-cyan-500",
    border: "border-cyan-500/30",
    bg: "bg-cyan-500/5",
    icon: Clock,
    label: "ANALYZING",
    desc: "EXTRACTING HEADERS...",
  },
};

export default function Popup() {
  const [analysis, setAnalysis] = useState<AnalysisSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const msg: ExtensionMessage = { type: "GET_ANALYSIS" };
    chrome.runtime.sendMessage(
      msg,
      (response: ExtensionMessage) => {
        if (response?.type === "ANALYSIS_RESULT") {
          setAnalysis(response.payload);
        }
        setLoading(false);
      },
    );
  }, []);

  if (loading) {
    return (
      <div className="p-4 flex flex-col items-center justify-center min-h-[420px] bg-black font-mono">
        <Terminal className="w-6 h-6 text-zinc-500 mb-4 animate-pulse" />
        <p className="text-[10px] text-zinc-500 uppercase tracking-widest animate-pulse">
          INITIALIZING_SYSTEM...
        </p>
      </div>
    );
  }

  const status = analysis?.status ?? "idle";
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  const layerEntries = analysis
    ? (Object.entries(analysis.scores) as Array<[AnalysisLayers, number | undefined]>)
        .filter(([, v]) => v != null)
        .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
    : [];

  return (
    <div className="p-4 flex flex-col min-h-[420px] bg-black font-mono select-none">
      <div className="flex items-center justify-between mb-4 border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-2 text-zinc-300">
          <Terminal className="w-4 h-4" />
          <h1 className="text-xs font-bold tracking-widest uppercase">E-Sentinel</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-zinc-600 font-semibold tracking-wider">MV3</span>
          <span className="text-[10px] text-zinc-600 font-semibold tracking-wider">v1.0.0</span>
        </div>
      </div>

      <div className={`p-4 mb-5 border ${config.border} ${config.bg} flex flex-col items-start relative`}>
        <div className={`absolute top-0 left-0 w-2 h-2 border-t border-l ${config.border}`} />
        <div className={`absolute top-0 right-0 w-2 h-2 border-t border-r ${config.border}`} />
        <div className={`absolute bottom-0 left-0 w-2 h-2 border-b border-l ${config.border}`} />
        <div className={`absolute bottom-0 right-0 w-2 h-2 border-b border-r ${config.border}`} />

        <div className="flex items-center gap-3 mb-2 w-full">
          <Icon className={`w-5 h-5 ${config.color}`} />
          <h2 className={`text-sm font-bold tracking-widest uppercase ${config.color}`}>
            {config.label}
          </h2>
          <span className={`ml-auto text-[10px] ${config.color} animate-pulse`}>_</span>
        </div>

        <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-semibold">{config.desc}</p>

        {analysis && (
          <div className="mt-5 flex flex-col w-full">
            <div className="flex items-center justify-between border-t border-dashed border-zinc-800 pt-3">
              <span className="text-[10px] text-zinc-600 uppercase font-bold tracking-widest">Threat Level</span>
              <div className="flex items-baseline gap-1">
                <span className={`text-2xl font-bold ${config.color}`}>
                  {analysis.score}
                </span>
                <span className="text-[10px] text-zinc-600 font-bold">/ 100</span>
              </div>
            </div>
            <div className="flex items-center justify-between mt-2 text-[10px] text-zinc-600 uppercase tracking-widest font-bold">
              <span>Layers: {layerEntries.length}</span>
              <span>
                {analysis.detectedAt ? `Last: ${new Date(analysis.detectedAt).toLocaleTimeString([], { hour12: false })}` : ""}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 flex-grow">
        <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-2 border-b border-zinc-800 pb-1.5 font-bold">
          <span>{">"} DIAGNOSTICS</span>
        </div>

        {!analysis ? (
          <div className="flex-grow flex items-center justify-center border border-zinc-800 border-dashed bg-zinc-950/50 p-4">
            <span className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold">
              OPEN AN EMAIL IN GMAIL TO RUN CHECKS
            </span>
          </div>
        ) : (
          <div className="flex-grow flex flex-col gap-2">
            {layerEntries.length === 0 ? (
              <div className="flex-grow flex items-center justify-center border border-zinc-800 border-dashed bg-zinc-950/50 p-4">
                <span className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold">
                  NO LAYERS REPORTED
                </span>
              </div>
            ) : (
              layerEntries.map(([layer, layerScore]) => {
                const reasons = analysis.reasons[layer] ?? [];
                return (
                  <details
                    key={layer}
                    className="border border-zinc-800 bg-zinc-950/40 p-3"
                  >
                    <summary className="list-none cursor-pointer flex items-center gap-2">
                      <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
                      <span className="text-[10px] text-zinc-200 uppercase tracking-widest font-bold">
                        {layer}
                      </span>
                      <span className="ml-auto text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
                        score {layerScore ?? 0}
                      </span>
                    </summary>
                    <ul className="mt-2 pl-4 space-y-1">
                      {reasons.length ? (
                        reasons.map((r, i) => (
                          <li
                            key={`${layer}-${i}`}
                            className="text-[10px] text-zinc-400 tracking-wide"
                          >
                            {">"} {r}
                          </li>
                        ))
                      ) : (
                        <li className="text-[10px] text-zinc-500 tracking-wide">{">"} No reasons</li>
                      )}
                    </ul>
                  </details>
                );
              })
            )}
          </div>
        )}
      </div>

      <div className="mt-5 pt-3 border-t border-zinc-800 flex justify-between items-center text-[9px] text-zinc-500 uppercase tracking-widest font-bold">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 bg-green-500 animate-pulse rounded-none" />
          <span>SYS.ACTIVE</span>
        </div>
        <span>CHANNEL: gmail</span>
      </div>
    </div>
  );
}
