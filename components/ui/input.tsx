import * as React from 'react'

import { cn } from '@/lib/utils'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'file:text-[var(--text)] placeholder:text-[var(--text-muted)] selection:bg-[var(--brand-soft-2)] selection:text-[var(--navy)] border-[var(--line)] bg-[var(--bg)] text-[var(--text)] h-9 w-full min-w-0 rounded-[12px] border px-3.5 py-1.5 text-sm transition-[color,border-color,box-shadow] duration-150 ease-out outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium hover:border-[var(--brand-line)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-[var(--muted-bg)] disabled:text-[var(--text-muted)] disabled:opacity-65',
        'focus-visible:border-[var(--brand)] focus-visible:ring-3 focus-visible:ring-[var(--brand)]/15 focus-visible:outline-none',
        'aria-invalid:border-[var(--bad-fill)] aria-invalid:ring-3 aria-invalid:ring-[var(--bad-fill)]/15',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
