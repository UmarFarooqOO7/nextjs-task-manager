import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "./components/theme-provider"
import { ThemeToggle } from "./components/theme-toggle"
import { PresenceAvatars } from "./components/presence-avatars"
import { TaskRealtime } from "./components/task-realtime"
import { ActivityFeedButton } from "./components/activity-feed"
import { CommandPalette } from "./components/command-palette"
import { KeyboardShortcuts } from "./components/keyboard-shortcuts"
import { Toaster } from "sonner"
import { auth, signOut } from "@/lib/auth"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { FolderOpen, LogOut } from "lucide-react"

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
  description: "AI-native project & task manager",
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const session = await auth()
  const user = session?.user

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background`}>
        <ThemeProvider>
          <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
            <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
              <div className="flex items-center gap-3">
                <Link href="/projects" className="text-sm font-semibold tracking-tight">
                  Task Manager
                </Link>
                {user && (
                  <Link
                    href="/projects"
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <FolderOpen className="size-3.5" />
                    Projects
                  </Link>
                )}
              </div>
              <div className="flex items-center gap-2">
                <PresenceAvatars />
                <ActivityFeedButton />
                <KeyboardShortcuts />
                <ThemeToggle />
                {user && (
                  <div className="flex items-center gap-2 ml-1 pl-2 border-l">
                    {user.image && (
                      <Image
                        src={user.image}
                        alt={user.name ?? ""}
                        width={24}
                        height={24}
                        className="rounded-full"
                      />
                    )}
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                      {user.name}
                    </span>
                    <form
                      action={async () => {
                        "use server"
                        await signOut({ redirectTo: "/login" })
                      }}
                    >
                      <Button variant="ghost" size="icon" type="submit" className="size-7" aria-label="Sign out">
                        <LogOut className="size-3.5" />
                      </Button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          </header>
          <main>{children}</main>
          <TaskRealtime userName={user?.name ?? undefined} />
          <CommandPalette />
          <Toaster position="bottom-right" richColors />
        </ThemeProvider>
      </body>
    </html>
  )
}
