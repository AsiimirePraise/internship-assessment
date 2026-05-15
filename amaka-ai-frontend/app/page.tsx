'use client'

import { useState, useRef, useEffect } from 'react'
import {
  Sun, Moon, ChevronDown, Menu, X, Volume2, VolumeX
} from 'lucide-react'

import Sidebar from '@/components/Sidebar'
import PipelineProgress from '@/components/PipelineProgress'
import InputSection from '@/components/InputSection'
import ResultsGrid from '@/components/ResultsGrid'
import AlertsSection from '@/components/AlertsSection'
import SuccessNotification from '@/components/SuccessNotification'
import HistoryModal from '@/components/HistoryModal'
import ParticlesBackground from '@/components/ParticlesBackground'
import { notificationSounds } from '@/lib/sounds'
import { usePersistedHistory, prependHistoryItem, deleteHistoryItem, clearHistory, type HistoryItem } from '@/lib/usePersistedHistory'

export default function Home() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')
  const [selectedLanguage, setSelectedLanguage] = useState('Luganda')
  const [inputMode, setInputMode] = useState<'audio' | 'text'>('audio')
  const [textInput, setTextInput] = useState('')
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [historyModalOpen, setHistoryModalOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)

  // Pipeline state
  const [currentStep, setCurrentStep] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [summary, setSummary] = useState('')
  const [translation, setTranslation] = useState('')
  const [audioUrl, setAudioUrl] = useState('')
  const [showSuccess, setShowSuccess] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [historyItems, setHistoryItems] = usePersistedHistory()

  // Alerts state
  const [alerts, setAlerts] = useState<Array<{
    id: number
    type: 'error' | 'warning' | 'info'
    title: string
    message: string
  }>>([])

  const languages = ['Luganda', 'Runyankole', 'Ateso', 'Lugbara', 'Acholi']

  // Update sound enabled state in the sounds utility
  useEffect(() => {
    notificationSounds.setEnabled(soundEnabled)
  }, [soundEnabled])

  // Load sound preference from localStorage
  useEffect(() => {
    const savedSoundPref = localStorage.getItem('amaka-sound-enabled')
    if (savedSoundPref !== null) {
      setSoundEnabled(savedSoundPref === 'true')
    }
  }, [])

  // Save sound preference to localStorage
  useEffect(() => {
    localStorage.setItem('amaka-sound-enabled', soundEnabled.toString())
  }, [soundEnabled])

  const handleProcess = async () => {
    if (!textInput && !audioFile) {
      addAlert('error', 'Input Required', 'Please provide either text or audio input.')
      return
    }

    setIsProcessing(true)
    setCurrentStep(1)
    setShowSuccess(false)

    // Clear previous results
    setTranscript('')
    setSummary('')
    setTranslation('')
    setAudioUrl('')

    try {
      const formData = new FormData()
      formData.append('target_language', selectedLanguage)

      if (inputMode === 'audio' && audioFile) {
        formData.append('audio_file', audioFile)
      } else if (inputMode === 'text' && textInput) {
        formData.append('text_input', textInput)
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const response = await fetch(`${apiUrl}/api/pipeline`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        // Extract the backend's specific error detail from the response body
        let detail = `HTTP error! status: ${response.status}`
        try {
          const errorBody = await response.json()
          if (errorBody.detail) {
            detail = errorBody.detail
          }
        } catch {
          // If response body isn't JSON, try text
          try {
            const errorText = await response.text()
            if (errorText) detail = errorText
          } catch { /* use default */ }
        }
        throw new Error(detail)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('No response body')
      }

      let processedTranscript = ''
      let processedSummary = ''
      let processedTranslation = ''
      let processedAudioUrl = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6))

            if (data.step === 'transcript') {
              processedTranscript = data.data
              setTranscript(data.data)
              setCurrentStep(2)
            } else if (data.step === 'summary') {
              processedSummary = data.data
              setSummary(data.data)
              setCurrentStep(3)
            } else if (data.step === 'translation') {
              processedTranslation = data.data
              setTranslation(data.data)
              setCurrentStep(4)
            } else if (data.step === 'audio_url') {
              processedAudioUrl = data.data
              setAudioUrl(data.data)
              setCurrentStep(5)
              setShowSuccess(true)
            } else if (data.step === 'error') {
              throw new Error(data.error)
            }
          }
        }
      }

      // Add to history after successful processing
      const now = new Date()
      const newHistoryItem: HistoryItem = {
        id: Date.now().toString(),
        title: inputMode === 'audio' 
          ? (audioFile?.name || 'Audio Processing') 
          : (textInput.substring(0, 40) + (textInput.length > 40 ? '...' : '')),
        timestamp: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        date: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        language: selectedLanguage,
        type: inputMode,
        data: {
          transcript: processedTranscript,
          summary: processedSummary,
          translation: processedTranslation,
          audioUrl: processedAudioUrl,
        }
      }
      prependHistoryItem(setHistoryItems, newHistoryItem)

    } catch (error: any) {
      console.error('Pipeline error:', error)
      addAlert('error', 'Processing Failed', error.message || 'An error occurred while processing your request.')
      setCurrentStep(0)
    } finally {
      setIsProcessing(false)
    }
  }

  const addAlert = (type: 'error' | 'warning' | 'info', title: string, message: string) => {
    const newAlert = {
      id: Date.now(),
      type,
      title,
      message,
    }
    setAlerts(prev => [...prev, newAlert])
  }

  const removeAlert = (id: number) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id))
  }

  const handleDeleteHistoryItem = (id: string) => {
    deleteHistoryItem(setHistoryItems, id)
    addAlert('info', 'Deleted', 'History item deleted successfully.')
  }

  const handleShareHistoryItem = (id: string) => {
    const item = historyItems.find(h => h.id === id)
    if (item) {
      addAlert('info', 'Share', `Sharing: ${item.title}`)
      if (navigator.share) {
        navigator.share({
          title: 'Amaka AI Processing',
          text: `${item.title} - Processed on ${item.date} at ${item.timestamp}`,
        }).catch(err => console.log('Share failed:', err))
      }
    }
  }

  const handleClearAllHistory = () => {
    clearHistory(setHistoryItems)
    setHistoryModalOpen(false)
    addAlert('info', 'Cleared', 'All history has been cleared.')
  }

  const handleSelectHistoryItem = (id: string) => {
    const item = historyItems.find(h => h.id === id)
    if (item) {
      setTranscript(item.data.transcript || '')
      setSummary(item.data.summary || '')
      setTranslation(item.data.translation || '')
      setAudioUrl(item.data.audioUrl || '')
      setSelectedLanguage(item.language)
      setInputMode(item.type)
      addAlert('info', 'Loaded', `Loaded: ${item.title}`)
      setMobileMenuOpen(false)
    }
  }

  const toggleSound = () => {
    const newSoundState = !soundEnabled
    setSoundEnabled(newSoundState)
    
    // Play a test sound when enabling
    if (newSoundState) {
      setTimeout(() => {
        notificationSounds.info()
      }, 100)
    }
  }

  return (
    <div className="flex h-screen bg-primary text-white overflow-hidden relative">
      {/* Particles Background */}
      <ParticlesBackground />

      {/* Sidebar - Hidden on mobile, visible on md+ */}
      <div className="hidden md:block">
        <Sidebar 
          isCollapsed={sidebarCollapsed} 
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          onHistoryClick={() => setHistoryModalOpen(true)}
          historyItems={historyItems}
          onSelectHistoryItem={handleSelectHistoryItem}
          onDeleteHistoryItem={handleDeleteHistoryItem}
        />
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="absolute left-0 top-0 bottom-0 w-80 animate-slide-in">
            <Sidebar 
              isCollapsed={false} 
              onToggle={() => setMobileMenuOpen(false)}
              onHistoryClick={() => {
                setHistoryModalOpen(true)
                setMobileMenuOpen(false)
              }}
              historyItems={historyItems}
              onSelectHistoryItem={handleSelectHistoryItem}
              onDeleteHistoryItem={handleDeleteHistoryItem}
            />
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-7xl mx-auto p-3 sm:p-4 md:p-6">
          {/* Header */}
          <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4 sm:mb-6">
            <div className="flex items-start gap-3">
              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="md:hidden p-2 rounded-lg bg-primary-light/50 border border-accent/20 hover:border-accent transition-colors mt-1"
              >
                <Menu className="w-5 h-5 text-accent" />
              </button>
              
              <div className="flex-1">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-display font-bold mb-1 tracking-tight">
                  Amaka AI Voice & Text Assistant
                </h1>
                <p className="text-gray-400 text-xs sm:text-sm font-medium">
                  Powered by Sunflower LLM & Sunbird AI API
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
              {/* Language Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm text-gray-400 font-semibold">Language</span>
                <div className="relative">
                  <select
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                    className="appearance-none bg-primary-light/50 border border-accent/20 rounded-lg px-3 sm:px-4 py-1.5 sm:py-2 pr-8 sm:pr-10 text-sm font-semibold text-white focus:outline-none focus:border-accent cursor-pointer hover:bg-primary-light/70 transition-all"
                  >
                    {languages.map(lang => (
                      <option key={lang} value={lang}>{lang}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 w-3 h-3 sm:w-4 sm:h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Sound Toggle */}
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm text-gray-400 font-semibold">Sound</span>
                <button
                  onClick={toggleSound}
                  className="p-1.5 sm:p-2 rounded-lg bg-primary-light/50 border border-accent/20 hover:border-accent hover:bg-primary-light/70 transition-all"
                  title={soundEnabled ? 'Mute notifications' : 'Enable notification sounds'}
                >
                  {soundEnabled ? (
                    <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 text-accent" />
                  ) : (
                    <VolumeX className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                  )}
                </button>
              </div>

              {/* Theme Toggle */}
              {/* <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm text-gray-400 font-semibold">Theme</span>
                <button
                  onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                  className="p-1.5 sm:p-2 rounded-lg bg-primary-light/50 border border-accent/20 hover:border-accent hover:bg-primary-light/70 transition-all"
                >
                  {theme === 'light' ? (
                    <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-accent" />
                  ) : (
                    <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-accent" />
                  )}
                </button>
              </div> */}
            </div>
          </header>

          {/* Pipeline Progress */}
          <PipelineProgress currentStep={currentStep} />

          {/* Success Notification */}
          {showSuccess && (
            <SuccessNotification onClose={() => setShowSuccess(false)} />
          )}

          {/* Input Section */}
          <InputSection
            inputMode={inputMode}
            setInputMode={setInputMode}
            textInput={textInput}
            setTextInput={setTextInput}
            audioFile={audioFile}
            setAudioFile={setAudioFile}
            isProcessing={isProcessing}
            onProcess={handleProcess}
            onDurationError={(msg) => addAlert('error', 'Audio Too Long', msg)}
          />

          {/* Results Grid */}
          <ResultsGrid
            transcript={transcript}
            summary={summary}
            translation={translation}
            audioUrl={audioUrl}
            targetLanguage={selectedLanguage}
            showTranscript={inputMode === 'audio'}
            isProcessing={isProcessing}
          />

          {/* Alerts & Messages Section */}
          <AlertsSection alerts={alerts} onRemoveAlert={removeAlert} />
          {alerts.length === 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-base sm:text-lg font-bold text-warning uppercase tracking-wide">ALERTS & MESSAGES</h3>
              </div>
              <div className="bg-primary-light/30 backdrop-blur-sm rounded-xl border border-gray-700/50 p-3 sm:p-4">
                <p className="text-xs sm:text-sm text-gray-400 text-center font-medium">No alerts at the moment. All systems operational.</p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* History Modal */}
      <HistoryModal
        isOpen={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        historyItems={historyItems}
        onDeleteItem={handleDeleteHistoryItem}
        onShareItem={handleShareHistoryItem}
        onClearAll={handleClearAllHistory}
        onSelectItem={handleSelectHistoryItem}
      />
    </div>
  )
}