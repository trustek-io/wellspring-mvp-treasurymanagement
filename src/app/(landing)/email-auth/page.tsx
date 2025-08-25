// src/app/(landing)/email-auth/page.tsx - SSR SAFE VERSION
"use client"

import { Suspense, useEffect, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useAuth } from "@/providers/auth-provider"
import { useTurnkey } from "@turnkey/sdk-react"
import { Loader } from "lucide-react"

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import Image from 'next/image'

function EmailAuthContent() {
  const searchParams = useSearchParams()
  const { completeEmailAuth } = useAuth()
  const { authIframeClient } = useTurnkey()

  // Use ref to track if auth has been initiated to prevent multiple calls
  const authInitiatedRef = useRef(false)

  // State to store the corrected email after client-side processing
  const [correctedEmail, setCorrectedEmail] = useState<string | null>(null)
  const [isClient, setIsClient] = useState(false)

  // Set client-side flag
  useEffect(() => {
    setIsClient(true)
  }, [])

  // IMPROVED: Better email parameter extraction - only runs on client side
  const getCorrectEmail = () => {
    // Only run on client side to avoid SSR issues
    if (typeof window === 'undefined') return null

    // Try multiple methods to get the correct email
    const rawUserEmail = searchParams.get("userEmail")

    if (!rawUserEmail) return null

    // Method 1: Direct URLSearchParams (bypasses Next.js processing)
    const urlParams = new URLSearchParams(window.location.search)
    const directEmail = urlParams.get("userEmail")

    // If direct extraction has +, use it (it wasn't mangled)
    if (directEmail && directEmail.includes("+")) {
      console.log("📧 Using direct email extraction:", directEmail)
      return directEmail
    }

    // Method 2: Fix space conversion issue
    if (rawUserEmail.includes(" ") && !rawUserEmail.includes("+")) {
      const fixedEmail = rawUserEmail.replace(/ /g, "+")
      console.log("📧 Fixed email by replacing spaces:", fixedEmail)
      return fixedEmail
    }

    // Method 3: Try manual URL parsing as fallback
    try {
      const url = new URL(window.location.href)
      const manualEmail = url.searchParams.get("userEmail")
      if (manualEmail && manualEmail !== rawUserEmail) {
        console.log("📧 Using manual URL parsing:", manualEmail)
        return manualEmail
      }
    } catch (error) {
      console.warn("Could not manually parse URL:", error)
    }

    console.log("📧 Using original email:", rawUserEmail)
    return rawUserEmail
  }

  // Process email on client side only
  useEffect(() => {
    if (isClient) {
      const email = getCorrectEmail()
      setCorrectedEmail(email)
    }
  }, [isClient, searchParams])

  const continueWith = searchParams.get("continueWith")
  const credentialBundle = searchParams.get("credentialBundle")

  // Debug the email parameter (only run once on client side)
  useEffect(() => {
    if (isClient && correctedEmail !== null) {
      console.log("📧 Raw userEmail from searchParams:", searchParams.get("userEmail"))
      console.log("📧 Corrected email:", correctedEmail)
      console.log("📧 Continue with:", continueWith)
      console.log("📧 Has credential bundle:", !!credentialBundle)
      console.log("📧 Full URL:", window.location.href)
    }
  }, [isClient, correctedEmail, continueWith, credentialBundle, searchParams])

  // FIXED: Only run auth completion once when all conditions are met and on client side
  useEffect(() => {
    // Ensure that the authIframeClient is available before attempting to complete the email auth
    // AND ensure we haven't already initiated auth to prevent loops
    // AND ensure we're on the client side
    if (
        isClient &&
        authIframeClient &&
        correctedEmail &&
        continueWith &&
        credentialBundle &&
        !authInitiatedRef.current
    ) {
      // Mark as initiated to prevent re-runs
      authInitiatedRef.current = true

      console.log("📨 Calling completeEmailAuth with email:", correctedEmail)

      // Call the completion function
      completeEmailAuth({
        userEmail: correctedEmail,
        continueWith,
        credentialBundle
      }).catch((error) => {
        console.error("❌ Error completing email auth:", error)
        // Reset the ref so user can try again if there's an error
        authInitiatedRef.current = false
      })
    }
  }, [isClient, authIframeClient, correctedEmail, continueWith, credentialBundle, completeEmailAuth])

  // Show loading state until client-side hydration is complete
  if (!isClient) {
    return (
        <main className="flex w-full flex-col items-center justify-center">
          <Card className="mx-auto h-full w-full sm:w-1/2">
            <CardHeader className="space-y-4">
              <Image
                  src="/wellspring_logo_no_bg.png"
                  alt="Wellspring Logo"
                  width={164}
                  height={164}
                  className="h-62 w-auto mx-auto py-2"
                  priority
              />
              <CardTitle className="flex items-center justify-center text-center">
                <div className="flex items-center gap-2">
                  <Loader className="h-4 w-4 animate-spin text-muted-foreground" />
                  <span className="text-base">Loading...</span>
                </div>
              </CardTitle>
            </CardHeader>
          </Card>
        </main>
    )
  }

  return (
      <main className="flex w-full flex-col items-center justify-center">
        <Card className="mx-auto h-full w-full sm:w-1/2">
          <CardHeader className="space-y-4">
            <Image
                src="/wellspring_logo_no_bg.png"
                alt="Wellspring Logo"
                width={164}
                height={164}
                className="h-62 w-auto mx-auto py-2"
                priority
            />
            <CardTitle className="flex items-center justify-center text-center">
              {credentialBundle ? (
                  <div className="flex items-center gap-2">
                    <Loader className="h-4 w-4 animate-spin text-muted-foreground" />
                    <span className="text-base">Authenticating...</span>
                  </div>
              ) : (
                  <div className="flex items-center gap-2 text-lg font-medium">
                    Confirm your email
                  </div>
              )}
            </CardTitle>
            {!credentialBundle && (
                <CardDescription className="text-center">
                  Click the link sent to{" "}
                  <span className="font-bold">{correctedEmail || "your email"}</span> to sign in.
                </CardDescription>
            )}
          </CardHeader>
        </Card>
      </main>
  )
}

export default function EmailAuth() {
  return (
      <Suspense fallback={
        <main className="flex w-full flex-col items-center justify-center">
          <Card className="mx-auto h-full w-full sm:w-1/2">
            <CardHeader className="space-y-4">
              <Image
                  src="/wellspring_logo_no_bg.png"
                  alt="Wellspring Logo"
                  width={164}
                  height={164}
                  className="h-62 w-auto mx-auto py-2"
                  priority
              />
              <CardTitle className="flex items-center justify-center text-center">
                <div className="flex items-center gap-2">
                  <Loader className="h-4 w-4 animate-spin text-muted-foreground" />
                  <span className="text-base">Loading...</span>
                </div>
              </CardTitle>
            </CardHeader>
          </Card>
        </main>
      }>
        <EmailAuthContent />
      </Suspense>
  )
}