"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Loader } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface TOSModalProps {
  isOpen: boolean
  onClose: () => void
  tosUrl: string
  onAccepted: () => void
  kycUrl?: string
}

export default function TOSModal({
  isOpen,
  onClose,
  tosUrl,
  onAccepted,
  kycUrl,
}: TOSModalProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [iframeKey, setIframeKey] = useState(0)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const handleTOSAccepted = useCallback(() => {
    alert("🚨 TOS FUNCTION CALLED!")
    console.log("TOS Accepted detected!")
    console.log("KYC URL:", kycUrl)

    if (kycUrl) {
      alert("✅ KYC URL EXISTS - NAVIGATING!")
      console.log("Navigating to KYC verification page")
      const targetUrl = `/dashboard/kyc-verification?url=${encodeURIComponent(kycUrl)}`
      console.log("Target URL:", targetUrl)
      window.location.href = targetUrl
    } else {
      alert("❌ NO KYC URL!")
      console.log("No KYC URL available")
      onClose()
      onAccepted()
    }
  }, [onAccepted, kycUrl, onClose])

  const handleIframeLoad = () => {
    setIsLoading(false)
  }

  // Monitor postMessage events from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Check if message is from the TOS iframe
      if (
        event.origin === "https://dashboard.bridge.xyz" ||
        event.origin === "https://monorail.onrender.com"
      ) {
        console.log("Message from iframe:", event.data)

        // Look for TOS acceptance indicators in the message
        if (event.data && typeof event.data === "object") {
          // Check for signed agreement ID (both formats)
          if (
            event.data.signed_agreement_id ||
            event.data.signedAgreementId ||
            event.data.type === "tos_accepted" ||
            event.data.event === "agreement_signed" ||
            event.data.status === "accepted"
          ) {
            console.log("TOS acceptance detected via postMessage!")
            handleTOSAccepted()
          }
        }

        // Also check for string messages
        if (typeof event.data === "string") {
          const data = event.data.toLowerCase()
          if (
            data.includes("accepted") ||
            data.includes("signed") ||
            data.includes("complete")
          ) {
            console.log("TOS acceptance detected via string message!")
            handleTOSAccepted()
          }
        }
      }
    }

    window.addEventListener("message", handleMessage)
    return () => window.removeEventListener("message", handleMessage)
  }, [onAccepted, kycUrl, handleTOSAccepted])

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true)
      setIframeKey((prev) => prev + 1)
    }
  }, [isOpen])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="h-[90vh] max-w-5xl p-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="text-xl font-semibold">
            Terms of Service
          </DialogTitle>
        </DialogHeader>

        <div className="h-full flex-1 px-6 pb-6">
          <div className="relative h-[calc(90vh-120px)] overflow-hidden rounded-lg border bg-gray-50">
            {/* Loading indicator */}
            {isLoading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-white">
                <div className="flex flex-col items-center gap-3">
                  <Loader className="h-6 w-6 animate-spin text-gray-400" />
                  <p className="text-sm text-gray-500">
                    Loading terms of service...
                  </p>
                </div>
              </div>
            )}

            {/* Iframe - only shows TOS */}
            <iframe
              ref={iframeRef}
              key={iframeKey}
              src={tosUrl}
              className="h-full w-full border-0"
              onLoad={handleIframeLoad}
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation"
              title="Terms of Service"
              allow="camera; microphone; geolocation"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
