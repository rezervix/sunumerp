import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center justify-center rounded-full border font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:outline-2 focus-visible:outline-[var(--brand)] focus-visible:outline-offset-2 transition-colors duration-150 overflow-hidden',
  {
    variants: {
      variant: {
        default:
          'border-[var(--brand-line)] bg-[var(--brand-soft)] text-[var(--brand)]',
        brand:
          'border-[var(--brand-line)] bg-[var(--brand-soft)] text-[var(--brand)]',
        secondary:
          'border-transparent bg-[var(--muted-bg)] text-[var(--text-2)]',
        neutral:
          'border-transparent bg-[var(--muted-bg)] text-[var(--text-2)]',
        ok: 'border-transparent bg-[var(--ok-soft)] text-[var(--ok)]',
        warn: 'border-transparent bg-[var(--warn-soft)] text-[var(--warn)]',
        bad: 'border-transparent bg-[var(--bad-soft)] text-[var(--bad)]',
        destructive:
          'border-transparent bg-[var(--bad-soft)] text-[var(--bad)]',
        outline:
          'border-[var(--line)] bg-[var(--bg)] text-[var(--text-2)]',
      },
      size: {
        default: 'px-2.5 py-0.5 text-xs',
        sm: 'px-2 py-0.5 text-[10px]',
        lg: 'px-3 py-1 text-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export interface BadgeProps
  extends React.ComponentProps<'span'>,
    VariantProps<typeof badgeVariants> {
  asChild?: boolean
}

function Badge({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: BadgeProps) {
  const Comp = asChild ? Slot : 'span'

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
