// src/providers/kyc-provider.tsx
"use client"

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react"
import { api } from "@/actions"
import { useAuth } from "@/providers/auth-provider" // ✅ ADD THIS IMPORT

import { useUser } from "@/hooks/use-user"

interface KYCResponse {
  id: string
  full_name: string
  email: string
  type: string
  kyc_link: string
  tos_link: string
  kyc_status: "not_started" | "pending" | "approved" | "rejected" | "incomplete"
  rejection_reasons: string[]
  tos_status: "pending" | "accepted" | "approved"
  created_at: string
  customer_id: string
  persona_inquiry_type: string
}

interface KYCContextType {
  needsKYC: boolean
  setNeedsKYC: (needs: boolean) => void
  isLoading: boolean
  kycData: KYCResponse | null
  checkKYCStatus: () => Promise<void>
  refreshKYCData: () => Promise<void>
}

const KYCContext = createContext<KYCContextType | undefined>(undefined)

// You can set this from your environment variables
const BASE_URL = process.env.NEXT_PUBLIC_BASE_API_URL || "http://localhost:3000"

export function KYCProvider({ children }: { children: ReactNode }) {
  const [needsKYC, setNeedsKYC] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [kycData, setKycData] = useState<KYCResponse | null>(null)
  const { user } = useUser()
  const { state: authState } = useAuth() // ✅ GET AUTH STATE AS FALLBACK

  // ✅ GET EMAIL FROM MULTIPLE SOURCES
  const getUserEmail = useCallback(() => {
    // Priority order: user.email -> authState.user.email -> extract from organization name
    if (user?.email) {
      // console.log("📧 KYC: Using email from user object:", user.email)
      return user.email
    }

    if (authState.user?.email) {
      // console.log("📧 KYC: Using email from auth state:", authState.user.email)
      return authState.user.email
    }

    // Fallback: try to extract email from organization name (format: "Sub Org - email@domain.com")
    if (user?.organization?.organizationName) {
      const orgName = user.organization.organizationName
      if (orgName.includes(" - ") && orgName.includes("@")) {
        const extractedEmail = orgName.split(" - ")[1]
        if (extractedEmail && extractedEmail.includes("@")) {
          console.log("📧 KYC: Extracted email from org name:", extractedEmail)
          return extractedEmail
        }
      }
    }

    console.log("⚠️ KYC: No email available from any source")
    return null
  }, [user, authState])

  // console.log("📧 KYC Provider - user?.email:", user?.email)
  // console.log("📧 KYC Provider - authState.user?.email:", authState.user?.email)
  // console.log("📧 KYC Provider - user object:", user)

  const checkKYCStatus = useCallback(async () => {
    const userEmail = getUserEmail()

    if (!userEmail) {
      console.log("⚠️ KYC: No email available, skipping KYC check")
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      // console.log("🔍 KYC: Checking status for email:", userEmail)

      // Call backend to get/create KYC link
      const response = await api.createKycLink(userEmail)
      console.log("🔍 KYC: API response:", response)

      if (!response) {
        throw new Error(`Couldn't get KycLink`)
      }

      setKycData(response)

      // Show KYC banner if kyc_status is NOT "approved" OR "incomplete" OR tos_status is "pending"
      const kycPassed =
        response.kyc_status === "approved" ||
        response.kyc_status === "incomplete"

      const shouldShowKYC = !kycPassed || response.tos_status === "pending"
      setNeedsKYC(shouldShowKYC)

      // console.log("✅ KYC: Status checked successfully", {
      //   email: userEmail,
      //   kyc_status: response.kyc_status,
      //   tos_status: response.tos_status,
      //   shouldShowKYC,
      // })
    } catch (error) {
      console.error("❌ KYC: Error checking status:", error)
      // On error, assume KYC is needed for safety
      setNeedsKYC(true)
    } finally {
      setIsLoading(false)
    }
  }, [getUserEmail])

  // New method to refresh KYC data using the GET endpoint
  const refreshKYCData = async () => {
    if (!kycData?.id) {
      console.error("❌ KYC: No KYC data ID available for refresh")
      return
    }

    try {
      console.log("🔄 KYC: Refreshing data for ID:", kycData.id)

      // Call the GET endpoint to get updated status
      const response = await api.getKycLink(kycData.id)

      if (!response) {
        throw new Error(`HTTP error! status: ${response}`)
      }

      console.log("✅ KYC: Updated data:", response)

      setKycData(response)

      // Update needsKYC based on the new status

      const kycPassed =
        response.kyc_status === "approved" ||
        response.kyc_status === "incomplete"
      const tosPassed =
        response.tos_status === "accepted" || response.tos_status === "approved"

      const shouldShowKYC = !kycPassed || !tosPassed

      setNeedsKYC(shouldShowKYC)

      console.log("🔄 KYC: Banner should show:", shouldShowKYC, {
        kyc_status: response.kyc_status,
        tos_status: response.tos_status,
      })
    } catch (error) {
      console.error("❌ KYC: Error refreshing data:", error)
    }
  }

  // ✅ IMPROVED: Wait for user data and email to be available
  useEffect(() => {
    const userEmail = getUserEmail()

    if (userEmail) {
      // console.log("✅ KYC: Email available, checking status:", userEmail)
      checkKYCStatus()
    } else if (user !== undefined) {
      // User is loaded but no email - this might be an issue
      console.log("⚠️ KYC: User loaded but no email available")
      setIsLoading(false)
    }
    // If user is still undefined, keep loading
  }, [
    user?.email,
    authState.user?.email,
    user?.organization?.organizationName,
    checkKYCStatus,
    getUserEmail,
    user,
  ])

  return (
    <KYCContext.Provider
      value={{
        needsKYC,
        setNeedsKYC,
        isLoading,
        kycData,
        checkKYCStatus,
        refreshKYCData,
      }}
    >
      {children}
    </KYCContext.Provider>
  )
}

export function useKYC() {
  const context = useContext(KYCContext)
  if (!context) {
    throw new Error("useKYC must be used within a KYCProvider")
  }
  return context
}
