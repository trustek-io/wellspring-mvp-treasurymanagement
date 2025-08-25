// src/components/early-access-modal.tsx
"use client"

import { useState } from "react"
import { Eye, EyeOff, Lock, Sparkles } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"

interface EarlyAccessModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: (code: string) => void
}

export default function EarlyAccessModal({
                                             isOpen,
                                             onClose,
                                             onSuccess,
                                         }: EarlyAccessModalProps) {
    const [code, setCode] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [showCode, setShowCode] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!code.trim()) {
            toast.error("Please enter an early access code")
            return
        }

        setIsLoading(true)

        try {
            // Simulate API call to validate the code
            // In a real implementation, you would call your backend API here
            await new Promise(resolve => setTimeout(resolve, 500))

            const validCodes = [
                "WS25",
                "X9T2B7QW",
                "A4MZ81KP",
                "J7NR5L2D",
                "V3XE9YTA",
                "H6QD4UZM",
                "P1KX7V9R",
                "B8LY2CWN",
                "E5TZ9MGA",
                "W2FN3KJQ",
                "C9R6XU4B"
            ]
            if (validCodes.includes(code.trim().toUpperCase())) {
                toast.success("Early access code accepted! Welcome to Wellspring.")
                onSuccess(code)
                onClose()
            } else {
                toast.error("Invalid early access code. Please try again.")
            }
        } catch (error) {
            toast.error("Failed to validate code. Please try again.")
        } finally {
            setIsLoading(false)
        }
    }

    const handleClose = () => {
        if (!isLoading) {
            onClose()
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={() => {}}>
            <DialogContent
                className="sm:max-w-md [&>button]:hidden"
                onPointerDownOutside={(e) => e.preventDefault()}
                onEscapeKeyDown={(e) => e.preventDefault()}
            >
                <DialogHeader className="text-center space-y-3">
                    <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <Sparkles className="w-6 h-6 text-blue-600" />
                    </div>
                    <DialogTitle className="text-xl font-semibold">
                        Welcome to Wellspring Early Access
                    </DialogTitle>
                    <DialogDescription className="text-sm text-muted-foreground">
                        Enter your early access code to unlock the full Wellspring experience
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="early-access-code" className="text-sm font-medium">
                            Early Access Code
                        </Label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                id="early-access-code"
                                type={showCode ? "text" : "password"}
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                placeholder="Enter your code"
                                className="pl-10 pr-10"
                                disabled={isLoading}
                                autoFocus
                            />
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
                                onClick={() => setShowCode(!showCode)}
                                disabled={isLoading}
                            >
                                {showCode ? (
                                    <EyeOff className="w-4 h-4" />
                                ) : (
                                    <Eye className="w-4 h-4" />
                                )}
                            </Button>
                        </div>
                    </div>

                    <div className="flex flex-col space-y-2">
                        <Button
                            type="submit"
                            disabled={isLoading || !code.trim()}
                            className="w-full bg-blue-600 hover:bg-blue-700"
                        >
                            {isLoading ? "Validating..." : "Access Wellspring"}
                        </Button>
                    </div>
                </form>

                <div className="text-center">
                    <p className="text-xs text-muted-foreground">
                        Don&apos;t have a code?{" "}
                        <Button
                            variant="link"
                            className="h-auto p-0 text-xs"
                            asChild
                        >
                            <a
                                href="https://t.me/+0YlCOLCBB05mZmYx"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Request here
                            </a>
                        </Button>
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    )
}