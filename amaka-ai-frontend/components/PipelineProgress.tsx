'use client'

import { Mic, FileText, Sparkles, Globe, Volume2 } from 'lucide-react'

interface PipelineProgressProps {
  currentStep: number
}

export default function PipelineProgress({ currentStep }: PipelineProgressProps) {
  const steps = [
    { id: 1, icon: Mic, label: 'Input' },
    { id: 2, icon: FileText, label: 'Transcribe' },
    { id: 3, icon: Sparkles, label: 'Summarise' },
    { id: 4, icon: Globe, label: 'Translate' },
    { id: 5, icon: Volume2, label: 'Synthesise' },
  ]

  return (
    <div className="mb-1 py-2 overflow-x-auto custom-scrollbar">
      <div className="flex items-center justify-start sm:justify-center gap-1 min-w-max px-2">
        {steps.map((step, index) => {
          const Icon = step.icon
          const isActive = currentStep >= step.id

          return (
            <div key={step.id} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center border-2 transition-all ${isActive ? 'bg-accent border-accent' : 'bg-transparent border-gray-600'}`}>
                  <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${isActive ? 'text-white' : 'text-gray-600'}`} />
                </div>
                <div className={`mt-1 text-xs font-semibold whitespace-nowrap ${isActive ? 'text-accent' : 'text-gray-500'}`}>
                  <span className="hidden sm:inline">{step.id} {step.label}</span>
                  <span className="sm:hidden">{step.id}</span>
                </div>
              </div>
              {index < steps.length - 1 && (
                <div className="w-8 sm:w-16 mx-0.5 border-t-2 border-dashed border-accent mb-4" />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}