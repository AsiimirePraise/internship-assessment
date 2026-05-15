# Amaka AI - Sunbird Generative AI Assistant

I built this project as a small GenAI web app powered entirely by Sunbird AI. It accepts either typed text or an uploaded audio file, turns audio into text with Sunbird Speech-to-Text, summarises the content with Sunflower LLM, translates the summary into a chosen Ugandan local language, and then generates playable speech with Sunbird Text-to-Speech.

The app is split into a Python backend and a Next.js frontend. The backend owns the pipeline and talks to the Sunbird API. The frontend gives the user a clean UI for switching between text and audio input, choosing the target language, and reviewing each intermediate result before the final audio is played back.

## Architecture

The processing flow is:

`Input` → `STT` → `Summarise` → `Translate` → `TTS` → `Output`

How each step is handled:

- `Input`: the frontend lets the user choose between text input and audio upload.
- `STT`: audio files are sent to Sunbird's Speech-to-Text endpoint.
- `Summarise`: text is summarised with Sunflower Simple Inference.
- `Translate`: the summary is translated into Luganda, Runyankole, Ateso, Lugbara, or Acholi with Sunflower.
- `TTS`: the translated summary is converted to audio with Sunbird Text-to-Speech.
- `Output`: the UI shows the original text or transcript, the summary, the translated summary, and a playable audio player.

## Local Setup

I set this up to run on Windows, but the same workflow works on macOS and Linux with small path changes.

### 1. Clone the repository

```bash
git clone https://github.com/<your-username>/<your-repo-name>.git
cd internship-assessment
```

### 2. Set up the Python backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Configure environment variables

Copy the example file and add your real Sunbird token:

```bash
copy .env.example .env
```

Then edit `.env` and set:

```env
SUNBIRD_API_TOKEN=your_real_sunbird_token_here
FRONTEND_URL=http://localhost:3000
```

### 4. Run the backend

```bash
uvicorn main:app --reload --port 8000
```

### 5. Set up the frontend

Open a second terminal:

```bash
cd amaka-ai-frontend
npm install
```

If you want the frontend to point somewhere other than `http://localhost:8000`, create a `.env.local` file in `amaka-ai-frontend` and add:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 6. Run the frontend

```bash
npm run dev
```

Then open `http://localhost:3000` in your browser.

## Environment Variables

I use the following environment variables:

- `SUNBIRD_API_TOKEN`: required. This is my Sunbird AI API token and is used for STT, summarisation, translation, and TTS requests.
- `FRONTEND_URL`: optional. This is the allowed frontend origin for CORS in the backend. I keep it set to `http://localhost:3000` locally.
- `NEXT_PUBLIC_API_URL`: optional. This tells the frontend which backend URL to call. If omitted, the app defaults to `http://localhost:8000`.

The template for the backend variables lives in [backend/.env.example](backend/.env.example).

## Usage

I use the app like this:

1. I open the app in the browser.
2. I choose either `Text Input` or `Audio Upload`.
3. If I choose audio, I upload a file under 5 minutes.
4. I select the target language from the language picker.
5. I click process.
6. I watch the transcript appear first for audio input, then the summary, then the translated summary, and finally the generated audio player.

The results section is designed to show each stage clearly, so I can verify the pipeline rather than only seeing the final answer.

## Deployed Link

Frontend: https://amaka-ai.onrender.com/

Backend: https://amaka-backend.onrender.com

I deployed the app publicly so reviewers can try the full pipeline without setting up the project locally.

## Known Limitations

I kept a few practical limitations in mind while building this version of the app:

- I reject audio longer than 5 minutes because the STT and TTS calls get noticeably slower on long files, and I wanted to keep processing predictable for reviewers.
- I only support Luganda, Runyankole, Ateso, Lugbara, and Acholi because those are the target Ugandan local languages I wired into the translation and speech synthesis flow.
- The app depends on a valid Sunbird API token, so it will not work without one; that means the project is not self-contained and must be configured before use.
- I treat the backend response as streamed pipeline events, which means the frontend must stay connected while the request is running instead of working offline or from cached results.
- The TTS output is returned as a playable audio URL from Sunbird rather than a local file, so playback depends on the availability of that external URL.
- Audio processing can be slow, especially for longer files, because transcription and synthesis depend on external API response times, so the user may wait longer than they would in a fully local app.
- Some generated voices do not perfectly match the intended target language or speaker selection, so the spoken output may not always sound exactly as expected.
- Some transcripts may be imperfect when the audio is noisy, unclear, or low quality, which means the summary and translation can also inherit those transcription mistakes.

## Sunbird API References

I used these Sunbird docs while building the app:

- Speech-to-Text: https://docs.sunbird.ai/guides/speech-to-text
- Text-to-Speech: https://docs.sunbird.ai/guides/text-to-speech
- Sunflower chat / simple inference: https://docs.sunbird.ai/guides/sunflower-chat
- Full API reference: https://docs.sunbird.ai/api-reference/introduction

