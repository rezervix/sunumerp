import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'
import { IconLoader } from '@/components/ui/app-icons'

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-all duration-150 ease-out cursor-pointer select-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:outline-2 focus-visible:outline-[var(--brand)] focus-visible:outline-offset-2 aria-invalid:border-[var(--bad-fill)] aria-invalid:ring-2 aria-invalid:ring-[var(--bad-fill)]/20",
  {
    variants: {
      variant: {
        default:
          'bg-gradient-to-r from-[var(--brand)] to-[var(--blue)] text-white shadow-[var(--shadow-brand)] hover:from-[var(--brand-hover)] hover:to-[var(--brand-hover)] active:scale-[0.99]',
        primary:
          'bg-gradient-to-r from-[var(--brand)] to-[var(--blue)] text-white shadow-[var(--shadow-brand)] hover:from-[var(--brand-hover)] hover:to-[var(--brand-hover)] active:scale-[0.99]',
        secondary:
          'bg-[var(--bg)] text-[var(--text-2)] border border-[var(--line)] hover:bg-[var(--muted-bg)] hover:border-[var(--brand-line)] hover:text-[var(--text)] active:bg-[var(--brand-soft)]',
        outline:
          'bg-[var(--bg)] text-[var(--text-2)] border border-[var(--line)] hover:bg-[var(--muted-bg)] hover:border-[var(--brand-line)] hover:text-[var(--text)] active:bg-[var(--brand-soft)]',
        ghost:
          'bg-transparent text-[var(--text-2)] hover:bg-[var(--brand-soft)] hover:text-[var(--brand)] active:bg-[var(--brand-soft-2)]',
        tertiary:
          'bg-transparent text-[var(--text-2)] hover:bg-[var(--brand-soft)] hover:text-[var(--brand)] active:bg-[var(--brand-soft-2)]',
        destructive:
          'bg-[var(--bad-soft)] text-[var(--bad)] border border-[var(--bad-fill)]/25 hover:bg-[var(--bad-fill)] hover:text-[var(--brand)] active:opacity-95',
        danger:
          'bg-[var(--bad-soft)] text-[var(--bad)] border border-[var(--bad-fill)]/25 hover:bg-[var(--bad-fill)] hover:text-[var(--brand)] active:opacity-95',
        link: 'text-[var(--brand)] underline-offset-4 hover:text-[var(--brand-hover)] hover:underline px-0',
      },
      size: {
        default: 'h-9 px-5 py-2 has-[>svg]:px-4',
        sm: 'h-8 rounded-full gap-1.5 px-3.5 text-xs has-[>svg]:px-3',
        lg: 'h-10 rounded-full px-6 has-[>svg]:px-4',
        icon: 'size-9 rounded-full',
        'icon-sm': 'size-8 rounded-full',
        'icon-lg': 'size-10 rounded-full',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  disabled,
  children,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    loading?: boolean
  }) {
  if (asChild && !loading) {
    return (
      <Slot
        data-slot="button"
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      >
        {children}
      </Slot>
    )
  }

  return (
    <button
      data-slot="button"
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    >
      {loading && <IconLoader className="size-4 shrink-0" />}
      {children}
    </button>
  )
}

export { Button, buttonVariants }
