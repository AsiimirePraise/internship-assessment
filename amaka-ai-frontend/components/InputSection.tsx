'use client'

import { Mic, FileText, Upload, Info, ArrowUp, Trash2, Clock, AlertTriangle, Square, CircleDot } from 'lucide-react'
import { useRef, useState, useCallback, useEffect } from 'react'

const MAX_DURATION_SECONDS = 5 * 60 // 5 minutes

interface InputSectionProps {
  inputMode: 'audio' | 'text'
  setInputMode: (mode: 'audio' | 'text') => void
  textInput: string
  setTextInput: (text: string) => void
  audioFile: File | null
  setAudioFile: (file: File | null) => void
  isProcessing: boolean
  onProcess: () => void
  onDurationError?: (message: string) => void
}

export default function InputSection({
  inputMode,
  setInputMode,
  textInput,
  setTextInput,
  audioFile,
  setAudioFile,
  isProcessing,
  onProcess,
  onDurationError,
}: InputSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<BlobPart[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<number | null>(null)
  const [audioDuration, setAudioDuration] = useState<number | null>(null)
  const [durationError, setDurationError] = useState<string | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [recordingError, setRecordingError] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current)
      }
      streamRef.current?.getTracks().forEach((track) => track.stop())
    }
  }, [])

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const bufferToWav = (audioBuffer: AudioBuffer) => {
    const numberOfChannels = Math.min(audioBuffer.numberOfChannels, 2)
    const sampleRate = audioBuffer.sampleRate
    const samplesPerChannel = audioBuffer.length
    const bytesPerSample = 2
    const blockAlign = numberOfChannels * bytesPerSample
    const byteRate = sampleRate * blockAlign
    const dataSize = samplesPerChannel * blockAlign
    const buffer = new ArrayBuffer(44 + dataSize)
    const view = new DataView(buffer)

    const writeString = (offset: number, value: string) => {
      for (let index = 0; index < value.length; index += 1) {
        view.setUint8(offset + index, value.charCodeAt(index))
      }
    }

    writeString(0, 'RIFF')
    view.setUint32(4, 36 + dataSize, true)
    writeString(8, 'WAVE')
    writeString(12, 'fmt ')
    view.setUint32(16, 16, true)
    view.setUint16(20, 1, true)
    view.setUint16(22, numberOfChannels, true)
    view.setUint32(24, sampleRate, true)
    view.setUint32(28, byteRate, true)
    view.setUint16(32, blockAlign, true)
    view.setUint16(34, bytesPerSample * 8, true)
    writeString(36, 'data')
    view.setUint32(40, dataSize, true)

    const channelData = Array.from({ length: numberOfChannels }, (_, channelIndex) =>
      audioBuffer.getChannelData(channelIndex)
    )

    let offset = 44
    for (let sampleIndex = 0; sampleIndex < samplesPerChannel; sampleIndex += 1) {
      for (let channelIndex = 0; channelIndex < numberOfChannels; channelIndex += 1) {
        const sample = Math.max(-1, Math.min(1, channelData[channelIndex][sampleIndex]))
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true)
        offset += 2
      }
    }

    return buffer
  }

  const transcodeRecordedAudio = async (blob: Blob) => {
    try {
      const arrayBuffer = await blob.arrayBuffer()
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
      const wavBuffer = bufferToWav(audioBuffer)
      await audioContext.close()

      return new File([wavBuffer], `recording-${Date.now()}.wav`, { type: 'audio/wav' })
    } catch {
      return new File([blob], `recording-${Date.now()}.${blob.type.includes('mp4') ? 'm4a' : 'webm'}`, {
        type: blob.type || 'audio/webm',
      })
    }
  }

  const pickRecorderMimeType = () => {
    const candidates = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus',
    ]

    return candidates.find((candidate) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(candidate)) || ''
  }

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop()
    }
  }, [])

  const validateAndSetFile = useCallback(async (file: File) => {
    setDurationError(null)
    setAudioDuration(null)
    setIsValidating(true)

    try {
      const arrayBuffer = await file.arrayBuffer()
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
      const duration = audioBuffer.duration
      await audioContext.close()

      if (duration > MAX_DURATION_SECONDS) {
        const minutes = (duration / 60).toFixed(1)
        const errorMsg = `Audio is ${minutes} minutes long. Please upload a file under 5 minutes.`
        setDurationError(errorMsg)
        setIsValidating(false)
        onDurationError?.(errorMsg)
        // Reset file input so the same file can be re-selected
        if (fileInputRef.current) fileInputRef.current.value = ''
        return
      }

      setAudioDuration(duration)
      setAudioFile(file)
    } catch {
      // If Web Audio API can't decode (e.g. unsupported codec), allow upload
      // and let the backend handle validation
      setAudioDuration(null)
      setAudioFile(file)
    } finally {
      setIsValidating(false)
    }
  }, [setAudioFile, onDurationError])

  const startRecording = useCallback(async () => {
    setRecordingError(null)
    setDurationError(null)

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setRecordingError('Recording is not supported in this browser.')
      return
    }

    if (isProcessing || isValidating) {
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = pickRecorderMimeType()
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)

      streamRef.current = stream
      mediaRecorderRef.current = recorder
      recordedChunksRef.current = []
      setAudioFile(null)
      setAudioDuration(null)
      setRecordingSeconds(0)
      setIsRecording(true)

      timerRef.current = window.setInterval(() => {
        setRecordingSeconds((seconds) => seconds + 1)
      }, 1000)

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data)
        }
      }

      recorder.onerror = () => {
        setRecordingError('Recording failed. Please try again.')
        setIsRecording(false)
        if (timerRef.current !== null) {
          window.clearInterval(timerRef.current)
          timerRef.current = null
        }
        stream.getTracks().forEach((track) => track.stop())
      }

      recorder.onstop = async () => {
        if (timerRef.current !== null) {
          window.clearInterval(timerRef.current)
          timerRef.current = null
        }

        stream.getTracks().forEach((track) => track.stop())
        streamRef.current = null
        setIsRecording(false)

        const recordedBlob = new Blob(recordedChunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        recordedChunksRef.current = []

        if (!recordedBlob.size) {
          setRecordingError('No audio was captured. Please record again.')
          return
        }

        const recordedFile = await transcodeRecordedAudio(recordedBlob)

        await validateAndSetFile(recordedFile)
      }

      recorder.start()
    } catch {
      setRecordingError('Microphone access was denied or is unavailable.')
      setIsRecording(false)
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current)
        timerRef.current = null
      }
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }, [isProcessing, isValidating, validateAndSetFile])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      validateAndSetFile(file)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('audio/')) {
      validateAndSetFile(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const canProcess = (inputMode === 'audio' && audioFile) || (inputMode === 'text' && textInput.trim())

  return (
    <section className="mb-4">
      <h2 className="text-base sm:text-lg font-bold text-accent mb-3 uppercase tracking-wide">1. INPUT</h2>

      <div className="flex flex-col lg:grid lg:grid-cols-12 gap-3">
        {/* Tabs */}
        <div className="flex lg:flex-col gap-2 lg:col-span-2">
          <button
            onClick={() => setInputMode('audio')}
            className={`flex-1 lg:flex-none flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg font-bold text-xs transition-all ${inputMode === 'audio'
                ? 'bg-gradient-to-r from-accent to-accent-hover text-white shadow-lg shadow-accent/30'
                : 'bg-primary-light/50 text-gray-400 border border-gray-700/50 hover:text-white hover:border-accent/30'
              }`}
          >
            <Mic className="w-4 h-4" />
            <span className="hidden sm:inline">Audio Upload</span>
            <span className="sm:hidden">Audio</span>
          </button>
          <button
            onClick={() => setInputMode('text')}
            className={`flex-1 lg:flex-none flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg font-bold text-xs transition-all ${inputMode === 'text'
                ? 'bg-gradient-to-r from-accent to-accent-hover text-white shadow-lg shadow-accent/30'
                : 'bg-primary-light/50 text-gray-400 border border-gray-700/50 hover:text-white hover:border-accent/30'
              }`}
          >
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">Text Input</span>
            <span className="sm:hidden">Text</span>
          </button>
        </div>

        {/* Upload/Text Area */}
        <div className="lg:col-span-7 relative">
          {inputMode === 'audio' ? (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={handleFileChange}
                className="hidden"
              />

              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => {
                  if (!isRecording) {
                    fileInputRef.current?.click()
                  }
                }}
                className="border-2 border-dashed border-accent/20 rounded-xl p-4 text-center cursor-pointer hover:border-accent/40 hover:bg-primary-light/30 transition-all h-[120px] sm:h-[140px] flex flex-col items-center justify-center relative backdrop-blur-sm"
              >
                {audioFile ? (
                  <div className="w-full h-full flex flex-col">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="w-10 h-10 bg-accent/20 rounded-full flex items-center justify-center flex-shrink-0">
                          <Mic className="w-5 h-5 text-accent" />
                        </div>
                        <div className="flex-1 text-left min-w-0">
                          <p className="text-white font-bold text-sm truncate">{audioFile.name}</p>
                          <p className="text-xs text-gray-400 font-medium">
                            {(audioFile.size / 1024 / 1024).toFixed(2)} MB
                            {audioDuration !== null && (
                              <span className="inline-flex items-center gap-1 ml-2">
                                <Clock className="w-3 h-3" />
                                {formatDuration(audioDuration)}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          if (!isProcessing) {
                            onProcess()
                          }
                        }}
                        disabled={isProcessing}
                        className="w-10 h-10 bg-gradient-to-br from-accent to-accent-hover hover:shadow-lg hover:shadow-accent/50 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-full flex items-center justify-center transition-all flex-shrink-0 hover:scale-105"
                      >
                        <ArrowUp className="w-5 h-5 text-white" />
                      </button>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setAudioFile(null)
                        setAudioDuration(null)
                        setDurationError(null)
                      }}
                      className="absolute bottom-3 left-3 p-1.5 rounded-lg hover:bg-error/10 transition-colors group"
                      title="Remove file"
                    >
                      <Trash2 className="w-4 h-4 text-gray-500 group-hover:text-error transition-colors" />
                    </button>
                  </div>
                ) : isValidating ? (
                  <div className="space-y-2">
                    <div className="w-10 h-10 bg-accent/20 rounded-full flex items-center justify-center mx-auto animate-pulse">
                      <Clock className="w-5 h-5 text-accent animate-spin" />
                    </div>
                    <p className="text-white font-bold text-sm">Checking audio duration…</p>
                  </div>
                ) : isRecording ? (
                  <div className="space-y-3 w-full max-w-sm">
                    <div className="w-12 h-12 bg-error/20 rounded-full flex items-center justify-center mx-auto animate-pulse">
                      <CircleDot className="w-5 h-5 text-error animate-pulse" />
                    </div>
                    <div>
                      <p className="text-white font-bold text-sm">Recording in progress</p>
                      <p className="text-xs text-gray-400 font-semibold mt-1">
                        {formatDuration(recordingSeconds)} elapsed
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        stopRecording()
                      }}
                      className="mx-auto inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-error/15 hover:bg-error/20 border border-error/30 text-error text-xs font-bold transition-colors"
                    >
                      <Square className="w-3.5 h-3.5" />
                      Stop recording
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="w-10 h-10 bg-accent/20 rounded-full flex items-center justify-center mx-auto">
                      <Upload className="w-5 h-5 text-accent" />
                    </div>
                    <p className="text-white font-bold text-sm">Click to upload audio</p>
                    <p className="text-xs text-gray-400 font-semibold">or drag and drop</p>
                    <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          fileInputRef.current?.click()
                        }}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-primary-light/70 border border-accent/20 text-xs font-bold text-white hover:border-accent/40 hover:bg-primary-light transition-colors"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        Upload file
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          startRecording()
                        }}
                        disabled={isProcessing}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-accent to-accent-hover text-xs font-bold text-white hover:shadow-lg hover:shadow-accent/30 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                      >
                        <Mic className="w-3.5 h-3.5" />
                        Record audio
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 font-normal hidden sm:block">
                      Supported: mp3, wav, m4a, webm • Max file size: 50MB • Max duration: 5 minutes
                    </p>
                    <p className="text-xs text-gray-500 font-normal sm:hidden">
                      Max: 50MB, 5 min
                    </p>
                  </div>
                )}
              </div>

              {/* Duration validation error banner */}
              {durationError && (
                <div className="mt-2 flex items-start gap-2 bg-error/10 border border-error/30 rounded-lg px-3 py-2 animate-slide-in">
                  <AlertTriangle className="w-4 h-4 text-error flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-error font-semibold">{durationError}</p>
                </div>
              )}
              {recordingError && (
                <div className="mt-2 flex items-start gap-2 bg-error/10 border border-error/30 rounded-lg px-3 py-2 animate-slide-in">
                  <AlertTriangle className="w-4 h-4 text-error flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-error font-semibold">{recordingError}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="relative">
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Type or paste your text here..."
                className="w-full h-[120px] sm:h-[140px] bg-primary-light/30 backdrop-blur-sm border-2 border-accent/20 rounded-xl p-3 pr-12 text-white font-medium text-sm placeholder-gray-500 focus:outline-none focus:border-accent/40 hover:border-accent/30 resize-none transition-all"
              />
              {textInput.trim() && (
                <button
                  onClick={onProcess}
                  disabled={isProcessing}
                  className="absolute bottom-3 right-3 w-10 h-10 bg-gradient-to-br from-accent to-accent-hover hover:shadow-lg hover:shadow-accent/50 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-full flex items-center justify-center transition-all hover:scale-105"
                >
                  <ArrowUp className="w-5 h-5 text-white" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="lg:col-span-3 bg-info/10 backdrop-blur-sm border border-info/30 rounded-xl p-3 flex items-start gap-2 min-h-[80px]">
          <Info className="w-4 h-4 text-info flex-shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="text-white font-bold mb-1">
              Maximum audio length is 5 minutes.
            </p>
            <p className="text-gray-400 font-semibold">
              Files longer than 5 minutes will be rejected.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}