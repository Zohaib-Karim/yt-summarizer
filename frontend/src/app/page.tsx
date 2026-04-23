"use client";
import { useState } from "react";

export default function Home() {
  const [url, setUrl] = useState("");
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSummarize = async () => {
    if (!url) return;
    setLoading(true);
    setSummary("");
    setError("");

    try {
      const res = await fetch(
        `http://127.0.0.1:8000/summarize?url=${encodeURIComponent(url)}`
      );
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setSummary(data.summary);
      }
    } catch (err) {
      setError("Failed to connect to backend.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center py-16 px-4">
      <h1 className="text-4xl font-bold mb-2 text-white">🎥 YT Summarizer</h1>
      <p className="text-gray-400 mb-8 text-center">
        Paste a YouTube URL and get an AI-generated summary with timestamps
      </p>

      <div className="w-full max-w-2xl flex gap-2 mb-8">
        <input
          type="text"
          placeholder="https://www.youtube.com/watch?v=..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
        <button
          onClick={handleSummarize}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-900 px-6 py-3 rounded-lg font-semibold transition"
        >
          {loading ? "Summarizing..." : "Summarize"}
        </button>
      </div>

      {error && (
        <div className="w-full max-w-2xl bg-red-900/40 border border-red-700 rounded-lg p-4 text-red-300">
          {error}
        </div>
      )}

      {summary && (
        <div className="w-full max-w-2xl bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-blue-400">📋 Summary</h2>
          <p className="text-gray-200 whitespace-pre-wrap leading-relaxed">{summary}</p>
        </div>
      )}
    </main>
  );
}