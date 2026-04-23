import os
import json
import urllib.request
import yt_dlp
from dotenv import load_dotenv
from groq import Groq

load_dotenv()

api_key = os.getenv("GROQ_API_KEY")
if not api_key:
    raise ValueError("GROQ_API_KEY not found in .env file")

client = Groq(api_key=api_key)

def extract_video_id(url: str):
    if "v=" in url:
        return url.split("v=")[-1].split("&")[0]
    elif "youtu.be/" in url:
        return url.split("youtu.be/")[-1].split("?")[0]
    return None

def get_transcript(video_id: str):
    url = f"https://www.youtube.com/watch?v={video_id}"
    ydl_opts_base = {
        'writesubtitles': True,
        'writeautomaticsub': True,
        'subtitleslangs': ['en'],
        'subtitlesformat': 'json3',
        'skip_download': True,
        'quiet': True,
    }

    # Try without cookies first, then try each browser
    attempts = [
        {},  # no cookies
        {'cookiesfrombrowser': ('brave',)},
        {'cookiesfrombrowser': ('chrome',)},
        {'cookiesfrombrowser': ('firefox',)},
        {'cookiesfrombrowser': ('edge',)},
    ]

    last_error = None

    for attempt in attempts:
        try:
            opts = {**ydl_opts_base, **attempt}
            with yt_dlp.YoutubeDL(opts) as ydl:
                info = ydl.extract_info(url, download=False)
                caps = info.get('subtitles', {}) or info.get('automatic_captions', {})
                if 'en' not in caps:
                    raise Exception("No English captions found")
                for item in caps['en']:
                    if item.get('ext') == 'json3':
                        with urllib.request.urlopen(item['url']) as r:
                            data = json.loads(r.read())
                            entries = []
                            for event in data.get('events', []):
                                if 'segs' not in event:
                                    continue
                                start = event.get('tStartMs', 0) / 1000
                                text = ''.join(s.get('utf8', '') for s in event['segs']).strip()
                                if text:
                                    entries.append({'start': start, 'text': text})
                            if entries:
                                return entries
        except Exception as e:
            last_error = e
            continue

    raise Exception(f"Could not fetch transcript: {str(last_error)}")

def format_transcript(transcript):
    text = ""
    for entry in transcript:
        minutes = int(entry['start'] // 60)
        seconds = int(entry['start'] % 60)
        text += f"[{minutes}:{seconds:02d}] {entry['text']} "
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