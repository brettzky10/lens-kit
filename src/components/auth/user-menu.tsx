"use client"

import * as React from "react"
import Link from "next/link"
import { useTheme } from "next-themes"
import { Check, ChevronRight, Monitor, Moon, Sun } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
// Your ProgressCircle (react-aria-components) — adjust the path to wherever you saved it
import { ProgressCircle } from "@/components/ui/progress-circle"
import { cn } from "@/lib/utils"

interface UserMenuProps {
  user: {
    name: string
    image?: string | null
  }
  /** Credits allotted for the current month */
  totalCredits: number
  /** Credits left this month */
  remainingCredits: number
  onUpgrade?: () => void
  onSignOut?: () => void
  className?: string
}

const nf = new Intl.NumberFormat("en-US")

const menuLinks = [
  { label: "Settings", href: "/settings" },
  { label: "Workspace settings", href: "/workspace/settings" },
  { label: "Subscription", href: "/billing" },
  { label: "Pronunciation dictionaries", href: "/pronunciation-dictionaries" },
]

const themes = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
}

export function UserMenu({
  user,
  totalCredits,
  remainingCredits,
  onUpgrade,
  onSignOut,
  className,
}: UserMenuProps) {
  const { theme, setTheme } = useTheme()

  // Credits USED as a percent of this cycle's total
  // (e.g. 300k available, 3k spent -> 1%).
  const percent =
    totalCredits > 0
      ? Math.min(100, Math.max(0, ((totalCredits - remainingCredits) / totalCredits) * 100))
      : 0

  return (
    <DropdownMenu>
      <DropdownMenuTrigger aria-label="Open user menu"
          className={cn(
            "relative grid size-11 shrink-0 place-items-center rounded-full outline-none",
            "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            className
          )}>
        
          <ProgressCircle
            aria-label="Credits used this month"
            value={percent}
            minValue={0}
            maxValue={100}
            className="absolute inset-0 size-11 text-foreground"
          />
          <Avatar className="size-8">
            {user.image ? <AvatarImage src={user.image} alt={user.name} /> : null}
            <AvatarFallback className="text-xs">{initials(user.name)}</AvatarFallback>
          </Avatar>
        
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" sideOffset={8} className="w-72 p-2">
        {/* Credits card */}
        <div className="rounded-xl border bg-muted/50 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ProgressCircle
                aria-label="Credits used this month"
                value={percent}
                minValue={0}
                maxValue={100}
                className="size-5 text-foreground"
              />
              <span className="text-sm font-medium">Credits</span>
            </div>
            <Button size="sm" className="h-7 rounded-lg px-3" onClick={onUpgrade}>
              Upgrade
            </Button>
          </div>

          <dl className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Total</dt>
              <dd className="tabular-nums">{nf.format(totalCredits)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Remaining</dt>
              <dd className="tabular-nums">{nf.format(remainingCredits)}</dd>
            </div>
          </dl>
        </div>

        <div className="mt-2">
          {menuLinks.map((item) => (
            <DropdownMenuItem key={item.href}  className="px-2 py-2">
              <Link href={item.href}>{item.label}</Link>
            </DropdownMenuItem>
          ))}

          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="px-2 py-2 [&>svg:last-child]:hidden">
              <span className="flex-1">Theme</span>
              <ChevronRight className="size-4 text-muted-foreground" />
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-40">
              {themes.map(({ value, label, icon: Icon }) => (
                <DropdownMenuItem key={value} onSelect={() => setTheme(value)}>
                  <Icon className="mr-2 size-4" />
                  <span className="flex-1">{label}</span>
                  {theme === value ? <Check className="size-4" /> : null}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          {onSignOut ? (
            <DropdownMenuItem className="px-2 py-2" onSelect={onSignOut}>
              Sign out
            </DropdownMenuItem>
          ) : null}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/* Usage:

<UserMenu
  user={{ name: "Jane Doe", image: session.user.image }}
  totalCredits={33_010_000}
  remainingCredits={32_967_350}
  onUpgrade={() => router.push("/subscription")}
/>

*/
