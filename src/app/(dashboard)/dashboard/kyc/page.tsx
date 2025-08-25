"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import {
    CheckCircle,
    FileText,
    Camera,
    CreditCard,
    ArrowLeft,
    ArrowRight
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

const steps = [
    {
        id: 1,
        title: "Personal Information",
        description: "Provide your basic personal details",
        icon: FileText,
        status: "pending" as const
    },
    {
        id: 2,
        title: "Identity Verification",
        description: "Upload a government-issued ID",
        icon: Camera,
        status: "pending" as const
    },
    {
        id: 3,
        title: "Address Verification",
        description: "Confirm your residential address",
        icon: CreditCard,
        status: "pending" as const
    },
    {
        id: 4,
        title: "Review & Submit",
        description: "Review your information and submit",
        icon: CheckCircle,
        status: "pending" as const
    }
]

export default function KYCProcess() {
    const router = useRouter()
    const [currentStep, setCurrentStep] = useState(1)
    const progress = (currentStep / steps.length) * 100

    const handleBack = () => {
        router.push("/dashboard")
    }

    const handleNext = () => {
        if (currentStep < steps.length) {
            setCurrentStep(currentStep + 1)
        } else {
            // KYC process completed
            router.push("/dashboard")
        }
    }

    const handlePrevious = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1)
        }
    }

    return (
        <div className="container mx-auto max-w-4xl space-y-6 p-6 sm:p-8">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleBack}
                    className="h-10 w-10"
                >
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">
                        Account Verification
                    </h1>
                    <p className="text-gray-600">
                        Complete your identity verification to start earning yield
                    </p>
                </div>
            </div>

            {/* Progress Bar */}
            <Card>
                <CardContent className="pt-6">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                Step {currentStep} of {steps.length}
              </span>
                            <span className="text-sm text-gray-500">
                {Math.round(progress)}% Complete
              </span>
                        </div>
                        <Progress value={progress} className="h-2" />
                    </div>
                </CardContent>
            </Card>

            {/* Steps Overview */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {steps.map((step) => {
                    const Icon = step.icon
                    const isActive = step.id === currentStep
                    const isCompleted = step.id < currentStep

                    return (
                        <Card
                            key={step.id}
                            className={`${
                                isActive
                                    ? "border-blue-500 bg-blue-50"
                                    : isCompleted
                                        ? "border-green-500 bg-green-50"
                                        : "border-gray-200"
                            }`}
                        >
                            <CardContent className="p-4">
                                <div className="flex flex-col items-center text-center space-y-3">
                                    <div className={`
                    flex h-12 w-12 items-center justify-center rounded-full
                    ${isActive
                                        ? "bg-blue-100 text-blue-600"
                                        : isCompleted
                                            ? "bg-green-100 text-green-600"
                                            : "bg-gray-100 text-gray-400"
                                    }
                  `}>
                                        <Icon className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-sm">{step.title}</h3>
                                        <p className="text-xs text-gray-600 mt-1">
                                            {step.description}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>

            {/* Current Step Content */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                            {React.createElement(steps[currentStep - 1].icon, {
                                className: "h-5 w-5 text-blue-600"
                            })}
                        </div>
                        {steps[currentStep - 1].title}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center justify-center py-12">
                        <div className="text-center space-y-4">
                            <div className="h-32 w-32 mx-auto bg-gray-100 rounded-lg flex items-center justify-center">
                <span className="text-gray-400 text-sm">
                  KYC Step {currentStep} Content
                </span>
                            </div>
                            <p className="text-gray-600 max-w-md">
                                This is a placeholder for the {steps[currentStep - 1].title.toLowerCase()} form.
                                In a real implementation, this would contain the actual verification forms
                                and file upload components.
                            </p>
                        </div>
                    </div>

                    {/* Navigation Buttons */}
                    <div className="flex justify-between">
                        <Button
                            variant="outline"
                            onClick={handlePrevious}
                            disabled={currentStep === 1}
                        >
                            Previous
                        </Button>
                        <Button
                            onClick={handleNext}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            {currentStep === steps.length ? "Submit" : "Continue"}
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}