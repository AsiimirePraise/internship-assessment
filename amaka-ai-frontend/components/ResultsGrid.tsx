'use client'

import { Copy, Play, Download, Bookmark, Share2, Volume2, Pause } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { gsap } from 'gsap'

/* Shimmer skeleton  */
function ProcessingSkeleton({ lines = 4 }: { lines?: number }) {
  return (
    <div className="w-full space-y-2.5 px-1">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="shimmer-line h-2.5"
          style={{
            width: i === lines - 1 ? '60%' : i % 3 === 0 ? '85%' : '100%',
            animationDelay: `${i * 0.15}s`,
          }}
        />
      ))}
    </div>
  )
}

/* Copy button */
function CopyButton({ text, disabled }: { text: string; disabled: boolean }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    if (!text) return
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <button
      onClick={handleCopy}
      disabled={disabled}
      title={copied ? 'Copied!' : 'Copy'}
      className={`p-1.5 rounded-lg transition-all duration-200 ${disabled
          ? 'cursor-not-allowed opacity-40'
          : 'hover:bg-primary-light/50 cursor-pointer'
        }`}
    >
      {copied ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-3.5 h-3.5 text-accent"
        >
          <path d="M16 1H4a2 2 0 0 0-2 2v14h2V3h12V1zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 16H8V7h11v14z" />
        </svg>
      ) : (
        <Copy
          className={`w-3.5 h-3.5 transition-colors ${disabled ? 'text-gray-600' : 'text-gray-400 hover:text-accent'
            }`}
        />
      )}
    </button>
  )
}

/* Card wrapper with glassmorphism */
function AnimatedCard({
  children,
  className = '',
  delay = 0
}: {
  children: React.ReactNode
  className?: string
  delay?: number
}) {
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Inject styles once
    if (!document.getElementById('result-card-styles')) {
      const style = document.createElement('style')
      style.id = 'result-card-styles'
      style.textContent = `
        @keyframes shimmer {
          0%   { background-position: -400px 0; }
          100% { background-position:  400px 0; }
        }
        .shimmer-line {
          background: linear-gradient(
            90deg,
            rgba(255,255,255,0.03) 0%,
            rgba(255,165,0,0.12)   40%,
            rgba(255,165,0,0.06)   60%,
            rgba(255,255,255,0.03) 100%
          );
          background-size: 400px 100%;
          animation: shimmer 1.8s ease-in-out infinite;
          border-radius: 4px;
        }

        .result-card {
          position: relative;
          border-radius: 0.75rem;
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          background: rgba(28, 26, 74, 0.4);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 140, 0, 0.15);
        }
        .result-card:hover {
          transform: translateY(-4px);
          border-color: rgba(255, 140, 0, 0.3);
          box-shadow: 0 10px 30px rgba(255, 140, 0, 0.1);
        }
      `
      document.head.appendChild(style)
    }

    // GSAP entrance animation
    if (cardRef.current) {
      gsap.fromTo(
        cardRef.current,
        {
          opacity: 0,
          y: 30,
          scale: 0.95,
        },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.6,
          delay: delay,
          ease: 'power3.out',
        }
      )
    }
  }, [delay])

  return (
    <div ref={cardRef} className={`result-card ${className}`}>
      {children}
    </div>
  )
}

/* Animated text content */
function AnimatedText({ text, delay = 0 }: { text: string; delay?: number }) {
  const textRef = useRef<HTMLParagraphElement>(null)
  const [displayedText, setDisplayedText] = useState('')

  useEffect(() => {
    if (!text) return

    setDisplayedText('')

    gsap.fromTo(
      { value: 0 },
      { value: text.length },
      {
        duration: 1.5,
        delay: delay,
        ease: 'none',
        onUpdate: function () {
          const currentLength = Math.floor(this.targets()[0].value)
          setDisplayedText(text.substring(0, currentLength))
        }
      }
    )

    if (textRef.current) {
      gsap.fromTo(
        textRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.5, delay: delay }
      )
    }
  }, [text, delay])

  return (
    <p ref={textRef} className="text-xs text-white leading-relaxed font-normal">
      {displayedText}
    </p>
  )
}

interface ResultsGridProps {
  transcript: string
  summary: string
  translation: string
  audioUrl: string
  targetLanguage: string
  showTranscript: boolean
  isProcessing: boolean
}

export default function ResultsGrid({
  transcript,
  summary,
  translation,
  audioUrl,
  targetLanguage,
  showTranscript,
  isProcessing,
}: ResultsGridProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const onTime = () => setCurrentTime(audio.currentTime)
    const onMeta = () => setDuration(audio.duration)
    const onEnd = () => { setIsPlaying(false); setCurrentTime(0) }
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('loadedmetadata', onMeta)
    audio.addEventListener('ended', onEnd)
    return () => {
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('loadedmetadata', onMeta)
      audio.removeEventListener('ended', onEnd)
    }
  }, [audioUrl])

  const togglePlay = () => {
    if (!audioRef.current) return
    if (isPlaying) { audioRef.current.pause() } else { audioRef.current.play() }
    setIsPlaying(!isPlaying)
  }

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current) return
    const rect = e.currentTarget.getBoundingClientRect()
    audioRef.current.currentTime = ((e.clientX - rect.left) / rect.width) * duration
  }

  const fmt = (t: number) =>
    `${Math.floor(t / 60).toString().padStart(2, '0')}:${Math.floor(t % 60).toString().padStart(2, '0')}`

  const words = (t: string) =>
    !t?.trim() ? 0 : t.split(/\s+/).filter(w => w.length > 0).length

  const handleDownload = () => {
    if (!audioUrl) return
    const a = document.createElement('a')
    a.href = audioUrl
    a.download = `synthesised-speech-${targetLanguage}.mp3`
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
  }

  const handleSave = () => {
    if (!audioUrl) return
    const saved = JSON.parse(localStorage.getItem('amaka-saved-audio') || '[]')
    saved.push({ url: audioUrl, language: targetLanguage, savedAt: new Date().toISOString() })
    localStorage.setItem('amaka-saved-audio', JSON.stringify(saved))
    alert('Audio saved to browser storage!')
  }

  const handleShare = async () => {
    if (!audioUrl) return
    if (navigator.share) {
      try { await navigator.share({ title: 'Amaka AI Synthesised Speech', text: `Translated summary in ${targetLanguage}`, url: audioUrl }) }
      catch { await navigator.clipboard.writeText(audioUrl); alert('Audio URL copied to clipboard!') }
    } else {
      await navigator.clipboard.writeText(audioUrl); alert('Audio URL copied to clipboard!')
    }
  }

  const innerCard = 'rounded-xl p-3 sm:p-4 flex flex-col h-[280px] sm:h-[320px]'

  return (
    <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">

      {/* Transcript */}
      {showTranscript && (
        <AnimatedCard delay={0.1}>
          <div className={innerCard}>
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-white/10">              <h3 className="text-xs sm:text-sm font-bold text-accent uppercase tracking-wide">
              2. TRANSCRIPT <span className="text-xs text-gray-400 normal-case hidden sm:inline">(Audio Only)</span>
            </h3>
              <CopyButton text={transcript} disabled={!transcript} />
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar mb-3">
              {transcript ? (
                <AnimatedText text={transcript} delay={0.3} />
              ) : isProcessing ? (
                <div className="h-full flex items-center"><ProcessingSkeleton lines={5} /></div>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500 text-xs text-center px-2 font-medium">
                  Transcript will appear here after processing audio
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 sm:gap-3 text-xs text-gray-500 pt-3 border-t border-gray-700/50">
              <span className="font-semibold">Words: {words(transcript)}</span><span>•</span><span className="hidden sm:inline">Language: English</span>
            </div>
          </div>
        </AnimatedCard>
      )}

      {/* Summary */}
      <AnimatedCard delay={showTranscript ? 0.2 : 0.1}>
        <div className={innerCard}>
          <div className="flex items-center justify-between mb-3 pb-3 border-b border-white/10">            <h3 className="text-xs sm:text-sm font-bold text-accent uppercase tracking-wide">3. SUMMARY</h3>
            <CopyButton text={summary} disabled={!summary} />
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar mb-3">
            {summary ? (
              <AnimatedText text={summary} delay={0.3} />
            ) : isProcessing ? (
              <div className="h-full flex items-center"><ProcessingSkeleton lines={4} /></div>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500 text-xs text-center px-2 font-medium">
                Summary will appear here after processing
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 sm:gap-3 text-xs text-gray-500 pt-3 border-t border-gray-700/50">
            <span className="font-semibold">Words: {words(summary)}</span><span>•</span><span className="hidden sm:inline">Language: English</span>
          </div>
        </div>
      </AnimatedCard>

      {/* Translated Summary */}
      <AnimatedCard delay={showTranscript ? 0.3 : 0.2}>
        <div className={innerCard}>
          <div className="flex items-center justify-between mb-3 pb-3 border-b border-white/10">            <h3 className="text-xs sm:text-sm font-bold text-accent uppercase tracking-wide">
            4. TRANSLATED SUMMARY <span className="text-xs text-gray-400 normal-case">({targetLanguage})</span>
          </h3>
            <CopyButton text={translation} disabled={!translation} />
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar mb-3">
            {translation ? (
              <AnimatedText text={translation} delay={0.3} />
            ) : isProcessing ? (
              <div className="h-full flex items-center"><ProcessingSkeleton lines={4} /></div>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500 text-xs text-center px-2 font-medium">
                Translation will appear here after processing
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 sm:gap-3 text-xs text-gray-500 pt-3 border-t border-gray-700/50">
            <span className="font-semibold">Words: {words(translation)}</span><span>•</span><span className="hidden sm:inline">Language: {targetLanguage}</span>
          </div>
        </div>
      </AnimatedCard>

      {/* Synthesised Speech */}
      <AnimatedCard delay={showTranscript ? 0.4 : 0.3}>
        <div className={innerCard}>
          <div className="flex items-center justify-between mb-3 pb-3 border-b border-white/10">            <h3 className="text-xs sm:text-sm font-bold text-accent uppercase tracking-wide">
            5. SYNTHESISED SPEECH <span className="text-xs text-gray-400 normal-case">({targetLanguage})</span>
          </h3>
            <CopyButton text={audioUrl} disabled={!audioUrl} />
          </div>

          <div className="flex-1 flex flex-col mb-3">
            {audioUrl ? (
              <>
                <p className="text-xs text-white mb-3 font-medium">Listen to the translated summary</p>
                <div className="flex-1 flex flex-col justify-center space-y-3">
                  <div className="flex justify-center">
                    <button
                      onClick={togglePlay}
                      className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-accent to-accent-hover rounded-full flex items-center justify-center transition-all shadow-lg hover:shadow-accent/50 hover:scale-105"
                    >
                      {isPlaying
                        ? <Pause className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                        : <Play className="w-6 h-6 sm:w-7 sm:h-7 text-white ml-0.5" />}
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    <div
                      onClick={handleSeek}
                      className="h-1.5 bg-primary-dark/50 rounded-full cursor-pointer relative overflow-hidden"
                    >
                      <div
                        className="h-full bg-gradient-to-r from-accent to-accent-hover rounded-full transition-all"
                        style={{ width: `${(currentTime / duration) * 100}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-400 font-semibold">
                      <span>{fmt(currentTime)}</span>
                      <span>{fmt(duration)}</span>
                    </div>
                  </div>
                </div>
                <audio ref={audioRef} src={audioUrl} className="hidden" />
              </>
            ) : isProcessing ? (
              <div className="flex-1 flex flex-col justify-center space-y-4 px-1">
                <div className="flex justify-center">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full shimmer-line" />
                </div>
                <ProcessingSkeleton lines={2} />
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500 text-xs text-center px-2 font-medium">
                Audio will be generated here after processing
              </div>
            )}
          </div>

          <div className="space-y-2 pt-3 border-t border-gray-700/50">
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { label: 'Download', icon: <Download className="w-3 h-3" />, fn: handleDownload },
                { label: 'Save', icon: <Bookmark className="w-3 h-3" />, fn: handleSave },
                { label: 'Share', icon: <Share2 className="w-3 h-3" />, fn: handleShare },
              ].map(({ label, icon, fn }) => (
                <button
                  key={label}
                  disabled={!audioUrl}
                  onClick={fn}
                  className={`flex items-center justify-center gap-1 px-2 py-2 border rounded-lg text-xs font-bold transition-all ${audioUrl
                      ? 'border-accent/30 text-accent hover:bg-accent/10 hover:border-accent/50 cursor-pointer'
                      : 'border-gray-700/50 text-gray-600 cursor-not-allowed opacity-40'
                    }`}
                >
                  {icon}
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Volume2 className="w-3.5 h-3.5 text-accent" />
              <span className="truncate font-semibold">Voice: Female ({targetLanguage})</span>
            </div>
          </div>
        </div>
      </AnimatedCard>

    </div>
  )
}