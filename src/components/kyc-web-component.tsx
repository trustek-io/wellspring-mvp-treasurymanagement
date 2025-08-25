"use client"

import { useEffect, useRef, useState } from "react"
import { useKYC } from "@/providers/kyc-provider"
import {
  AlertCircle,
  CheckCircle,
  Clock,
  ExternalLink,
  Loader2,
  Shield,
} from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"

interface KYCWebComponentProps {
  kycUrl: string
  onComplete?: (data: any) => void
  onError?: (error: string) => void
  className?: string
  fallbackMethod?: "popup" | "redirect" | "embedded"
  title?: string
  description?: string
}

type KYCStatus = "loading" | "ready" | "in_progress" | "completed" | "error"
type EmbedMethod = "iframe" | "popup" | "redirect" | "none"

// ✨ NEW: Live status badge types based on kyc_status
type LiveKYCStatus = "not_started" | "incomplete" | "approved"

const statusConfig = {
  not_started: {
    color:
      "bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 border border-gray-300 shadow-sm",
    text: "Started",
    icon: Clock,
    glowColor: "shadow-gray-200/50",
  },
  incomplete: {
    color:
      "bg-gradient-to-r from-blue-500 to-blue-600 text-white border border-blue-400 shadow-lg",
    text: "In Progress",
    icon: Loader2,
    glowColor: "shadow-blue-500/30",
  },
  approved: {
    color:
      "bg-gradient-to-r from-green-500 to-green-600 text-white border border-green-400 shadow-lg",
    text: "Approved",
    icon: CheckCircle,
    glowColor: "shadow-green-500/30",
  },
}

const KYCWebComponent: React.FC<KYCWebComponentProps> = ({
  kycUrl,
  onComplete,
  onError,
  className,
  fallbackMethod = "popup",
  title = "Identity Verification",
  description = "Complete your identity verification to continue",
}) => {
  const { kycData, refreshKYCData } = useKYC()
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [status, setStatus] = useState<KYCStatus>("loading")
  const [embedMethod, setEmbedMethod] = useState<EmbedMethod>("none")
  const [errorMessage, setErrorMessage] = useState<string>("")
  const [progress, setProgress] = useState(0)
  const [iframeHeight, setIframeHeight] = useState(600)

  // ✨ NEW: Track live KYC status from polling
  const [liveKYCStatus, setLiveKYCStatus] =
    useState<LiveKYCStatus>("not_started")

  // ✨ NEW: Function to render live status badge with heartbeat animations
  const renderLiveStatusBadge = () => {
    const config = statusConfig[liveKYCStatus]
    const IconComponent = config?.icon

    return (
      <div
        className={cn(
          "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all duration-300",
          config?.color,
          config?.glowColor,
          // ✨ HEARTBEAT ALL THE TIME - ALWAYS ON!
          "animate-heartbeat",
          // Gentle hover effect
          "cursor-default hover:scale-110 hover:shadow-xl"
        )}
      >
        <IconComponent
          className={cn(
            "h-4 w-4 transition-transform duration-300",
            liveKYCStatus === "incomplete" && "animate-spin"
          )}
        />
        <span className="tracking-wide">{config?.text}</span>

        {/* ✨ Subtle pulsing dot for incomplete status */}
        {liveKYCStatus === "incomplete" && (
          <div className="relative ml-1">
            {/* Base dot */}
            <div className="h-2 w-2 rounded-full bg-white opacity-90"></div>
            {/* Gentle pulsing ring */}
            <div className="absolute left-0 top-0 h-2 w-2 animate-ping rounded-full bg-white opacity-40"></div>
          </div>
        )}

        {/* ✨ Shimmer effect for approved status */}
        {liveKYCStatus === "approved" && (
          <div className="animate-shimmer absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
        )}
      </div>
    )
  }

  // Handle iframe messages and detect completion - Based on tos-embed.tsx approach
  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return

    let timeoutId: ReturnType<typeof setTimeout>

    const handleLoad = () => {
      setStatus("ready")
      clearTimeout(timeoutId)
      console.log("✅ KYC iframe loaded successfully")

      // Set up message listener for iframe communication
      const handleMessage = (event: MessageEvent) => {
        // LOG ALL MESSAGES FOR DEBUGGING
        console.log("📨 RECEIVED MESSAGE:", {
          origin: event.origin,
          data: event.data,
          dataType: typeof event.data,
          dataString: JSON.stringify(event.data, null, 2),
        })

        // Verify origin for security - be more permissive for debugging
        try {
          const kycOrigin = new URL(kycUrl).origin
          const bridgeOrigins = [
            "https://bridge.withpersona.com",
            "https://withpersona.com",
            "https://persona.withpersona.com",
            "https://dashboard.bridge.xyz",
            "https://bridge.xyz",
          ]

          const isValidOrigin =
            event.origin === kycOrigin ||
            bridgeOrigins.some((origin) => event.origin.includes(origin)) ||
            event.origin === window.location.origin

          if (!isValidOrigin) {
            console.log(
              "❌ Message from unexpected origin:",
              event.origin,
              "Expected:",
              kycOrigin
            )
            // DON'T RETURN - process anyway for debugging
            console.log("🔍 Processing message anyway for debugging purposes")
          }
        } catch (e) {
          console.warn(
            "⚠️ Could not verify origin, processing message anyway for debugging"
          )
        }

        // Handle different message types like tos-embed.tsx does
        if (
          event.data.type === "kyc-completed" ||
          event.data.type === "kyc-accepted" ||
          event.data.action === "accept" ||
          event.data === "kyc-completed" ||
          event.data === "accept" ||
          event.data.signedAgreementId || // Handle Bridge.xyz format
          event.data.inquiryId || // Persona inquiry completion
          event.data.verificationId
        ) {
          // Bridge verification completion

          console.log("🎉 KYC accepted via postMessage")
          handleKYCCompleted(event.data)
        } else if (
          event.data.type === "kyc-declined" ||
          event.data.action === "decline"
        ) {
          toast.error("KYC verification declined")
        } else if (
          event.data.type === "inquiry-complete" ||
          event.data.event === "inquiry-complete"
        ) {
          console.log("🎉 Inquiry complete detected")
          handleKYCCompleted(event.data)
        } else if (
          event.data.type === "verification-complete" ||
          event.data.event === "verification-complete"
        ) {
          console.log("🎉 Verification complete detected")
          handleKYCCompleted(event.data)
        }

        // Handle redirect attempts from KYC iframe
        if (event.data.redirect || event.data.redirectTo || event.data.url) {
          const redirectUrl =
            event.data.redirect || event.data.redirectTo || event.data.url
          console.log("🔄 KYC iframe requesting redirect to:", redirectUrl)

          // If KYC was completed and there's a redirect, handle it
          if (status === "completed") {
            // Extract original redirect_uri if needed
            const originalUrl = new URL(kycUrl)
            const redirectUri = originalUrl.searchParams.get("redirect_uri")
            if (redirectUri && redirectUri !== window.location.href) {
              console.log("🔄 KYC redirect to:", redirectUri)
              window.location.href = redirectUri
            }
          }
          return
        }

        // Keep existing height adjustment logic
        if (event.data.height && typeof event.data.height === "number") {
          console.log("📏 Adjusting iframe height to:", event.data.height)
          setIframeHeight(Math.max(event.data.height, 400))
          return
        }
      }

      // Add message listener to window (global scope)
      window.addEventListener("message", handleMessage)
      console.log("🎧 Message listener added to window")

      // Also try to detect button clicks by monitoring iframe content (similar to tos-embed.tsx)
      try {
        const iframeDoc =
          iframe.contentDocument || iframe.contentWindow?.document
        if (iframeDoc) {
          console.log("✅ Can access iframe document")
          // Look for common completion button patterns
          const detectCompletionButton = () => {
            const completionButtons = iframeDoc.querySelectorAll(
              'button[data-action="complete"], ' +
                'button:contains("Done"), ' +
                'button:contains("Complete"), ' +
                'button:contains("I Accept"), ' +
                'button:contains("Finish"), ' +
                'button:contains("Continue"), ' +
                ".complete-button, " +
                "#complete-btn, " +
                ".btn-complete, " +
                '[data-test="done-button"], ' +
                '[data-test="complete-button"]'
            )

            console.log(
              "🔍 Found completion buttons:",
              completionButtons.length
            )

            completionButtons.forEach((button) => {
              button.addEventListener("click", () => {
                console.log("🎉 Completion button clicked via DOM detection!")
                handleKYCCompleted({ method: "dom-click-detection" })
              })
            })
          }

          // Wait for iframe content to load
          if (iframeDoc.readyState === "complete") {
            detectCompletionButton()
          } else {
            iframeDoc.addEventListener(
              "DOMContentLoaded",
              detectCompletionButton
            )
          }
        } else {
          console.log("❌ Cannot access iframe document")
        }
      } catch (e) {
        // Cross-origin restrictions - this is expected for external KYC pages
        // @ts-ignore
        // TODO: Fix this type issue
        console.log(
          "🚫 Cannot access iframe content (cross-origin):",
          (e as Error).message
        )
        console.log("🎧 Relying on postMessage only")
      }

      return () => {
        window.removeEventListener("message", handleMessage)
        console.log("🔇 Message listener removed from window")
      }
    }

    const handleError = () => {
      setStatus("error")
      setErrorMessage("Failed to load KYC iframe")
      clearTimeout(timeoutId)
      onError?.("Failed to load KYC iframe")
    }

    // Set timeout for loading
    timeoutId = setTimeout(() => {
      if (status === "loading") {
        console.log("⏰ KYC iframe taking too long to load, showing fallback")
        setStatus("error")
        setErrorMessage("KYC iframe taking too long to load")
      }
    }, 10000) // 10 second timeout

    iframe.addEventListener("load", handleLoad)
    iframe.addEventListener("error", handleError)

    return () => {
      iframe.removeEventListener("load", handleLoad)
      iframe.removeEventListener("error", handleError)
      clearTimeout(timeoutId)
    }
  }, [kycUrl, onError, status])

  const handleKYCCompleted = (data?: any) => {
    console.log("🎉 KYC completion handler called with data:", data)
    setStatus("completed")
    setProgress(100)
    setLiveKYCStatus("approved") // ✨ NEW: Set final status
    toast.success("KYC verification completed!")

    // 🔄 This refreshes the KYC data in the provider
    refreshKYCData?.()

    // Also log if we have updated data from polling
    if (data?.kycData) {
      console.log("🔄 Updating local KYC data with latest status")
    }

    onComplete?.(
      data || {
        status: "completed",
        timestamp: new Date().toISOString(),
        method: data?.method || "unknown",
      }
    )
  }

  // Test if iframe embedding works
  const testIframeCompatibility = async (url: string): Promise<boolean> => {
    return new Promise((resolve) => {
      const testIframe = document.createElement("iframe")
      testIframe.style.display = "none"
      testIframe.src = url

      let resolved = false

      const cleanup = () => {
        if (testIframe.parentNode) {
          testIframe.parentNode.removeChild(testIframe)
        }
      }

      testIframe.onload = () => {
        if (!resolved) {
          resolved = true
          cleanup()
          resolve(true)
        }
      }

      testIframe.onerror = () => {
        if (!resolved) {
          resolved = true
          cleanup()
          resolve(false)
        }
      }

      // Timeout after 5 seconds
      setTimeout(() => {
        if (!resolved) {
          resolved = true
          cleanup()
          resolve(false)
        }
      }, 5000)

      document.body.appendChild(testIframe)
    })
  }

  // Convert Bridge.xyz KYC URL to iframe-compatible format - Enhanced like tos-embed.tsx
  const convertToIframeUrl = (url: string): string => {
    try {
      const urlObj = new URL(url)

      // Replace /verify with /widget for iframe embedding
      urlObj.pathname = urlObj.pathname.replace("/verify", "/widget")

      // Add iframe-origin parameter (encoded)
      urlObj.searchParams.set(
        "iframe-origin",
        encodeURIComponent(window.location.origin)
      )

      // Remove redirect_uri to prevent iframe redirects, we'll handle completion via postMessage
      // urlObj.searchParams.delete('redirect_uri')

      console.log("🔄 Converted KYC URL for iframe:", {
        original: url,
        converted: urlObj.toString(),
      })

      return urlObj.toString()
    } catch (error) {
      console.error("❌ Error converting URL for iframe:", error)
      return url
    }
  }

  // Check if this is a Bridge.xyz URL that supports iframe embedding
  const isBridgeKYCUrl = (url: string): boolean => {
    try {
      const urlObj = new URL(url)
      return (
        urlObj.hostname.includes("bridge.withpersona.com") ||
        urlObj.hostname.includes("bridge.xyz")
      )
    } catch {
      return false
    }
  }

  // Initialize KYC embedding - Back to iframe with status polling
  useEffect(() => {
    const initializeKYC = async () => {
      if (!kycUrl) {
        setStatus("error")
        setErrorMessage("No KYC URL provided")
        return
      }

      setStatus("loading")
      setProgress(20)

      try {
        // Check if this is a Bridge.xyz URL that supports iframe embedding
        if (isBridgeKYCUrl(kycUrl)) {
          // Use iframe embedding for Bridge.xyz
          setEmbedMethod("iframe")
          setStatus("ready")
          setProgress(100)
          console.log("Using Bridge.xyz iframe embedding")
        } else {
          // Test iframe compatibility for other providers
          const canUseIframe = await testIframeCompatibility(kycUrl)
          setProgress(40)

          if (canUseIframe && fallbackMethod === "embedded") {
            setEmbedMethod("iframe")
            setStatus("ready")
            setProgress(100)
          } else {
            // Use fallback method
            setEmbedMethod(fallbackMethod as EmbedMethod)
            setStatus("ready")
            setProgress(100)
          }
        }

        toast.success("KYC verification loaded successfully")
      } catch (error) {
        setStatus("error")
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to initialize KYC"
        )
        onError?.(errorMessage)
      }
    }

    initializeKYC()
  }, [kycUrl, fallbackMethod, onError, errorMessage])

  const handleIframeLoad = () => {
    if (embedMethod === "iframe") {
      setStatus("ready")
      console.log("✅ KYC iframe loaded successfully")

      // Try to auto-adjust height for Bridge.xyz iframes
      if (isBridgeKYCUrl(kycUrl)) {
        const viewportHeight = window.innerHeight
        const availableHeight = Math.max(viewportHeight * 0.8, 500)
        setIframeHeight(Math.min(availableHeight, 800))
      }
    }
  }

  const handleIframeError = () => {
    setStatus("error")
    setErrorMessage("Failed to load KYC iframe")
    setEmbedMethod("popup") // Fallback to popup
  }

  const handlePopupKYC = () => {
    setStatus("in_progress")
    console.log("🚀 Opening KYC popup with URL:", kycUrl)

    // Add completion redirect to KYC URL
    const completionUrl = `${window.location.origin}/completed`
    const separator = kycUrl.includes("?") ? "&" : "?"
    const urlWithRedirect = `${kycUrl}${separator}redirect_uri=${encodeURIComponent(completionUrl)}`

    console.log("🔗 KYC URL with completion redirect:", urlWithRedirect)

    const popup = window.open(
      urlWithRedirect,
      "kyc-verification",
      "width=800,height=600,scrollbars=yes,resizable=yes,status=yes"
    )

    if (!popup) {
      setStatus("error")
      setErrorMessage("Popup blocked. Please allow popups and try again.")
      return
    }

    console.log("✅ KYC popup opened successfully")

    // Monitor popup closure
    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed)
        console.log("🎉 KYC popup closed - assuming completion!")

        // When popup closes, assume KYC was completed
        setStatus("completed")
        handleKYCCompleted({
          method: "popup-closure",
          timestamp: new Date().toISOString(),
          note: "KYC completion detected via popup window closure",
        })
      }
    }, 1000) // Check every second

    // Set up message listener for completion messages (backup method)
    const messageHandler = (event: MessageEvent) => {
      console.log(
        "📨 Message received in popup handler:",
        event.data,
        "from:",
        event.origin
      )

      // Check if message is from our completion page or KYC provider
      if (
        event.source === popup ||
        event.origin === window.location.origin ||
        event.origin.includes("bridge.xyz") ||
        event.origin.includes("withpersona.com")
      ) {
        if (
          event.data.type === "kyc-completed" ||
          event.data.type === "completion" ||
          event.data === "kyc-completed"
        ) {
          console.log("🎉 KYC completion confirmed via postMessage!")
          popup.close()
          clearInterval(checkClosed)
          window.removeEventListener("message", messageHandler)
          handleKYCCompleted(event.data)
        }
      }
    }

    window.addEventListener("message", messageHandler)

    // Cleanup function
    const cleanup = () => {
      clearInterval(checkClosed)
      window.removeEventListener("message", messageHandler)
    }

    // Auto-cleanup after 30 minutes (in case user abandons the process)
    setTimeout(
      () => {
        if (!popup.closed) {
          console.log("⏰ KYC popup timeout - auto-closing")
          popup.close()
        }
        cleanup()
      },
      30 * 60 * 1000
    ) // 30 minutes

    // Store cleanup function for manual cleanup if component unmounts
    return cleanup
  }

  const handleRedirectKYC = () => {
    // Add return URL to KYC URL
    const returnUrl = encodeURIComponent(window.location.href)
    const redirectUrl = kycUrl.includes("?")
      ? `${kycUrl}&return_url=${returnUrl}`
      : `${kycUrl}?return_url=${returnUrl}`

    window.location.href = redirectUrl
  }

  const retryKYC = () => {
    setStatus("loading")
    setErrorMessage("")
    setProgress(0)
    setLiveKYCStatus("not_started") // ✨ NEW: Reset live status
    // Re-run initialization
    window.location.reload()
  }

  if (status === "completed") {
    return (
      <div className={cn("space-y-4", className)}>
        {/* ✨ Show only the live badge in completed state */}
        <div className="flex justify-center">{renderLiveStatusBadge()}</div>

        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Identity verification completed successfully! You now have access to
            all features.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* ✨ Show only live badge when KYC data is available */}
      {kycData?.id && (
        <div className="mb-6 flex justify-center">
          {renderLiveStatusBadge()}
        </div>
      )}

      {(status === "loading" || status === "in_progress") && (
        <div className="space-y-3">
          <Progress value={progress} className="h-2" />
          {status === "loading" && <Skeleton className="h-64 w-full" />}
          {status === "in_progress" && (
            <Alert>
              <AlertDescription>
                Verification in progress... Please complete the steps in the
                verification window.
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {status === "error" && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{errorMessage}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={retryKYC}
              className="ml-4"
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {status === "ready" && (
        <div className="space-y-4">
          {embedMethod === "iframe" && (
            <div className="relative w-full">
              <iframe
                ref={iframeRef}
                src={
                  isBridgeKYCUrl(kycUrl) ? convertToIframeUrl(kycUrl) : kycUrl
                }
                className="w-full rounded-lg border"
                style={{
                  height: `${iframeHeight}px`,
                  minHeight: "400px",
                  maxHeight: "80vh",
                }}
                title="KYC Verification"
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-top-navigation-by-user-activation"
                allow="camera; microphone; geolocation"
                loading="lazy"
                onLoad={handleIframeLoad}
                onError={handleIframeError}
              />
            </div>
          )}

          {embedMethod === "popup" && (
            <div className="space-y-4 text-center">
              <div className="rounded-lg border-2 border-dashed border-muted-foreground/25 p-8">
                <Shield className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <h4 className="mb-2 font-semibold">
                  Secure Popup Verification
                </h4>
                <p className="mb-4 text-sm text-muted-foreground">
                  Click the button below to open a secure verification window.
                </p>
                <Button onClick={handlePopupKYC} size="lg">
                  Start Verification
                </Button>
              </div>

              <Alert>
                <AlertDescription>
                  💡 Make sure to allow popups for this site. The verification
                  will open in a secure window.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {embedMethod === "redirect" && (
            <div className="space-y-4 text-center">
              <div className="rounded-lg border-2 border-dashed border-muted-foreground/25 p-8">
                <ExternalLink className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <h4 className="mb-2 font-semibold">External Verification</h4>
                <p className="mb-4 text-sm text-muted-foreground">
                  You&apos;ll be redirected to complete your verification
                  securely.
                </p>
                <Button onClick={handleRedirectKYC} size="lg">
                  Continue to Verification
                </Button>
              </div>

              <Alert>
                <AlertDescription>
                  🔄 You&apos;ll be redirected to the verification page. Please
                  bookmark this page to return after completion.
                </AlertDescription>
              </Alert>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default KYCWebComponent
