import os
import sys
import tempfile
import json
import time
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv


# Support both local and package imports
try:
    from .backend.pipeline import run_pipeline
except ImportError:
    from backend.pipeline import run_pipeline

load_dotenv()
app = FastAPI(title=" API")

# Add CORS middleware early so it applies to all routes (including /docs)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://localhost:3000",
        "https://localhost:3001",
        "https://amaka-ai.onrender.com",
        os.getenv("FRONTEND_URL", "https://amaka-ai.onrender.com"),
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Record start time for uptime reporting
START_TIME = time.time()


@app.get("/health", summary="Health check", tags=["Health"])
def health():
    """Returns service health and uptime in seconds."""
    uptime_seconds = int(time.time() - START_TIME)
    return {"status": "ok", "uptime_seconds": uptime_seconds}


@app.get("/", summary="Root", include_in_schema=False)
def root():
    """Basic root endpoint to confirm the service is running."""
    return {"message": "Amaka AI backend is running. Visit /docs for API docs."}


def event_generator(text_input, audio_file_path, target_language):
    """Generator that yields SSE events for each pipeline step"""
    try:
        results = {}
        for step_name, result in run_pipeline(
            text_input=text_input,
            audio_file_path=audio_file_path,
            target_language=target_language,
        ):
            results[step_name] = result
            # Yield SSE format: data: <json>\n\n
            event_data = json.dumps({"step": step_name, "data": result})
            yield f"data: {event_data}\n\n"
        
        # Final event with all results
        event_data = json.dumps({"step": "complete", "data": results})
        yield f"data: {event_data}\n\n"
    except Exception as e:
        error_data = json.dumps({"step": "error", "error": str(e)})
        yield f"data: {error_data}\n\n"


@app.post("/api/pipeline")
async def pipeline(
    target_language: str = Form(...),
    text_input: str = Form(None),
    audio_file: UploadFile = File(None),
):
    has_text = bool(text_input and text_input.strip())
    has_audio = audio_file is not None

    if not has_text and not has_audio:
        raise HTTPException(status_code=400, detail="Provide either text_input or audio_file.")
    if has_text and has_audio:
        raise HTTPException(status_code=400, detail="Provide text_input OR audio_file, not both.")

    try:
        tmp_path = None
        if has_audio:
            # Create temp file with LOWERCASE extension
            suffix = "." + audio_file.filename.rsplit(".", 1)[-1].lower()
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                tmp.write(await audio_file.read())
                tmp_path = tmp.name
            audio_file_path = tmp_path
            text_input_param = None
        else:
            audio_file_path = None
            text_input_param = text_input.strip()

        def cleanup_generator():
            """Wrapper generator that cleans up temp file after streaming"""
            try:
                for event in event_generator(text_input_param, audio_file_path, target_language):
                    yield event
            finally:
                if tmp_path and os.path.exists(tmp_path):
                    os.unlink(tmp_path)

        return StreamingResponse(cleanup_generator(), media_type="text/event-stream")

    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {e}")