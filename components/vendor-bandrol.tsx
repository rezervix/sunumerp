"use client"

import React, { useEffect, useRef } from "react"
import { VENDOR_CONFIG } from "@/lib/config/vendor.config"

// Register the custom element once on client-side
if (typeof window !== "undefined" && !customElements.get("vendor-bandrol")) {
  customElements.define(
    "vendor-bandrol",
    class extends HTMLElement {
      constructor() {
        super()
        this.attachShadow({ mode: "open" })
      }

      connectedCallback() {
        this.render()
      }

      static get observedAttributes() {
        return ["logo-path", "website-url", "bandrol-text", "collapsed"]
      }

      attributeChangedCallback() {
        this.render()
      }

      render() {
        if (!this.shadowRoot) return

        const logoPath = this.getAttribute("logo-path") || "/assets/vendor/cicekana-logo.svg"
        const websiteUrl = this.getAttribute("website-url") || "https://cicekanatech.com"
        const text = this.getAttribute("bandrol-text") || "Powered by Çiçekana Teknoloji & Medya"
        const collapsed = this.getAttribute("collapsed") === "true"

        this.shadowRoot.innerHTML = `
          <style>
            :host {
              display: block;
              width: 100%;
              box-sizing: border-box;
            }
            .bandrol-link {
              display: flex;
              align-items: center;
              justify-content: ${collapsed ? "center" : "flex-start"};
              gap: 10px;
              padding: 8px 12px;
              text-decoration: none;
              color: #ffffff;
              background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
              border: 1px solid rgba(255, 255, 255, 0.08);
              border-radius: 12px;
              transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            }
            .bandrol-link:hover {
              transform: translateY(-1px);
              background: linear-gradient(135deg, #334155 0%, #1e293b 100%);
              border-color: rgba(255, 255, 255, 0.15);
              box-shadow: 0 6px 16px rgba(59, 130, 246, 0.2);
            }
            .logo {
              width: ${collapsed ? "24px" : "20px"};
              height: ${collapsed ? "24px" : "20px"};
              object-fit: contain;
              transition: transform 0.3s ease;
            }
            .bandrol-link:hover .logo {
              transform: scale(1.1) rotate(5deg);
            }
            .text {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              font-size: 11px;
              font-weight: 600;
              color: rgba(255, 255, 255, 0.9);
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              display: ${collapsed ? "none" : "block"};
            }
            .arrow {
              margin-left: auto;
              color: rgba(255, 255, 255, 0.4);
              font-size: 10px;
              display: ${collapsed ? "none" : "block"};
              transition: transform 0.3s ease;
            }
            .bandrol-link:hover .arrow {
              transform: translateX(2px);
              color: rgba(255, 255, 255, 0.8);
            }
          </style>
          <a href="${websiteUrl}" target="_blank" rel="noopener noreferrer" class="bandrol-link">
            <img src="${logoPath}" class="logo" alt="Vendor Logo" />
            <span class="text">${text}</span>
            <span class="arrow">↗</span>
          </a>
        `
      }
    }
  )
}

interface VendorBandrolProps {
  collapsed?: boolean
  onTamper: () => void
}

export function VendorBandrol({ collapsed = false, onTamper }: VendorBandrolProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (typeof window === "undefined") return

    const container = containerRef.current
    if (!container) return

    // Callback when tampering is suspected
    const triggerTamper = () => {
      if (typeof window !== "undefined" && localStorage.getItem("security-disabled") === "true") {
        return
      }
      console.warn("[VendorBandrol] DOM Tampering detected!")
      onTamper()
    }

    // Helper to perform active validation check on the element
    const checkIntegrity = () => {
      const parentAside = container.closest("aside")
      const parentSheet = container.closest('[role="dialog"]')

      // 1. Check if container element is still connected to the DOM
      if (!container.isConnected) {
        triggerTamper()
        return
      }

      // Find our custom element inside container
      const customEl = container.querySelector("vendor-bandrol")
      if (!customEl || !customEl.isConnected) {
        triggerTamper()
        return
      }

      // Check shadow root presence
      if (!customEl.shadowRoot) {
        triggerTamper()
        return
      }

      // 2. Validate styles (only enforce visibility if parent aside is visible, or if inside sheet)
      if (parentAside) {
        const asideStyle = window.getComputedStyle(parentAside)
        if (asideStyle.display !== "none") {
          const rect = container.getBoundingClientRect()
          const style = window.getComputedStyle(container)
          const customStyle = window.getComputedStyle(customEl)

          if (
            style.display === "none" ||
            style.visibility === "hidden" ||
            style.opacity === "0" ||
            customStyle.display === "none" ||
            customStyle.visibility === "hidden" ||
            customStyle.opacity === "0" ||
            rect.height === 0 ||
            rect.width === 0
          ) {
            triggerTamper()
          }
        }
      } else if (parentSheet) {
        const rect = container.getBoundingClientRect()
        const style = window.getComputedStyle(container)
        const customStyle = window.getComputedStyle(customEl)

        if (
          style.display === "none" ||
          style.visibility === "hidden" ||
          style.opacity === "0" ||
          customStyle.display === "none" ||
          customStyle.visibility === "hidden" ||
          customStyle.opacity === "0" ||
          rect.height === 0 ||
          rect.width === 0
        ) {
          triggerTamper()
        }
      }
    }

    // A. Setup MutationObserver to watch attributes and children changes
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "childList") {
          // If any child is removed, or if our element was deleted
          const removed = Array.from(mutation.removedNodes)
          if (removed.some(node => node.contains(container) || node === container)) {
            triggerTamper()
            return
          }
        }

        // Check integrity on any attribute or child mutation
        checkIntegrity()
      }
    })

    // Observe container, its parent, and custom element
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["style", "class", "hidden"]
    })

    // B. Setup poll check as fallback in case MutationObserver is disconnected
    const interval = setInterval(checkIntegrity, 2000)

    // Initial check
    checkIntegrity()

    return () => {
      observer.disconnect()
      clearInterval(interval)
    }
  }, [onTamper])

  return (
    <div
      ref={containerRef}
      id="vendor-bandrol-container"
      className="w-full shrink-0 mt-2"
    >
      {/* @ts-ignore */}
      <vendor-bandrol
        logo-path={VENDOR_CONFIG.logoPath}
        website-url={VENDOR_CONFIG.websiteUrl}
        bandrol-text={VENDOR_CONFIG.bandrolText}
        collapsed={collapsed ? "true" : "false"}
      />
    </div>
  )
}
