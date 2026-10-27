"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import { usePathname } from "next/navigation"
import { X, ChevronLeft, ChevronRight, CheckCircle, RotateCcw, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth/context"
import { 
  ModuleGuide, 
  WELCOME_GUIDE_ID, 
  MODULE_GUIDES, 
  getAvailableGuides, 
  getGuideForRoute 
} from "@/lib/config/module-guides"
import { GuideUIPreview } from "./guide-ui-preview"

const PROGRESS_STORAGE_KEY = "user_guide_progress_v2"

export function OnboardingModal() {
  const pathname = usePathname()
  const { session, isSuperAdmin, isPlatformDeveloper, hasPermission: authHasPermission } = useAuth()

  const [isOpen, setIsOpen] = useState(false)
  const [activeGuide, setActiveGuide] = useState<ModuleGuide | null>(null)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)

  const modalRef = useRef<HTMLDivElement>(null)
  const touchStart = useRef<number | null>(null)
  const touchEnd = useRef<number | null>(null)

  // Retrieve user available guides based on permissions & roles
  const availableGuides = useCallback(() => {
    return getAvailableGuides({
      isSuperAdmin,
      isPlatformDeveloper,
      hasPermission: (resource, action) => authHasPermission ? authHasPermission(resource, action || "read") : true
    })
  }, [isSuperAdmin, isPlatformDeveloper, authHasPermission])

  // Save guide completion progress
  const saveGuideProgress = useCallback((guideId: string, status: "completed" | "skipped") => {
    try {
      const stored = localStorage.getItem(PROGRESS_STORAGE_KEY)
      const parsed = stored ? JSON.parse(stored) : {}
      const guideObj = MODULE_GUIDES.find(g => g.id === guideId)
      
      parsed[guideId] = {
        status,
        version: guideObj?.version || 1,
        timestamp: new Date().toISOString()
      }
      localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(parsed))
    } catch (e) {
      console.error("Failed to save guide progress:", e)
    }
  }, [])

  // Check if a guide has already been completed or skipped
  const isGuideCompleted = useCallback((guideId: string) => {
    try {
      const stored = localStorage.getItem(PROGRESS_STORAGE_KEY)
      if (!stored) {
        // Backward compatibility fallback for old onboarding check
        if (guideId === WELCOME_GUIDE_ID) {
          return localStorage.getItem("has_seen_onboarding") === "true"
        }
        return false
      }
      const parsed = JSON.parse(stored)
      const record = parsed[guideId]
      if (!record) return false

      const guideObj = MODULE_GUIDES.find(g => g.id === guideId)
      return record.version >= (guideObj?.version || 1)
    } catch {
      return false
    }
  }, [])

  // Start a specific guide by ID or automatically select welcome/route guide
  const startGuide = useCallback((guideId?: string) => {
    const guidesList = availableGuides()
    let target: ModuleGuide | null = null

    if (guideId) {
      target = guidesList.find(g => g.id === guideId) || null
    } else {
      // Find matching route guide or fallback to welcome
      target = getGuideForRoute(pathname, guidesList)
    }

    if (target && target.steps.length > 0) {
      setActiveGuide(target)
      setCurrentStepIndex(0)
      setIsOpen(true)
    }
  }, [availableGuides, pathname])

  // Initial trigger check on mount / route change
  useEffect(() => {
    const guidesList = availableGuides()
    
    // Check if welcome guide hasn't been completed yet
    if (!isGuideCompleted(WELCOME_GUIDE_ID)) {
      const welcomeGuide = guidesList.find(g => g.id === WELCOME_GUIDE_ID)
      if (welcomeGuide) {
        setActiveGuide(welcomeGuide)
        setCurrentStepIndex(0)
        setIsOpen(true)
        return
      }
    }
  }, [availableGuides, isGuideCompleted])

  // Event listener for manual guide relaunch (from header or help menu)
  useEffect(() => {
    const handleRelaunch = (e: Event) => {
      const customEvent = e as CustomEvent<{ guideId?: string }>
      const requestedId = customEvent.detail?.guideId
      startGuide(requestedId)
    }

    window.addEventListener("relaunch-onboarding", handleRelaunch)
    return () => window.removeEventListener("relaunch-onboarding", handleRelaunch)
  }, [startGuide])

  // Keyboard navigation & accessibility focus trap
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose("skipped")
      } else if (e.key === "ArrowRight") {
        handleNext()
      } else if (e.key === "ArrowLeft") {
        handlePrev()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, activeGuide, currentStepIndex])

  const handleClose = (actionStatus: "completed" | "skipped" = "skipped") => {
    if (activeGuide) {
      saveGuideProgress(activeGuide.id, actionStatus)
    }
    setIsOpen(false)
  }

  const handleNext = () => {
    if (!activeGuide) return
    if (currentStepIndex < activeGuide.steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1)
    } else {
      handleClose("completed")
    }
  }

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1)
    }
  }

  // Touch Swipe Handlers for mobile UX
  const minSwipeDistance = 50

  const onTouchStart = (e: React.TouchEvent) => {
    touchEnd.current = null
    touchStart.current = e.targetTouches[0].clientX
  }

  const onTouchMove = (e: React.TouchEvent) => {
    touchEnd.current = e.targetTouches[0].clientX
  }

  const onTouchEnd = () => {
    if (!touchStart.current || !touchEnd.current) return
    const distance = touchStart.current - touchEnd.current
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance

    if (isLeftSwipe) {
      handleNext()
    } else if (isRightSwipe) {
      handlePrev()
    }
  }

  if (!isOpen || !activeGuide || activeGuide.steps.length === 0) return null

  const currentStep = activeGuide.steps[currentStepIndex]
  const totalSteps = activeGuide.steps.length

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm transition-all duration-300 animate-in fade-in-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="guide-modal-title"
      aria-describedby="guide-modal-desc"
    >
      <div 
        ref={modalRef}
        className="relative bg-card border border-border rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row min-h-[480px] max-h-[90vh] animate-in zoom-in-95 duration-200"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Left Side: High Resolution Visual Preview Panel */}
        <div className="w-full md:w-1/2 bg-slate-950 p-5 flex flex-col justify-between items-center text-white relative transition-all duration-500 overflow-hidden border-b md:border-b-0 md:border-r border-border/40">
          
          {/* Top Header Badge */}
          <div className="w-full flex items-center justify-between z-10">
            <span className="text-[11px] font-bold uppercase tracking-wider bg-primary/20 text-primary px-3 py-1 rounded-full border border-primary/30 backdrop-blur-xs flex items-center gap-1.5">
              <Sparkles size={12} />
              {activeGuide.badgeText}
            </span>
            <span className="text-xs font-semibold text-slate-300 bg-slate-800/80 px-2.5 py-0.5 rounded-full border border-slate-700">
              Adım {currentStepIndex + 1} / {totalSteps}
            </span>
          </div>

          {/* Center Graphic Component */}
          <div className="w-full h-56 md:h-64 my-auto relative z-10 flex items-center justify-center p-2">
            <GuideUIPreview 
              guideId={activeGuide.id} 
              stepId={currentStep.id} 
              title={currentStep.title} 
            />
          </div>

          {/* Slider Step Indicator Dots */}
          <div className="relative z-10 flex gap-2 justify-center mt-2">
            {activeGuide.steps.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentStepIndex(i)}
                className={`h-2 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary ${
                  currentStepIndex === i ? "w-7 bg-primary" : "w-2 bg-slate-700 hover:bg-slate-500"
                }`}
                title={`Adım ${i + 1}`}
                aria-label={`Slayt ${i + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Right Side: Step Content & Navigation Controls */}
        <div className="w-full md:w-1/2 p-6 md:p-7 flex flex-col justify-between bg-card text-foreground overflow-y-auto">
          {/* Top Header with Close Button */}
          <div className="flex items-start justify-between gap-2 pb-2">
            <div>
              <p className="text-[11px] font-bold text-primary tracking-wide uppercase">{activeGuide.title}</p>
              <h3 id="guide-modal-title" className="text-lg md:text-xl font-bold tracking-tight text-foreground mt-0.5 leading-snug">
                {currentStep.title}
              </h3>
            </div>
            <button 
              onClick={() => handleClose("skipped")} 
              className="text-muted-foreground hover:text-foreground hover:bg-muted p-1.5 rounded-lg transition-colors shrink-0"
              title="Kapat (ESC)"
              aria-label="Rehberi Kapat"
            >
              <X size={18} />
            </button>
          </div>

          {/* Description & Bullets Content */}
          <div className="space-y-4 my-auto py-2">
            <p id="guide-modal-desc" className="text-xs md:text-sm text-muted-foreground leading-relaxed">
              {currentStep.description}
            </p>

            {/* Bullets List */}
            {currentStep.bullets && currentStep.bullets.length > 0 && (
              <ul className="space-y-2 pt-1 border-t border-border/50">
                {currentStep.bullets.map((bullet, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs md:text-sm text-foreground/90 font-medium">
                    <CheckCircle size={15} className="text-emerald-500 shrink-0 mt-0.5" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Modal Footer Controls */}
          <div className="flex items-center justify-between pt-4 border-t border-border mt-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePrev}
              disabled={currentStepIndex === 0}
              className="text-xs h-9 font-medium"
            >
              <ChevronLeft size={16} className="mr-1" />
              Geri
            </Button>

            <div className="flex items-center gap-2">
              {currentStepIndex < totalSteps - 1 ? (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleClose("skipped")}
                    className="text-xs text-muted-foreground hover:text-foreground h-9"
                  >
                    Atla
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleNext}
                    className="text-xs bg-primary text-primary-foreground h-9 px-4 font-semibold hover:shadow-md transition-shadow"
                  >
                    İleri
                    <ChevronRight size={16} className="ml-1" />
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  onClick={() => handleClose("completed")}
                  className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white h-9 px-4 font-semibold hover:shadow-md transition-shadow flex items-center gap-1"
                >
                  <CheckCircle size={14} />
                  Rehberi Tamamla
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
