"use client"

import React, { useEffect } from "react"
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  type Variants,
  type HTMLMotionProps,
} from "framer-motion"

export interface AnimatedNumberProps {
  value: number | string
  prefix?: string
  suffix?: string
  decimals?: number
  className?: string
}

/**
 * AnimatedNumber
 * Counts smoothly from 0 to target value using framer-motion spring physics
 * (stiffness: 75, damping: 15) and tabular Turkish number formatting.
 */
export function AnimatedNumber({
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
  className,
}: AnimatedNumberProps) {
  const numericTarget =
    typeof value === "number"
      ? value
      : Number(String(value).replace(/[^0-9.-]+/g, "")) || 0

  const motionValue = useMotionValue(0)
  const springValue = useSpring(motionValue, {
    stiffness: 75,
    damping: 15,
  })

  const displayValue = useTransform(springValue, (latest: number) => {
    const factor = Math.pow(10, decimals)
    const rounded =
      decimals > 0
        ? Math.round(latest * factor) / factor
        : Math.round(latest)
    const formatted = rounded.toLocaleString("tr-TR", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
    return `${prefix}${formatted}${suffix}`
  })

  useEffect(() => {
    motionValue.set(numericTarget)
  }, [numericTarget, motionValue])

  return <motion.span className={className}>{displayValue}</motion.span>
}

export const staggerContainerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.02,
    },
  },
}

export const staggerItemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 260,
      damping: 22,
    },
  },
}

export interface StaggerContainerProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode
  className?: string
}

export function StaggerContainer({
  children,
  className,
  ...rest
}: StaggerContainerProps) {
  return (
    <motion.div
      variants={staggerContainerVariants}
      initial="hidden"
      animate="show"
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  )
}

export interface StaggerItemProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode
  className?: string
}

export function StaggerItem({
  children,
  className,
  ...rest
}: StaggerItemProps) {
  return (
    <motion.div variants={staggerItemVariants} className={className} {...rest}>
      {children}
    </motion.div>
  )
}

