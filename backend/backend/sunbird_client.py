import os
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from dotenv import load_dotenv
import hashlib
from functools import lru_cache
from typing import Optional
import time

def get_friendly_error(error_type: str, status_code: int = None, original_error: str = "") -> str:
    """
    Convert technical errors to user-friendly messages.

    Args:
        error_type: Type of error (stt, summarize, translate, tts)
        status_code: HTTP status code if applicable
        original_error: Original error message

    Returns:
        User-friendly error message
    """
    # Check for timeout in original error
    if "timeout" in original_error.lower() or "timed out" in original_error.lower():
        return "Connection timeout. The server took too long to respond. Please try again."

    # Check for rate limiting
    if status_code == 429 or "rate limit" in original_error.lower():
        return "Too many requests. Please wait a few seconds before trying again."

    # Check for authentication errors
    if status_code == 401 or status_code == 403:
        return "Authentication failed. Please check your API credentials."

    # Type-specific friendly messages
    if error_type == "stt":
        if status_code == 500:
            return "Speech-to-text service is temporarily unavailable. Please try again in a moment."
        elif status_code == 400:
            return "Audio file format not supported. Please use mp3, wav, m4a, webm, or ogg format."
        else:
            return "Could not transcribe audio. Please ensure your audio is clear and try again."

    elif error_type == "summarize":
        if status_code == 500:
            return "Summarization service is temporarily unavailable. Please try again in a moment."
        elif status_code == 400:
            return "Text is too long or contains invalid characters. Please try with shorter text."
        else:
            return "Could not summarize text. Please try again or use shorter text."

    elif error_type == "translate":
        if status_code == 500:
            return "Translation service is temporarily unavailable. Please try again in a moment."
        elif status_code == 400:
            return "Could not translate text. Please check the target language and try again."
        else:
            return "Translation failed. Please try again in a few moments."

    elif error_type == "tts":
        if status_code == 500:
            return "Text-to-speech service is temporarily unavailable. Please try again in a moment."
        elif status_code == 400:
            return "Text contains invalid characters for speech synthesis. Please simplify your text."
        else:
            return "Could not generate audio. Please try again."

    # Generic server errors
    if status_code and status_code >= 500:
        return "Server error. Our service is experiencing issues. Please try again later."

    # Generic client errors
    if status_code and 400 <= status_code < 500:
        return "Invalid request. Please check your input and try again."

    # Fallback
    return "Something went wrong. Please try again. If the problem persists, contact support."


def format_validation_error(minutes: float) -> str:
    """Format audio duration validation error."""
    return f"Audio is {minutes:.1f} minutes long. Please upload an audio file shorter than 5 minutes."

load_dotenv()

SUNBIRD_API_TOKEN = os.getenv("SUNBIRD_API_TOKEN")
BASE_URL = "https://api.sunbird.ai"

# OPTIMIZATION 1: Simple in-memory cache for repeated requests
_cache = {}
CACHE_TTL = 3600  # 1 hour cache

# OPTIMIZATION 2: Pre-initialize session at module load
_session = None

def _get_session():
    """Get or create a requests Session with OPTIMIZED connection pooling"""
    global _session
    if _session is None:
        _session = requests.Session()
        
        # OPTIMIZATION 3: Aggressive connection pooling
        adapter = HTTPAdapter(
            pool_connections=20,      # Increased from 10
            pool_maxsize=20,          # Increased from 10
            pool_block=False,         # Don't block if pool is full
            max_retries=Retry(
                total=1,              # REDUCED from 2 for faster failure
                backoff_factor=0.3,   # REDUCED from 0.5 for faster retry
                status_forcelist=[500, 502, 503, 504]
            )
        )
        _session.mount('https://', adapter)
        _session.mount('http://', adapter)
        
        # OPTIMIZATION 4: Optimized keep-alive
        _session.headers.update({
            'Connection': 'keep-alive',
            'Keep-Alive': 'timeout=60, max=100',  # Increased timeout and max
            'Accept-Encoding': 'gzip, deflate',    # Enable compression
        })
    
    return _session

SPEAKER_IDS = {
    "Luganda":    248,
    "Runyankole": 243,
    "Ateso":      242,
    "Lugbara":    245,
    "Acholi":     241,
}


def _headers() -> dict:
    if not SUNBIRD_API_TOKEN:
        raise EnvironmentError(
            "SUNBIRD_API_TOKEN is not set. Add it to your .env file."
        )
    return {
        "Authorization": f"Bearer {SUNBIRD_API_TOKEN}",
        "Content-Type": "application/json",
    }


def _generate_cache_key(prefix: str, *args) -> str:
    """Generate cache key from function arguments"""
    key_data = f"{prefix}:" + ":".join(str(arg) for arg in args)
    return hashlib.md5(key_data.encode()).hexdigest()


def _get_cached(key: str) -> Optional[any]:
    """Get cached result if not expired"""
    if key in _cache:
        result, timestamp = _cache[key]
        if time.time() - timestamp < CACHE_TTL:
            return result
        else:
            del _cache[key]
    return None


def _set_cache(key: str, value: any):
    """Store result in cache"""
    _cache[key] = (value, time.time())


# OPTIMIZATION 5: Cache text-based operations
def transcribe(audio_file) -> str:
    """
    OPTIMIZATION: No caching for audio (files are unique)
    OPTIMIZATION: Reduced timeout for faster failure detection
    """
    url = f"{BASE_URL}/tasks/stt"

    # Read file contents and get filename
    filename = None
    audio_data = None
    
    if isinstance(audio_file, str):
        filename = os.path.basename(audio_file)
        with open(audio_file, "rb") as f:
            audio_data = f.read()
    elif hasattr(audio_file, 'read'):
        if hasattr(audio_file, 'filename'):
            filename = audio_file.filename
        audio_data = audio_file.read()
    else:
        audio_data = audio_file
        filename = "audio.mp3"

    # Normalize filename: lowercase extension
    if filename:
        name_parts = filename.rsplit('.', 1)
        if len(name_parts) == 2:
            name, ext = name_parts
            ext = ext.lower()
            filename = f"{name}.{ext}"
        else:
            filename = "audio.mp3"
    else:
        filename = "audio.mp3"

    # Map extension to MIME type
    mime_types = {
        "mp3": "audio/mpeg",
        "wav": "audio/wav",
        "ogg": "audio/ogg",
        "m4a": "audio/mp4",
        "aac": "audio/aac",
    }
    
    ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else "mp3"
    mime_type = mime_types.get(ext, "audio/mpeg")

    # OPTIMIZATION 6: Reduced timeouts for STT
    headers = {"Authorization": f"Bearer {SUNBIRD_API_TOKEN}"}
    session = _get_session()
    
    try:
        response = session.post(
            url, 
            files={"audio": (filename, audio_data, mime_type)}, 
            headers=headers,
            timeout=(5, 120)  # REDUCED: 5s connect (was 10s), 120s read (was 180s)
        )
    except requests.exceptions.Timeout:
        raise RuntimeError(get_friendly_error("stt", original_error="timeout"))
    except requests.exceptions.ConnectionError:
        raise RuntimeError("Cannot connect to server. Please check your internet connection and try again.")

    if response.status_code != 200:
        friendly_msg = get_friendly_error("stt", response.status_code, response.text)
        raise RuntimeError(friendly_msg)

    data = response.json()
    
    try:
        return data["audio_transcription"]
    except (KeyError, TypeError) as e:
        raise RuntimeError("Could not process audio transcription. Please try again with a different audio file.")


def summarise(text: str) -> str:
    """
    OPTIMIZATION: Cache summarization results for identical text
    OPTIMIZATION: Reduced timeout
    """
    # Check cache first
    cache_key = _generate_cache_key("summarise", text)
    cached_result = _get_cached(cache_key)
    if cached_result is not None:
        print(f"✓ Cache hit for summarise")
        return cached_result

    url = f"{BASE_URL}/tasks/summarise"
    payload = {"text": text}

    session = _get_session()
    # OPTIMIZATION 7: Reduced timeout for summarization
    try:
        response = session.post(
            url, 
            json=payload, 
            headers=_headers(), 
            timeout=(3, 60)  # REDUCED: 3s connect, 60s read (was 10s, 180s)
        )
    except requests.exceptions.Timeout:
        raise RuntimeError(get_friendly_error("summarize", original_error="timeout"))
    except requests.exceptions.ConnectionError:
        raise RuntimeError("Cannot connect to server. Please check your internet connection and try again.")

    if response.status_code != 200:
        friendly_msg = get_friendly_error("summarize", response.status_code, response.text)
        raise RuntimeError(friendly_msg)

    data = response.json()
    
    try:
        result = data["summarized_text"]
        # Cache the result
        _set_cache(cache_key, result)
        return result
    except (KeyError, TypeError) as e:
        raise RuntimeError("Could not process summary. Please try again with different text.")


def translate(text: str, target_language: str) -> str:
    """
    OPTIMIZATION: Cache translation results for identical text+language pairs
    OPTIMIZATION: Reduced timeout
    """
    if target_language not in SPEAKER_IDS:
        raise ValueError(
            f"Unsupported language '{target_language}'. "
            f"Choose from: {list(SPEAKER_IDS.keys())}"
        )

    # Check cache first
    cache_key = _generate_cache_key("translate", text, target_language)
    cached_result = _get_cached(cache_key)
    if cached_result is not None:
        print(f"✓ Cache hit for translate to {target_language}")
        return cached_result

    url = f"{BASE_URL}/tasks/sunflower_inference"
    payload = {
        "messages": [
            {
                "role": "system",
                "content": (
                    f"You are a professional translator. "
                    f"Translate the user's text into {target_language}. "
                    f"Return only the translated text, no explanation."
                ),
            },
            {
                "role": "user",
                "content": f"Translate into {target_language}:\n\n{text}",
            },
        ]
    }

    session = _get_session()
    # OPTIMIZATION 8: Reduced timeout for translation
    response = session.post(
        url, 
        json=payload, 
        headers=_headers(), 
        timeout=(3, 60)  # REDUCED: 3s connect, 60s read (was 10s, 180s)
    )

    if response.status_code != 200:
        raise RuntimeError(
            f"Translation error {response.status_code}: {response.text}"
        )

    data = response.json()
    
    try:
        result = data["content"]
        # Cache the result
        _set_cache(cache_key, result)
        return result
    except (KeyError, TypeError) as e:
        raise RuntimeError(f"Translate response format error. Expected 'content' but got: {data}. Error: {e}")


def text_to_speech(text: str, language: str) -> str:
    """
    OPTIMIZATION: Cache TTS results for identical text+language pairs
    OPTIMIZATION: Reduced timeout
    """
    if language not in SPEAKER_IDS:
        raise ValueError(
            f"Unsupported language '{language}'. "
            f"Choose from: {list(SPEAKER_IDS.keys())}"
        )

    # Check cache first (TTS URLs might be temporary, so shorter TTL might be better)
    cache_key = _generate_cache_key("tts", text, language)
    cached_result = _get_cached(cache_key)
    if cached_result is not None:
        print(f"✓ Cache hit for TTS in {language}")
        return cached_result

    url = f"{BASE_URL}/tasks/tts"
    payload = {
        "text": text,
        "speaker_id": SPEAKER_IDS[language],
    }

    session = _get_session()
    # OPTIMIZATION 9: Reduced timeout for TTS
    response = session.post(
        url, 
        json=payload, 
        headers=_headers(), 
        timeout=(3, 90)  # REDUCED: 3s connect, 90s read (was 10s, 180s)
    )

    if response.status_code != 200:
        raise RuntimeError(
            f"TTS error {response.status_code}: {response.text}"
        )

    data = response.json()
    
    try:
        result = data["output"]["audio_url"]
        # Cache the result
        _set_cache(cache_key, result)
        return result
    except (KeyError, TypeError) as e:
        raise RuntimeError(f"TTS response format error. Expected 'output.audio_url' but got: {data}. Error: {e}")


# OPTIMIZATION 10: Utility function to clear cache if needed
def clear_cache():
    """Clear all cached results"""
    global _cache
    _cache = {}
    print("✓ Cache cleared")


# OPTIMIZATION 11: Utility to warm up connections
def warmup_connections():
    """Pre-establish connections to Sunbird API"""
    try:
        session = _get_session()
        # Make a quick request to establish connection
        session.head(BASE_URL, timeout=2)
        print("✓ Connections warmed up")
    except Exception as e:
        print(f"⚠ Connection warmup failed: {e}")
