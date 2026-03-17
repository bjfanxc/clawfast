import '@/styles/globals.css'
import type { Metadata } from 'next'
import TitleBar from '@/components/shared/TitleBar'
import GlobalToast from '@/components/shared/GlobalToast'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { I18nProvider } from '@/components/providers/I18nProvider'

export const metadata: Metadata = {
  title: 'ClawFast',
  description: 'Nextron App',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const isDev = process.env.NODE_ENV !== 'production'
  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    isDev ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'" : "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self' http://localhost:* ws://localhost:* app:",
    "worker-src 'self' blob:",
  ].join('; ')

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta httpEquiv="Content-Security-Policy" content={csp} />
      </head>
      <body className="flex h-screen min-h-0 flex-col overflow-hidden">
        <I18nProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <TitleBar />
            <GlobalToast />
            <main className="flex min-h-0 flex-1 overflow-hidden px-4 pt-4 pb-4">
              {children}
            </main>
          </ThemeProvider>
        </I18nProvider>
      </body>
    </html>
  )
}
