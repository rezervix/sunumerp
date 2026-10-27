"use client"

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react"

interface VirtualListProps<T> {
  items: T[]
  itemHeight: number
  height: number | string
  renderItem: (item: T, index: number) => React.ReactNode
  overscan?: number
  className?: string
  keyExtractor?: (item: T, index: number) => string | number
}

/**
 * 60 FPS Windowing / Virtualized List Component for Çiçekana ERP
 * Only renders visible items in the viewport to keep DOM light and scrolling smooth.
 */
export function VirtualList<T>({
  items,
  itemHeight,
  height,
  renderItem,
  overscan = 5,
  className = "",
  keyExtractor
}: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)

  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      setScrollTop(containerRef.current.scrollTop)
    }
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    el.addEventListener("scroll", handleScroll, { passive: true })
    return () => el.removeEventListener("scroll", handleScroll)
  }, [handleScroll])

  const totalHeight = items.length * itemHeight

  const { visibleItems, startIndex, offsetY } = useMemo(() => {
    const containerHeight =
      typeof height === "number"
        ? height
        : containerRef.current?.clientHeight || 600

    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
    const end = Math.min(
      items.length,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    )

    const slice = items.slice(start, end)
    const topOffset = start * itemHeight

    return { visibleItems: slice, startIndex: start, offsetY: topOffset }
  }, [items, itemHeight, height, scrollTop, overscan])

  return (
    <div
      ref={containerRef}
      style={{ height, overflowY: "auto", position: "relative" }}
      className={`virtual-list-container ${className}`}
    >
      <div style={{ height: totalHeight, width: "100%", position: "relative" }}>
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            position: "absolute",
            top: 0,
            left: 0,
            right: 0
          }}
        >
          {visibleItems.map((item, idx) => {
            const actualIndex = startIndex + idx
            const key = keyExtractor
              ? keyExtractor(item, actualIndex)
              : actualIndex
            return (
              <div key={key} style={{ height: itemHeight }}>
                {renderItem(item, actualIndex)}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
