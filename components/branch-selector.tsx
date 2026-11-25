"use client"

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useState } from "react"
import type { Branch } from "@/lib/auth/types"
import { IconCheck, IconChevronsUpDown } from "@/components/ui/app-icons"
import { safeText } from "@/lib/utils/safe-display"

interface BranchSelectorProps {
  branches: Branch[]
  currentBranch: Branch | null
  onBranchChange: (branch: Branch) => void
}

export function BranchSelector({
  branches,
  currentBranch,
  onBranchChange,
}: BranchSelectorProps) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          className="w-full flex items-center justify-between bg-[var(--muted-bg)]/70 hover:bg-[var(--brand-soft)] text-[var(--text-2)] hover:text-[var(--brand)] py-1.5 px-2.5 rounded-[10px] text-xs font-medium transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2 truncate">
            <span className="size-2 rounded-full shrink-0 bg-[var(--brand)]" />
            <span className="truncate">
              {currentBranch ? safeText(currentBranch.name, "Şube") : "Şube seçin..."}
            </span>
          </div>
          <IconChevronsUpDown className="ml-2 size-3.5 shrink-0 text-[var(--text-muted)]" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[248px] p-0 rounded-[16px] overflow-hidden bg-[var(--bg)] text-[var(--text)] border border-[var(--line)] shadow-[var(--shadow-card)]"
        align="start"
      >
        <Command>
          <CommandInput placeholder="Şube ara..." className="text-xs" />
          <CommandList>
            <CommandEmpty className="py-3 text-center text-xs text-[var(--text-muted)]">
              Şube bulunamadı.
            </CommandEmpty>
            <CommandGroup>
              {branches.map((branch) => (
                <CommandItem
                  key={branch.id}
                  value={branch.name}
                  onSelect={() => {
                    onBranchChange(branch)
                    setOpen(false)
                  }}
                  className="text-xs cursor-pointer"
                >
                  <IconCheck
                    className={`mr-1.5 size-3.5 text-[var(--brand)] ${ currentBranch?.id === branch.id ? "opacity-100" : "opacity-0" }`}
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="font-medium text-[var(--text)] truncate">
                      {safeText(branch.name, "Şube")}
                    </span>
                    <span className="text-[11px] font-mono text-[var(--text-muted)]">
                      {safeText(branch.code, "HQ")}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
