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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { FolderOpen, LogOut, Settings, Zap } from "lucide-react"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Taskflow",
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
            <div className="mx-auto flex h-12 max-w-7xl items-center justify-between px-4">
              <div className="flex items-center gap-4">
                <Link href="/projects" className="flex items-center gap-2 font-semibold tracking-tight">
                  <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
                    <Zap className="size-3.5" />
                  </div>
                  <span className="hidden sm:inline">Taskflow</span>
                </Link>
                {user && (
                  <nav className="flex items-center gap-1">
                    <Link
                      href="/projects"
                      className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                    >
                      <FolderOpen className="size-3.5" aria-hidden="true" />
                      Projects
                    </Link>
                  </nav>
                )}
              </div>
              <div className="flex items-center gap-1">
                <PresenceAvatars />
                <ActivityFeedButton />
                <KeyboardShortcuts />
                <ThemeToggle />
                {user && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-8 rounded-full ml-1" aria-label="User menu">
                        {user.image ? (
                          <Image
                            src={user.image}
                            alt={user.name ?? ""}
                            width={28}
                            height={28}
                            className="rounded-full"
                          />
                        ) : (
                          <span className="flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">
                            {(user.name ?? "?")[0].toUpperCase()}
                          </span>
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <div className="px-2 py-1.5">
                        <p className="text-sm font-medium">{user.name}</p>
                        {user.email && (
                          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        )}
                      </div>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href="/projects" className="cursor-pointer">
                          <FolderOpen className="size-3.5" />
                          Projects
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <form
                        action={async () => {
                          "use server"
                          await signOut({ redirectTo: "/login" })
                        }}
                      >
                        <DropdownMenuItem asChild>
                          <button type="submit" className="w-full cursor-pointer">
                            <LogOut className="size-3.5" />
                            Sign out
                          </button>
                        </DropdownMenuItem>
                      </form>
                    </DropdownMenuContent>
                  </DropdownMenu>
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
