"use client"

import { Check, ChevronsUpDown } from "lucide-react"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useState } from "react"
import type { Branch } from "@/lib/auth/types"

interface BranchSelectorProps {
  branches: Branch[]
  currentBranch: Branch | null
  onBranchChange: (branch: Branch) => void
}

export function BranchSelector({ branches, currentBranch, onBranchChange }: BranchSelectorProps) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          className="w-full flex items-center justify-between bg-transparent hover:bg-white/[0.04] text-zinc-300 hover:text-white py-2 px-3 rounded-lg text-xs font-normal transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2.5 truncate">
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0 bg-emerald-400"
              style={currentBranch?.themeColor ? { backgroundColor: currentBranch.themeColor } : undefined}
            />
            <span className="truncate">{currentBranch ? currentBranch.name : "Şube seçin..."}</span>
          </div>
          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 text-zinc-500" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[248px] p-0 glass-panel rounded-[20px] overflow-hidden border-white/[0.06] text-white" align="start">
        <Command className="bg-transparent text-white">
          <CommandInput placeholder="Şube ara..." className="text-xs text-white placeholder:text-zinc-500" />
          <CommandList>
            <CommandEmpty className="py-3 text-center text-xs text-zinc-500">Şube bulunamadı.</CommandEmpty>
            <CommandGroup>
              {branches.map((branch) => (
                <CommandItem
                  key={branch.id}
                  value={branch.name}
                  onSelect={() => {
                    onBranchChange(branch)
                    setOpen(false)
                  }}
                  className="text-xs text-zinc-300 aria-selected:bg-white/[0.06] aria-selected:text-white cursor-pointer"
                >
                  <Check className={`mr-2 h-3.5 w-3.5 text-emerald-400 ${currentBranch?.id === branch.id ? "opacity-100" : "opacity-0"}`} />
                  <div className="w-2 h-2 rounded-full mr-2 shrink-0" style={{ backgroundColor: branch.themeColor || "#34D399" }} />
                  <div className="flex flex-col">
                    <span className="font-medium text-white">{branch.name}</span>
                    <span className="text-[11px] text-zinc-500">{branch.code}</span>
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
