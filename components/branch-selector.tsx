"use client"

import { Check, ChevronsUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
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
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          <div className="flex items-center gap-2 truncate">
            {currentBranch && (
              <div
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: currentBranch.themeColor }}
              />
            )}
            <span className="truncate">{currentBranch ? currentBranch.name : "Şube seçin..."}</span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Şube ara..." />
          <CommandList>
            <CommandEmpty>Şube bulunamadı.</CommandEmpty>
            <CommandGroup>
              {branches.map((branch) => (
                <CommandItem
                  key={branch.id}
                  value={branch.name}
                  onSelect={() => {
                    onBranchChange(branch)
                    setOpen(false)
                  }}
                >
                  <Check className={`mr-2 h-4 w-4 ${currentBranch?.id === branch.id ? "opacity-100" : "opacity-0"}`} />
                  <div className="w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: branch.themeColor }} />
                  <div className="flex flex-col">
                    <span className="font-medium">{branch.name}</span>
                    <span className="text-xs text-muted-foreground">{branch.code}</span>
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
