import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "./components/theme-provider"
import { ThemeToggle } from "./components/theme-toggle"
import { PresencePill } from "./components/presence-pill"
import { TaskRealtime } from "./components/task-realtime"
import { Toaster } from "sonner"
import Link from "next/link"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Task Manager",
  description: "Simple task CRUD with Next.js App Router",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background`}>
        <ThemeProvider>
          <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
            <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
              <Link href="/tasks" className="text-sm font-semibold tracking-tight">
                Task Manager
              </Link>
              <div className="flex items-center gap-2">
                <PresencePill />
                <ThemeToggle />
              </div>
            </div>
          </header>
          <main>{children}</main>
          <TaskRealtime />
          <Toaster position="bottom-right" richColors />
        </ThemeProvider>
      </body>
    </html>
  )
}
