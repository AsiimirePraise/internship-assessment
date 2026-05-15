class NotificationSounds {
  private audioContext: AudioContext | null = null
  private enabled: boolean = true

  setEnabled(enabled: boolean) {
    this.enabled = enabled
  }

  private getAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    return this.audioContext
  }

  private playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.3) {
    if (!this.enabled) return

    const ctx = this.getAudioContext()
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    oscillator.frequency.value = frequency
    oscillator.type = type

    gainNode.gain.setValueAtTime(volume, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration)

    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + duration)
  }

  // Success sound - two ascending tones (cheerful)
  success() {
    if (!this.enabled) return

    const ctx = this.getAudioContext()
    const now = ctx.currentTime

    this.playToneAtTime(523.25, 0.1, now, 0.25)
    this.playToneAtTime(659.25, 0.15, now + 0.08, 0.25)
    this.playToneAtTime(783.99, 0.2, now + 0.16, 0.2)
  }

  // Error sound - descending tones (alert)
  error() {
    if (!this.enabled) return

    const ctx = this.getAudioContext()
    const now = ctx.currentTime

    this.playToneAtTime(600, 0.1, now, 0.3, 'square')
    this.playToneAtTime(400, 0.15, now + 0.08, 0.25, 'square')
  }

  // Warning sound - single attention tone
  warning() {
    if (!this.enabled) return

    const ctx = this.getAudioContext()
    const now = ctx.currentTime

    this.playToneAtTime(550, 0.08, now, 0.25)
    this.playToneAtTime(550, 0.08, now + 0.12, 0.25)
  }

  // Info sound - gentle single tone
  info() {
    if (!this.enabled) return

    const ctx = this.getAudioContext()
    const now = ctx.currentTime

    this.playToneAtTime(440, 0.15, now, 0.2)
  }

  private playToneAtTime(
    frequency: number,
    duration: number,
    startTime: number,
    volume: number = 0.3,
    type: OscillatorType = 'sine'
  ) {
    if (!this.enabled) return

    const ctx = this.getAudioContext()
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    oscillator.frequency.value = frequency
    oscillator.type = type

    gainNode.gain.setValueAtTime(volume, startTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration)

    oscillator.start(startTime)
    oscillator.stop(startTime + duration)
  }

  //  celebration
  complete() {
    if (!this.enabled) return

    const ctx = this.getAudioContext()
    const now = ctx.currentTime

    this.playToneAtTime(523.25, 0.1, now, 0.2)
    this.playToneAtTime(659.25, 0.1, now + 0.06, 0.2)
    this.playToneAtTime(783.99, 0.1, now + 0.12, 0.2)
    this.playToneAtTime(1046.5, 0.2, now + 0.18, 0.25)
  }
}

export const notificationSounds = new NotificationSounds()