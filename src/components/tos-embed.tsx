// src/components/tos-embed.tsx
"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { CheckCircle, ExternalLink, FileText } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

interface TOSEmbedProps {
  tosUrl: string
  onAccepted?: () => void
  onError?: (error: string) => void
  className?: string
  title?: string
  description?: string
}

type TOSStatus = "loading" | "loaded" | "accepted" | "error" | "fallback"

export default function TOSEmbed({
  tosUrl,
  onAccepted,
  onError,
  className,
  title = "Terms of Service",
  description = "Please review and accept the terms of service to continue",
}: TOSEmbedProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [status, setStatus] = useState<TOSStatus>("loading")
  const [errorMessage, setErrorMessage] = useState<string>("")
  const [manualAccepted, setManualAccepted] = useState(false)

  // Convert TOS URL to iframe-compatible format by removing redirect_uri
  const convertTOSUrlForIframe = (url: string): string => {
    try {
      const urlObj = new URL(url)

      // Remove redirect_uri to prevent iframe redirects
      urlObj.searchParams.delete("redirect_uri")

      return urlObj.toString()
    } catch (error) {
      console.error("Error converting TOS URL for iframe:", error)
      return url
    }
  }

  const handleTOSAccepted = useCallback(() => {
    setStatus("accepted")
    toast.success("Terms of Service accepted!")
    onAccepted?.()
  }, [onAccepted])

  const handleManualAccept = () => {
    setManualAccepted(true)
    handleTOSAccepted()
  }

  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return

    let timeoutId: ReturnType<typeof setTimeout>

    const handleLoad = () => {
      setStatus("loaded")
      clearTimeout(timeoutId)

      // Set up message listener for iframe communication
      const handleMessage = (event: MessageEvent) => {
        console.log(
          "Received message:",
          event.data,
          "from origin:",
          event.origin
        )

        // Verify origin for security
        try {
          const tosOrigin = new URL(tosUrl).origin
          if (event.origin !== tosOrigin) {
            console.log("Message from wrong origin, expected:", tosOrigin)
            return
          }
        } catch (e) {
          console.warn("Invalid TOS URL origin")
          return
        }

        // Handle different message types
        if (
          event.data.type === "tos-accepted" ||
          event.data.action === "accept" ||
          event.data === "tos-accepted" ||
          event.data === "accept" ||
          event.data.signedAgreementId
        ) {
          // Handle Bridge.xyz format
          console.log("TOS accepted via postMessage")
          handleTOSAccepted()
        } else if (
          event.data.type === "tos-declined" ||
          event.data.action === "decline"
        ) {
          toast.error("Terms of Service declined")
        }

        // Handle redirect attempts from TOS iframe
        if (event.data.redirect || event.data.redirectTo || event.data.url) {
          const redirectUrl =
            event.data.redirect || event.data.redirectTo || event.data.url
          console.log("TOS iframe requesting redirect to:", redirectUrl)

          // If TOS was accepted and there's a redirect, handle it in the parent window
          if (status === "accepted") {
            // Extract original redirect_uri if needed
            const originalUrl = new URL(tosUrl)
            const redirectUri = originalUrl.searchParams.get("redirect_uri")
            if (redirectUri && redirectUri !== window.location.href) {
              console.log("TOS redirect to:", redirectUri)
              window.location.href = redirectUri
            }
          }
          return
        }
      }

      window.addEventListener("message", handleMessage)

      // Also try to detect button clicks by monitoring iframe content
      // Note: This only works if the TOS page is on the same origin or allows access
      try {
        const iframeDoc =
          iframe.contentDocument || iframe.contentWindow?.document
        if (iframeDoc) {
          // Look for common accept button patterns
          const detectAcceptButton = () => {
            const acceptButtons = iframeDoc.querySelectorAll(
              'button[data-action="accept"], ' +
              'button:contains("Accept"), ' +
              'button:contains("I Accept"), ' +
              'button:contains("Agree"), ' +
              'button:contains("I Agree"), ' +
              ".accept-button, " +
              "#accept-btn, " +
              ".btn-accept"
            )

            acceptButtons.forEach((button) => {
              button.addEventListener("click", handleTOSAccepted)
            })
          }

          // Wait for iframe content to load
          if (iframeDoc.readyState === "complete") {
            detectAcceptButton()
          } else {
            iframeDoc.addEventListener("DOMContentLoaded", detectAcceptButton)
          }
        }
      } catch (e) {
        // Cross-origin restrictions - this is expected for external TOS pages
        console.log(
          "Cannot access iframe content (cross-origin), relying on postMessage"
        )
      }

      return () => {
        window.removeEventListener("message", handleMessage)
      }
    }

    const handleError = () => {
      setStatus("error")
      setErrorMessage("Failed to load Terms of Service")
      clearTimeout(timeoutId)
      onError?.("Failed to load TOS iframe")
    }

    // Set timeout for loading
    timeoutId = setTimeout(() => {
      if (status === "loading") {
        setStatus("fallback")
        toast.warning("TOS iframe taking too long to load, showing fallback")
      }
    }, 40000) // 40 second timeout

    iframe.addEventListener("load", handleLoad)
    iframe.addEventListener("error", handleError)

    return () => {
      iframe.removeEventListener("load", handleLoad)
      iframe.removeEventListener("error", handleError)
      clearTimeout(timeoutId)
    }
  }, [tosUrl, onError, status, handleTOSAccepted])

  const openTOSInNewTab = () => {
    window.open(tosUrl, "_blank", "noopener,noreferrer")
  }

  const retryLoad = () => {
    setStatus("loading")
    setErrorMessage("")
    if (iframeRef.current) {
      iframeRef.current.src = tosUrl
    }
  }

  const renderStatusBadge = () => {
    const statusConfig = {
      loading: { color: "bg-yellow-100 text-yellow-800", text: "Loading..." },
      loaded: { color: "bg-blue-100 text-blue-800", text: "Ready" },
      accepted: { color: "bg-green-100 text-green-800", text: "Accepted" },
      error: { color: "bg-red-100 text-red-800", text: "Error" },
      fallback: {
        color: "bg-orange-100 text-orange-800",
        text: "Manual Review",
      },
    }

    const config = statusConfig[status]
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
          config.color
        )}
      >
        {status === "accepted" && <CheckCircle className="mr-1 h-3 w-3" />}
        {config.text}
      </span>
    )
  }

  if (status === "accepted") {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            <FileText className="h-5 w-5" />
            {title}
          </h3>
          {renderStatusBadge()}
        </div>

        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Terms of Service have been accepted. You may now proceed to the next
            step.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      {status === "loading" && (
        <div className="space-y-3">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-10 w-1/3" />
        </div>
      )}

      {status === "error" && (
        <Alert variant="destructive">
          <AlertDescription className="flex items-center justify-between">
            <span>{errorMessage}</span>
            <div className="ml-4 flex gap-2">
              <Button variant="outline" size="sm" onClick={retryLoad}>
                Retry
              </Button>
              <Button variant="outline" size="sm" onClick={openTOSInNewTab}>
                <ExternalLink className="mr-1 h-3 w-3" />
                Open in New Tab
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {status === "fallback" && (
        <div className="space-y-4">
          <Alert>
            <AlertDescription>
              The Terms of Service couldn&apos;t be loaded. Please try reloading the page..
            </AlertDescription>
          </Alert>
        </div>
      )}

      {(status === "loaded" || status === "loading") && (
        <div className="relative">
          <iframe
            ref={iframeRef}
            src={convertTOSUrlForIframe(tosUrl)}
            className={cn(
              "w-full rounded-lg border",
              status === "loading" ? "opacity-50" : "opacity-100"
            )}
            style={{ height: "500px" }}
            title="Terms of Service"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            loading="lazy"
          />
        </div>
      )}
    </div>
  )
}
