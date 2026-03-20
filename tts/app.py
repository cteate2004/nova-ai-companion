"""
Nova TTS Service — generates natural speech audio using Edge TTS (free, unlimited).
Returns MP3 audio files that work on all devices including iOS.
"""

import os
import uuid
import asyncio
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import edge_tts

PORT = int(os.environ.get("TTS_PORT", 8002))
VOICE = os.environ.get("TTS_VOICE", "en-US-AriaNeural")
OUTPUT_DIR = Path(__file__).parent / "audio"
OUTPUT_DIR.mkdir(exist_ok=True)

app = FastAPI(title="Nova TTS Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class TTSRequest(BaseModel):
    text: str
    voice: str = None


@app.get("/health")
def health():
    return {"status": "ok", "voice": VOICE}


@app.post("/speak")
async def speak(req: TTSRequest):
    text = req.text.strip()
    if not text:
        raise HTTPException(400, "text is required")

    voice = req.voice or VOICE
    job_id = str(uuid.uuid4())[:8]
    filename = f"{job_id}.mp3"
    filepath = str(OUTPUT_DIR / filename)

    try:
        communicate = edge_tts.Communicate(text, voice)
        await communicate.save(filepath)
        return {"audio_url": f"/audio/{filename}"}
    except Exception as e:
        raise HTTPException(500, str(e))


@app.get("/audio/{filename}")
def serve_audio(filename: str):
    filepath = OUTPUT_DIR / filename
    if not filepath.exists():
        raise HTTPException(404, "Audio not found")
    return FileResponse(str(filepath), media_type="audio/mpeg")


@app.post("/cleanup")
def cleanup():
    """Remove audio files older than 5 minutes."""
    import time
    count = 0
    cutoff = time.time() - 300
    for f in OUTPUT_DIR.glob("*.mp3"):
        if f.stat().st_mtime < cutoff:
            f.unlink(missing_ok=True)
            count += 1
    return {"removed": count}


if __name__ == "__main__":
    import uvicorn
    print(f"[Nova TTS] Starting on port {PORT}, voice: {VOICE}")
    uvicorn.run(app, host="0.0.0.0", port=PORT)
