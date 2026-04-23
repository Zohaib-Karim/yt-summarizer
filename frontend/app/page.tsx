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

    const headerMatch = lines[0].match(
      /^\*\*(.+?)\*\*\s*\(?([\d:]+\s*[-–]\s*[\d:]+)?\)?/
    );

    if (headerMatch) {
      const bullets = lines
        .slice(1)
        .filter(l => l.startsWith("-") || l.startsWith("•"))
        .map(l => l.replace(/^[-•]\s*/, "").trim());

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

const fetchWithRetry = async (url: string, retries = 2): Promise<any> => {
  try {
    const res = await fetch(url);
    return await res.json();
  } catch {
    if (retries > 0) {
      await new Promise(r => setTimeout(r, 2000));
      return fetchWithRetry(url, retries - 1);
    }
    throw new Error("Failed after retries");
  }
};

export default function Home() {
  const [url, setUrl] = useState("");
  const [language, setLanguage] = useState("English");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeSummary, setActiveSummary] = useState<Summary | null>(null);

  const handleSummarize = async () => {
    if (!url) return;

    setLoading(true);
    setError("");

    try {
      const data = await fetchWithRetry(
        `${process.env.NEXT_PUBLIC_API_URL}/summarize?url=${encodeURIComponent(url)}&language=${encodeURIComponent(language)}`
      );

      if (data.error) {
        if (data.error.includes("transcript")) {
          setError("⚠️ This video may not have captions or is restricted. Try another video.");
        } else {
          setError("⚠️ Something went wrong. Try again.");
        }
      } else {
        const sections = parseSummary(data.summary);

        setActiveSummary({
          id: Date.now(),
          url,
          title: sections[0]?.title || "Summary",
          sections,
          raw: data.summary,
        });
      }
    } catch {
      setError("⚠️ Server is waking up. Try again in a few seconds.");
    } finally {
      setLoading(false);
    }
  };

  const jumpToTime = (timestamp: string) => {
    if (!activeSummary) return;

    const start = timestamp.split("-")[0].trim();
    const [min, sec] = start.split(":").map(Number);
    const total = min * 60 + sec;

    const vid = getVideoId(activeSummary.url);
    if (!vid) return;

    window.open(`https://www.youtube.com/watch?v=${vid}&t=${total}s`, "_blank");
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6">
      <h1 className="text-3xl font-bold mb-6">YouTube Video Summarizer</h1>

      <input
        type="text"
        placeholder="Paste YouTube URL..."
        className="border p-3 w-full max-w-xl rounded mb-4"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
      />

      <button
        onClick={handleSummarize}
        disabled={loading}
        className="bg-blue-600 text-white px-6 py-2 rounded disabled:opacity-40"
      >
        {loading ? "Summarizing..." : "Summarize"}
      </button>

      {error && <div className="mt-4 text-red-500 text-sm">{error}</div>}

      {activeSummary && (
        <div className="mt-6 max-w-xl w-full border p-4 rounded">
          <h2 className="font-semibold mb-4">Summary</h2>

          {activeSummary.sections.map((sec, i) => (
            <div key={i} className="mb-4">
              <div className="flex items-center gap-2">
                <strong>{sec.title}</strong>

                {sec.timestamp && (
                  <button
                    onClick={() => jumpToTime(sec.timestamp)}
                    className="text-xs text-blue-600 underline"
                  >
                    {sec.timestamp}
                  </button>
                )}
              </div>

              <ul className="mt-2 text-sm list-disc pl-5">
                {sec.bullets.map((b, j) => (
                  <li key={j}>{b}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}