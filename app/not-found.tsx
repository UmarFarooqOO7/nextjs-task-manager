import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="text-6xl font-bold tracking-tight text-muted-foreground">404</h1>
      <h2 className="mt-2 text-lg font-semibold">Page not found</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        The page you&apos;re looking for doesn&apos;t exist or you don&apos;t have access.
      </p>
      <Button asChild variant="outline" size="sm" className="mt-6">
        <Link href="/projects">Back to Projects</Link>
      </Button>
    </div>
  )
}
