'use client'

import * as React from 'react'
import * as CheckboxPrimitive from '@radix-ui/react-checkbox'

import { cn } from '@/lib/utils'
import { IconCheck } from '@/components/ui/app-icons'

function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        'peer border-[var(--line)] bg-[var(--bg)] hover:border-[var(--brand)] data-[state=checked]:bg-[var(--brand)] data-[state=checked]:text-white data-[state=checked]:border-[var(--brand)] focus-visible:outline-2 focus-visible:outline-[var(--brand)] focus-visible:outline-offset-2 aria-invalid:border-[var(--bad-fill)] aria-invalid:ring-2 aria-invalid:ring-[var(--bad-fill)]/20 size-4 shrink-0 rounded-[5px] border transition-colors duration-150 ease-out cursor-pointer disabled:cursor-not-allowed disabled:bg-[var(--muted-bg)] disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="flex items-center justify-center text-current transition-none"
      >
        <IconCheck className="size-3.5" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
