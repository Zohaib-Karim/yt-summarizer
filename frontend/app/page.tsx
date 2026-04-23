"use client";
import { useState, useEffect } from "react";

interface Summary {
  id: number;
  url: string;
  title: string;
  sections: Section[];
  raw: string;
}

interface Section {
  title: string;
  timestamp: string;
  bullets: string[];
}

function parseSummary(raw: string): Section[] {
  const sections: Section[] = [];
  const blocks = raw.split("\n\n").filter(Boolean);
  for (const block of blocks) {
    const lines = block.split("\n").map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;
    const headerMatch = lines[0].match(/^\*\*(.+?)\*\*\s*\(?([\d:]+\s*[-–]\s*[\d:]+)?\)?/);
    if (headerMatch) {
      const bullets = lines
        .slice(1)
        .filter(l => l.startsWith("-") || l.startsWith("•"))
        .map(l => l.replace(/^[-•]\s*/, "").trim())
        .filter(Boolean);
      sections.push({
        title: headerMatch[1].trim(),
        timestamp: headerMatch[2] || "",
        bullets,
      });
    }
  }
  return sections;
}

function getVideoId(url: string): string | null {
  if (url.includes("v=")) return url.split("v=")[1].split("&")[0];
  if (url.includes("youtu.be/")) return url.split("youtu.be/")[1].split("?")[0];
  return null;
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [language, setLanguage] = useState("English");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [recentSummaries, setRecentSummaries] = useState<Summary[]>([]);
  const [activeSummary, setActiveSummary] = useState<Summary | null>(null);
  const [showNew, setShowNew] = useState(true);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("yt-summaries");
    if (saved) setRecentSummaries(JSON.parse(saved));
    const savedTheme = localStorage.getItem("yt-theme");
    if (savedTheme === "dark") setDark(true);
  }, []);

  useEffect(() => {
    localStorage.setItem("yt-theme", dark ? "dark" : "light");
  }, [dark]);

  useEffect(() => {
    if (recentSummaries.length > 0)
      localStorage.setItem("yt-summaries", JSON.stringify(recentSummaries));
  }, [recentSummaries]);

  const handleSummarize = async () => {
    if (!url) return;
    setLoading(true);
    setError("");
    setShowNew(false);
    try {
      const res = await fetch(
        `http://127.0.0.1:8000/summarize?url=${encodeURIComponent(url)}&language=${encodeURIComponent(language)}`
      );
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        setShowNew(true);
      } else {
        const sections = parseSummary(data.summary);
        const newSummary: Summary = {
          id: Date.now(),
          url,
          title: sections[0]?.title || "Summary",
          sections,
          raw: data.summary,
        };
        setRecentSummaries((prev) => {
          const updated = [newSummary, ...prev.slice(0, 9)];
          localStorage.setItem("yt-summaries", JSON.stringify(updated));
          return updated;
        });
        setActiveSummary(newSummary);
      }
    } catch {
      setError("Failed to connect to backend.");
      setShowNew(true);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!activeSummary) return;
    navigator.clipboard.writeText(activeSummary.raw);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const videoId = activeSummary ? getVideoId(activeSummary.url) : null;

  // Theme classes
  const t = {
    bg: dark ? "bg-[#1a1a1a]" : "bg-[#efefed]",
    sidebar: dark ? "bg-[#1a1a1a]" : "bg-transparent",
    card: dark ? "bg-[#242424]" : "bg-white",
    cardBorder: dark ? "border-[#333]" : "border-gray-100",
    text: dark ? "text-gray-100" : "text-gray-900",
    subtext: dark ? "text-gray-400" : "text-gray-500",
    muted: dark ? "text-gray-500" : "text-gray-400",
    input: dark ? "bg-[#2a2a2a] border-[#333] text-gray-200 placeholder-gray-600" : "bg-[#fafafa] border-gray-200 text-gray-700 placeholder-gray-400",
    inputFocus: dark ? "focus-within:border-blue-500" : "focus-within:border-blue-300",
    sidebarBtn: dark ? "hover:bg-white/10" : "hover:bg-white/70",
    sidebarActive: dark ? "bg-white/10 text-gray-100" : "bg-white text-gray-900 shadow-sm",
    sidebarInactive: dark ? "text-gray-500 hover:text-gray-200 hover:bg-white/5" : "text-gray-500 hover:text-gray-800 hover:bg-white/50",
    divider: dark ? "border-[#333]" : "border-gray-100",
    bullet: dark ? "bg-blue-500" : "bg-blue-400",
    badge: dark ? "text-blue-400 bg-blue-900/40" : "text-blue-500 bg-blue-50",
    copyBtn: dark ? "text-gray-500 hover:text-gray-200 border-[#333]" : "text-gray-400 hover:text-gray-700 border-gray-200",
    emptyIcon: dark ? "bg-[#2a2a2a]" : "bg-gray-100",
    select: dark ? "bg-[#2a2a2a] border-[#333] text-gray-300" : "bg-white border-gray-200 text-gray-600",
  };

  return (
    <div className={`min-h-screen ${t.bg} flex font-sans transition-colors duration-300`}>
      {/* Sidebar */}
      <aside className={`w-56 p-5 flex flex-col gap-4 min-h-screen ${t.sidebar}`}>
        <div className={`text-sm font-bold mt-1 tracking-tight ${t.text}`}>YT Summarizer</div>

        <button
          onClick={() => { setShowNew(true); setActiveSummary(null); setUrl(""); setError(""); }}
          className={`flex items-center gap-2 text-sm ${t.subtext} ${t.sidebarBtn} px-3 py-2 rounded-xl transition-all duration-200`}
        >
          <span className={`w-5 h-5 ${dark ? "bg-white/10" : "bg-gray-200"} rounded flex items-center justify-center text-xs`}>+</span>
          New summary
        </button>

        <div>
          <p className={`text-xs mb-2 px-1 ${t.muted}`}>Recent</p>
          {recentSummaries.length === 0 ? (
            <p className={`text-xs italic px-1 ${t.muted}`}>No summaries yet</p>
          ) : (
            <div className="flex flex-col gap-0.5">
              {recentSummaries.map((s) => (
                <button
                  key={s.id}
                  onClick={() => { setActiveSummary(s); setShowNew(false); setUrl(s.url); }}
                  className={`text-left text-sm truncate py-1.5 px-3 rounded-xl transition-all duration-200 ${
                    activeSummary?.id === s.id ? t.sidebarActive : t.sidebarInactive
                  }`}
                >
                  {s.title}
                </button>
              ))}
            </div>
          )}
        </div>

        {recentSummaries.length > 0 && (
          <button
            onClick={() => {
              localStorage.removeItem("yt-summaries");
              setRecentSummaries([]);
              setActiveSummary(null);
              setShowNew(true);
            }}
            className={`mt-auto text-xs ${t.muted} hover:text-red-400 transition px-1`}
          >
            Clear history
          </button>
        )}
      </aside>

      {/* Main card */}
      <main className="flex-1 flex flex-col py-8 pr-8">
        <div className={`w-full ${t.card} rounded-3xl shadow-sm min-h-[90vh] flex flex-col overflow-hidden transition-colors duration-300`}>

          {/* Top bar with theme toggle */}
          <div className={`flex items-center justify-end px-6 py-4 border-b ${t.divider}`}>
            <button
              onClick={() => setDark(!dark)}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 ${dark ? "bg-white/10 hover:bg-white/20 text-yellow-400" : "bg-gray-100 hover:bg-gray-200 text-gray-600"}`}
              title={dark ? "Switch to light mode" : "Switch to dark mode"}
            >
              {dark ? (
                // Sun icon
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                </svg>
              ) : (
                // Moon icon
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
              )}
            </button>
          </div>

          {/* Empty state */}
          {showNew && !loading && (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
              <div className={`w-14 h-14 ${t.emptyIcon} rounded-2xl flex items-center justify-center text-3xl mb-5`}>🎬</div>
              <h1 className={`text-2xl font-bold mb-2 ${t.text}`}>Hi, ready to summarize?</h1>
              <p className={`text-sm max-w-sm ${t.muted}`}>
                Paste a YouTube link below to get structured key points with timestamps in seconds.
              </p>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className={`text-sm ${t.muted}`}>Fetching transcript and summarizing...</p>
            </div>
          )}

          {/* Summary view */}
          {activeSummary && !showNew && !loading && (
            <div className="flex-1 flex flex-col overflow-auto">
              {videoId && (
                <div className="w-full aspect-video overflow-hidden bg-black">
                  <iframe
                    src={`https://www.youtube.com/embed/${videoId}`}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              )}

              <div className="flex-1 p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className={`text-lg font-semibold ${t.text}`}>Summary</h2>
                  <button onClick={handleCopy} className={`text-xs border rounded-lg px-3 py-1.5 transition ${t.copyBtn}`}>
                    {copied ? "✓ Copied" : "Copy"}
                  </button>
                </div>

                <div className="flex flex-col gap-6">
                  {activeSummary.sections.map((section, i) => (
                    <div key={i}>
                      <div className="flex items-center gap-3 mb-3">
                        <span className={`text-sm font-bold ${t.text}`}>{section.title}</span>
                        {section.timestamp && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${t.badge}`}>
                            {section.timestamp}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col gap-2 pl-2">
                        {section.bullets.map((bullet, j) => (
                          <div key={j} className="flex items-start gap-2">
                            <span className={`mt-1.5 w-1.5 h-1.5 rounded-full ${t.bullet} shrink-0`} />
                            <p className={`text-sm leading-relaxed ${t.subtext}`}>{bullet}</p>
                          </div>
                        ))}
                      </div>
                      {i < activeSummary.sections.length - 1 && (
                        <div className={`mt-5 border-t ${t.divider}`} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mx-8 mb-4 bg-red-50 border border-red-100 rounded-2xl p-4 text-red-400 text-sm">
              ⚠️ {error}
            </div>
          )}

          {/* Input */}
          <div className={`p-5 border-t ${t.divider} ${t.card} rounded-b-3xl`}>
            <div className={`border rounded-2xl p-4 ${t.input} ${t.inputFocus} focus-within:shadow-sm transition-all duration-200`}>
              <input
                type="text"
                placeholder="Start typing or paste a YouTube link..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSummarize()}
                className={`w-full text-sm outline-none bg-transparent mb-3 ${dark ? "text-gray-200 placeholder-gray-600" : "text-gray-700 placeholder-gray-400"}`}
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`text-xs ${t.muted}`}>Language:</span>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className={`text-xs border rounded-lg px-2 py-1 outline-none cursor-pointer transition ${t.select}`}
                  >
                    {["English","Hindi","Arabic","French","Spanish","German","Chinese","Japanese","Portuguese","Urdu"].map((lang) => (
                      <option key={lang} value={lang}>{lang}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleSummarize}
                  disabled={loading || !url}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-30 text-white text-sm font-medium px-4 py-1.5 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
                >
                  {loading ? "..." : "→"}
                </button>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}