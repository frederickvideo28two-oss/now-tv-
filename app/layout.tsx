import type { Metadata, Viewport } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'

const geistSans = Geist({
  subsets: ['latin'],
  variable: '--font-geist-sans',
})

export const metadata: Metadata = {
  title: 'Now TV · Reproductor IPTV',
  description:
    'Reproductor IPTV en el navegador para listas M3U / M3U8: carga por URL o archivo, parrilla de canales con búsqueda y reproducción HLS adaptativa.',
  generator: 'v0.app',
}

export const viewport: Viewport = {
  themeColor: '#080b12',
  colorScheme: 'dark',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className={`${geistSans.variable} bg-background`}>
      <body className="font-sans antialiased text-foreground">{children}</body>
    </html>
  )
}
