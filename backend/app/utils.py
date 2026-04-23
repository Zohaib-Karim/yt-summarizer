import os
import json
import urllib.request
import yt_dlp
from youtube_transcript_api import YouTubeTranscriptApi
from dotenv import load_dotenv
from groq import Groq

load_dotenv()

api_key = os.getenv("GROQ_API_KEY")
if not api_key:
    raise ValueError("GROQ_API_KEY not found")

client = Groq(api_key=api_key)

def extract_video_id(url: str):
    if "v=" in url:
        return url.split("v=")[-1].split("&")[0]
    elif "youtu.be/" in url:
        return url.split("youtu.be/")[-1].split("?")[0]
    return None

def get_transcript(video_id: str):
    from youtube_transcript_api import YouTubeTranscriptApi
    import os

    scraper_key = os.getenv("SCRAPER_API_KEY")

    # ✅ Try proxy FIRST
    if scraper_key:
        try:
            proxy_url = f"http://scraperapi:{scraper_key}@proxy-server.scraperapi.com:8001"

            api = YouTubeTranscriptApi(
                proxies={
                    "http": proxy_url,
                    "https": proxy_url
                }
            )

            transcript = api.fetch(video_id)

            return [
                {"start": t.start, "text": t.text}
                for t in transcript
            ]

        except Exception as e:
            print("Proxy failed:", str(e))

    # ✅ Try normal (sometimes works)
    try:
        transcript = YouTubeTranscriptApi.get_transcript(video_id)
        return transcript
    except Exception as e:
        print("Direct failed:", str(e))

    # ❌ REMOVE yt-dlp fallback (it does NOT work in production)

    raise Exception(
        "Transcript unavailable. This video may be restricted or have no captions."
    )

def format_transcript(transcript):
    text = ""
    for entry in transcript:
        start = entry.get('start', 0)
        minutes = int(start // 60)
        seconds = int(start % 60)
        text_content = entry.get('text', '')
        text += f"[{minutes}:{seconds:02d}] {text_content} "
    return text

def summarize_text(text: str, language: str = "English"):
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {
                "role": "system",
                "content": f"""You are an expert video summarizer. Summarize in {language}.

Format your response exactly like this for each section:

**Section Title** (start_time - end_time)
- Key point with specific detail, names, facts, or examples mentioned
- Another key point with context and nuance
- Any notable quotes, statistics, or insights from this section

Rules:
- Be specific — mention names, numbers, examples actually said in the video
- Each bullet should be 1-2 full sentences, not fragments
- Include 3-5 bullet points per section
- Aim for 8-12 sections for a thorough breakdown
- Write the ENTIRE summary in {language}"""
            },
            {
                "role": "user",
                "content": f"Please summarize this video transcript in detail:\n\n{text}"
            }
        ],
        max_tokens=2000,
        temperature=0.3,
    )
    return response.choices[0].message.content
