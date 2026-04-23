from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from utils import extract_video_id, get_transcript, format_transcript, summarize_text

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://yt-summarizer-two.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def home():
    return {"message": "Backend working"}

@app.get("/summarize")
def summarize(url: str, language: str = "English"):
    try:
        video_id = extract_video_id(url)
        if not video_id:
            return {"error": "Invalid YouTube URL"}
        transcript = get_transcript(video_id)
        formatted_text = format_transcript(transcript)
        summary = summarize_text(formatted_text, language)
        return {"video_id": video_id, "summary": summary}
    except Exception as e:
        return {"error": str(e)}

@app.get("/test")
def test_transcript():
    try:
        from youtube_transcript_api import YouTubeTranscriptApi
        t = YouTubeTranscriptApi.get_transcript("Ks-_Mh1QhMc")
        return {"status": "ok", "entries": len(t)}
    except Exception as e:
        return {"status": "error", "detail": str(e)}