import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Amaka AI - Voice & Text Assistant',
  description: 'Powered by Sunflower LLM & Sunbird AI API',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
