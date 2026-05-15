# Support both local and package imports
try:
    from .sunbird_client import transcribe, summarise, translate, text_to_speech
except ImportError:
    from sunbird_client import transcribe, summarise, translate, text_to_speech


MAX_AUDIO_DURATION_SECONDS = 5 * 60  # 5 minutes


def check_audio_duration(audio_file_path: str) -> None:
    """
    Reject audio files longer than 5 minutes.
    Requires the `mutagen` library: pip install mutagen

    Args:
        audio_file_path: Path to the audio file.

    Raises:
        ValueError: If the audio exceeds 5 minutes.
    """
    try:
        from mutagen import File as MutagenFile
        audio = MutagenFile(audio_file_path)
        if audio is not None and audio.info.length > MAX_AUDIO_DURATION_SECONDS:
            minutes = audio.info.length / 60
            raise ValueError(
                f"Audio is {minutes:.1f} minutes long. "
                f"Please upload a file under 5 minutes."
            )
    except ImportError:
        # If mutagen isn't installed, skip the check and let Sunbird handle it
        pass


def run_pipeline(
    text_input: str = None,
    audio_file_path: str = None,
    target_language: str = "Luganda",
):
    """
    Full pipeline: Input → (STT) → Summarise → Translate → TTS
    Yields intermediate results as they complete.

    Provide either `text_input` or `audio_file_path`, not both.

    Args:
        text_input:       Typed or pasted text to process.
        audio_file_path:  Path to an uploaded audio file (MP3, WAV, OGG, M4A, AAC).
        target_language:  Target language for translation and TTS.
                          One of: "Luganda", "Runyankole", "Ateso", "Lugbara", "Acholi".

    Yields:
        Tuples of (step_name, result) where step_name is one of:
            - "transcript"   — transcribed text from audio (only for audio input)
            - "summary"      — summarised text
            - "translation"  — translated summary
            - "audio_url"    — signed URL to the generated audio clip

    Raises:
        ValueError:   On bad input or unsupported language.
        RuntimeError: On any Sunbird API failure.
    """

    # Validate input
    if not text_input and not audio_file_path:
        raise ValueError("Provide either text_input or audio_file_path.")

    if text_input and audio_file_path:
        raise ValueError("Provide text_input OR audio_file_path, not both.")

    # Step 1: Transcribe (audio path only) 
    transcript = None

    if audio_file_path:
        print("Checking audio duration...")
        check_audio_duration(audio_file_path)

        print("Transcribing audio...")
        transcript = transcribe(audio_file_path)
        print(f"Transcript: {transcript[:100]}...")
        source_text = transcript
        yield ("transcript", transcript)
    else:
        source_text = text_input
        print(f"Using text input: {source_text[:100]}...")

    # Step 2: Summarise 
    print("Summarising...")
    summary = summarise(source_text)
    print(f"Summary: {summary}")
    yield ("summary", summary)

    # Step 3: Translate 
    print(f"Translating to {target_language}...")
    translation = translate(summary, target_language)
    print(f"Translation: {translation}")
    yield ("translation", translation)

    # Step 4: Text-to-Speech 
    print(f"Generating audio in {target_language}...")
    audio_url = text_to_speech(translation, target_language)
    print(f"Audio URL: {audio_url}")
    yield ("audio_url", audio_url)

    return {
        "transcript":  transcript,
        "summary":     summary,
        "translation": translation,
        "audio_url":   audio_url,
    }