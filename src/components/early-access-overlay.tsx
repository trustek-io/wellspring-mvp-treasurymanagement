// src/components/early-access-overlay.tsx
"use client"

import { useEffect, useState } from "react"
import { env } from "@/env.mjs"
import EarlyAccessModal from "@/components/early-access-modal"

interface EarlyAccessOverlayProps {
    children: React.ReactNode
}

const EARLY_ACCESS_STORAGE_KEY = "wellspring_early_access_validated"

export default function EarlyAccessOverlay({ children }: EarlyAccessOverlayProps) {
    const [showModal, setShowModal] = useState(false)
    const [isValidated, setIsValidated] = useState(false)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        // Check if early access is enabled
        if (!env.NEXT_PUBLIC_ENABLE_EARLY_ACCESS) {
            setIsLoading(false)
            setIsValidated(true)
            return
        }

        // Check if user has already validated early access code
        const hasValidated = localStorage.getItem(EARLY_ACCESS_STORAGE_KEY) === "true"

        if (hasValidated) {
            setIsValidated(true)
            setIsLoading(false)
        } else {
            // Show modal after a brief delay for smooth UX
            setTimeout(() => {
                setIsLoading(false)
                setShowModal(true)
            }, 500)
        }
    }, [])

    const handleEarlyAccessSuccess = (code: string) => {
        // Store validation in localStorage
        localStorage.setItem(EARLY_ACCESS_STORAGE_KEY, "true")

        // Optionally store the code for analytics/tracking
        localStorage.setItem("wellspring_early_access_code", code)

        setIsValidated(true)
        setShowModal(false)
    }

    const handleModalClose = () => {
        // Prevent closing the modal unless validated
        // In a real app, you might want to redirect to a landing page
        if (isValidated) {
            setShowModal(false)
        }
    }

    // Don't render anything while loading
    if (isLoading) {
        return (
            <div className="h-screen w-full bg-white flex items-center justify-center">
                <div className="animate-pulse">
                    <div className="w-8 h-8 bg-blue-200 rounded-full"></div>
                </div>
            </div>
        )
    }

    // If early access is disabled or user is validated, show normal content
    if (!env.NEXT_PUBLIC_ENABLE_EARLY_ACCESS || isValidated) {
        return <>{children}</>
    }

    // Show content with overlay and modal
    return (
        <div className="relative">
            {/* Semi-transparent overlay covering entire screen */}
            <div className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-30 pointer-events-none" />

            {/* Blurred content underneath */}
            <div className="filter blur-[1px] pointer-events-none select-none">
                {children}
            </div>

            {/* Early Access Modal */}
            <EarlyAccessModal
                isOpen={showModal}
                onClose={handleModalClose}
                onSuccess={handleEarlyAccessSuccess}
            />
        </div>
    )
}