import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: 'bg-[#34D399] text-[#061811] font-medium hover:bg-[#34D399]/90 shadow-sm',
        destructive:
          'bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 focus-visible:ring-rose-500/20',
        outline:
          'border border-white/[0.06] bg-[#111513]/90 text-zinc-200 shadow-xs hover:bg-emerald-400/15 hover:text-emerald-300 hover:border-emerald-500/25',
        secondary:
          'bg-emerald-400/15 text-emerald-300 border border-emerald-500/25 hover:bg-emerald-400/25',
        ghost:
          'text-zinc-400 hover:bg-white/[0.04] hover:text-white',
        link: 'text-emerald-400 underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-5 py-2 has-[>svg]:px-4',
        sm: 'h-8 rounded-full gap-1.5 px-3.5 has-[>svg]:px-3',
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
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
