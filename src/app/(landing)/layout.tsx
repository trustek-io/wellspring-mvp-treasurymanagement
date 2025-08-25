import Image from "next/image"
import { Toaster } from "sonner"
import Features from "@/components/features"
import gradient from "../../../public/purple-gradient.png"

interface LandingLayoutProps {
    children: React.ReactNode
}

export default function LandingLayout({ children }: LandingLayoutProps) {
    return (
        <main className="grid h-screen lg:grid-cols-[2fr,3fr]">
            <div className="relative hidden lg:block" style={{ backgroundColor: '#d1e7fd' }}>
                <Image
                    src="/wellspring_logo_no_text_no_bg.png"
                    alt="Wellspring Logo"
                    width={180}
                    height={180}
                    className="absolute top-8 left-8 z-10 h-24 w-auto"
                />
                <Features />
            </div>
            <div className="flex items-center justify-center px-6">
                {children}
                <Toaster />
            </div>
        </main>
    )
}
