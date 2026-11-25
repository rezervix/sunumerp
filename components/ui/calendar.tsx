'use client'

import * as React from 'react'
import { DayButton, DayPicker, getDefaultClassNames } from 'react-day-picker'

import { cn } from '@/lib/utils'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
} from '@/components/ui/app-icons'

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = 'label',
  buttonVariant = 'ghost',
  formatters,
  components,
  ...props
}: React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: React.ComponentProps<typeof Button>['variant']
}) {
  const defaultClassNames = getDefaultClassNames()

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        'bg-[var(--bg)] text-[var(--text)] group/calendar p-3 [--cell-size:--spacing(8)] [[data-slot=card-content]_&]:bg-transparent [[data-slot=popover-content]_&]:bg-transparent',
        String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
        String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
        className,
      )}
      captionLayout={captionLayout}
      formatters={{
        formatMonthDropdown: (date) =>
          date.toLocaleString('tr-TR', { month: 'short' }),
        ...formatters,
      }}
      classNames={{
        root: cn('w-fit', defaultClassNames.root),
        months: cn(
          'flex gap-4 flex-col md:flex-row relative',
          defaultClassNames.months,
        ),
        month: cn('flex flex-col w-full gap-4', defaultClassNames.month),
        nav: cn(
          'flex items-center gap-1 w-full absolute top-0 inset-x-0 justify-between',
          defaultClassNames.nav,
        ),
        button_previous: cn(
          buttonVariants({ variant: buttonVariant }),
          'size-(--cell-size) aria-disabled:opacity-50 p-0 select-none',
          defaultClassNames.button_previous,
        ),
        button_next: cn(
          buttonVariants({ variant: buttonVariant }),
          'size-(--cell-size) aria-disabled:opacity-50 p-0 select-none',
          defaultClassNames.button_next,
        ),
        month_caption: cn(
          'flex items-center justify-center h-(--cell-size) w-full px-(--cell-size)',
          defaultClassNames.month_caption,
        ),
        dropdowns: cn(
          'w-full flex items-center text-sm font-medium justify-center h-(--cell-size) gap-1.5',
          defaultClassNames.dropdowns,
        ),
        dropdown_root: cn(
          'relative has-focus:border-[var(--brand)] border border-[var(--line)] has-focus:ring-[var(--brand)]/20 has-focus:ring-[3px] rounded-[10px]',
          defaultClassNames.dropdown_root,
        ),
        dropdown: cn(
          'absolute bg-[var(--bg)] inset-0 opacity-0',
          defaultClassNames.dropdown,
        ),
        caption_label: cn(
          'select-none font-semibold text-[var(--text)]',
          captionLayout === 'label'
            ? 'text-sm'
            : 'rounded-md pl-2 pr-1 flex items-center gap-1 text-sm h-8 [&>svg]:text-[var(--text-muted)] [&>svg]:size-3.5',
          defaultClassNames.caption_label,
        ),
        table: 'w-full border-collapse',
        weekdays: cn('flex', defaultClassNames.weekdays),
        weekday: cn(
          'text-[var(--text-muted)] rounded-md flex-1 font-medium text-[11px] uppercase tracking-wider select-none',
          defaultClassNames.weekday,
        ),
        week: cn('flex w-full mt-1.5', defaultClassNames.week),
        week_number_header: cn(
          'select-none w-(--cell-size)',
          defaultClassNames.week_number_header,
        ),
        week_number: cn(
          'text-xs select-none text-[var(--text-muted)] tabular-nums',
          defaultClassNames.week_number,
        ),
        day: cn(
          'relative w-full h-full p-0 text-center [&:first-child[data-selected=true]_button]:rounded-l-[10px] [&:last-child[data-selected=true]_button]:rounded-r-[10px] group/day aspect-square select-none tabular-nums',
          defaultClassNames.day,
        ),
        range_start: cn(
          'rounded-l-[10px] bg-[var(--brand-soft)]',
          defaultClassNames.range_start,
        ),
        range_middle: cn(
          'rounded-none bg-[var(--brand-soft)] text-[var(--navy)]',
          defaultClassNames.range_middle,
        ),
        range_end: cn(
          'rounded-r-[10px] bg-[var(--brand-soft)]',
          defaultClassNames.range_end,
        ),
        today: cn(
          'bg-[var(--brand-soft-2)] text-[var(--brand)] font-semibold rounded-[10px] data-[selected=true]:rounded-none',
          defaultClassNames.today,
        ),
        outside: cn(
          'text-[var(--text-muted)] opacity-60 aria-selected:text-[var(--text-muted)]',
          defaultClassNames.outside,
        ),
        disabled: cn(
          'text-[var(--text-muted)] opacity-45',
          defaultClassNames.disabled,
        ),
        hidden: cn('invisible', defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Root: ({ className, rootRef, ...props }) => (
          <div
            data-slot="calendar"
            ref={rootRef}
            className={cn(className)}
            {...props}
          />
        ),
        Chevron: ({ className, orientation, ...props }) => {
          if (orientation === 'left') {
            return <IconChevronLeft className={cn('size-4', className)} {...props} />
          }
          if (orientation === 'right') {
            return <IconChevronRight className={cn('size-4', className)} {...props} />
          }
          return <IconChevronDown className={cn('size-4', className)} {...props} />
        },
        DayButton: CalendarDayButton,
        WeekNumber: ({ children, ...props }) => (
          <td {...props}>
            <div className="flex size-(--cell-size) items-center justify-center text-center tabular-nums">
              {children}
            </div>
          </td>
        ),
        ...components,
      }}
      {...props}
    />
  )
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  ...props
}: React.ComponentProps<typeof DayButton>) {
  const defaultClassNames = getDefaultClassNames()

  const ref = React.useRef<HTMLButtonElement>(null)
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus()
  }, [modifiers.focused])

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      data-day={day.date.toLocaleDateString('tr-TR')}
      data-selected-single={
        modifiers.selected &&
        !modifiers.range_start &&
        !modifiers.range_end &&
        !modifiers.range_middle
      }
      data-range-start={modifiers.range_start}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      className={cn(
        'rounded-[10px] tabular-nums text-[var(--text)] hover:bg-[var(--brand-soft)] hover:text-[var(--brand)] data-[selected-single=true]:bg-[var(--brand)] data-[selected-single=true]:text-[var(--brand)] font-medium data-[selected-single=true]:hover:bg-[var(--brand-hover)] data-[range-middle=true]:bg-[var(--brand-soft)] data-[range-middle=true]:text-[var(--navy)] data-[range-start=true]:bg-[var(--brand)] data-[range-start=true]:text-[var(--brand)] font-medium data-[range-end=true]:bg-[var(--brand)] data-[range-end=true]:text-white flex aspect-square size-auto w-full min-w-(--cell-size) flex-col gap-1 leading-none font-normal data-[range-end=true]:rounded-r-[10px] data-[range-middle=true]:rounded-none data-[range-start=true]:rounded-l-[10px] [&>span]:text-xs [&>span]:opacity-70',
        defaultClassNames.day,
        className,
      )}
      {...props}
    />
  )
}

export { Calendar, CalendarDayButton }
