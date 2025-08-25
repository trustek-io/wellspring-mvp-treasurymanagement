"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
    Home,
    Building2,
    TrendingUp,
    User,
    BookOpen,
    HelpCircle,
    ChevronRight,
    Menu,
    X,
    Zap
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"

// Navigation items configuration
const overviewItems = [
    {
        title: "Home",
        href: "/dashboard",
        icon: Home,
    },
    {
        title: "Funding Portal",
        href: "/dashboard/funding",
        icon: Building2,
    },
    {
        title: "Transaction History",
        href: "/dashboard/transactions",
        icon: TrendingUp,
    },
]

const managementItems = [
    {
        title: "Profile Settings",
        href: "/dashboard/profile",
        icon: User,
    },
    {
        title: "Education",
        href: "/dashboard/education",
        icon: BookOpen,
    },
    {
        title: "Support",
        href: "/dashboard/support",
        icon: HelpCircle,
    },
    // {
    //     title: "ZeroDev Test",
    //     href: "/dashboard/zerodev-test",
    //     icon: Zap,
    // },
]

interface NavItemProps {
    title: string
    href: string
    icon: React.ElementType
    isActive?: boolean
    onClick?: () => void
}

function NavItem({ title, href, icon: Icon, isActive, onClick }: NavItemProps) {
    return (
        <Link href={href} onClick={onClick}>
            <Button
                variant="ghost"
                className={cn(
                    "w-full justify-start gap-3 h-12 px-4 text-gray-600 hover:text-gray-900 hover:bg-gray-50",
                    isActive && "bg-wellspring-very-light-blue text-wellspring-blue hover:bg-wellspring-very-light-blue hover:text-wellspring-blue"
                )}
            >
                <Icon className="h-5 w-5" />
                <span className="font-medium">{title}</span>
                {isActive && <ChevronRight className="h-4 w-4 ml-auto" />}
            </Button>
        </Link>
    )
}

// Sidebar Content Component (shared between desktop and mobile)
function SidebarContent({ onItemClick }: { onItemClick?: () => void }) {
    const pathname = usePathname()

    return (
        <div className="flex h-full w-64 flex-col bg-white">
            {/* Navigation */}
            <nav className="flex-1 space-y-1 px-4 py-6">
                {/* Overview Section */}
                <div className="pb-4">
                    <div className="px-3 py-2">
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            OVERVIEW
                        </h3>
                    </div>
                    <div className="space-y-1">
                        {overviewItems.map((item) => (
                            <NavItem
                                key={item.href}
                                title={item.title}
                                href={item.href}
                                icon={item.icon}
                                isActive={pathname === item.href}
                                onClick={onItemClick}
                            />
                        ))}
                    </div>
                </div>

                <Separator className="mx-3" />

                {/* Management Section */}
                <div className="pt-4">
                    <div className="px-3 py-2">
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            MANAGEMENT
                        </h3>
                    </div>
                    <div className="space-y-1">
                        {managementItems.map((item) => (
                            <NavItem
                                key={item.href}
                                title={item.title}
                                href={item.href}
                                icon={item.icon}
                                isActive={pathname === item.href}
                                onClick={onItemClick}
                            />
                        ))}
                    </div>
                </div>
            </nav>
        </div>
    )
}

// Mobile Menu Button Component
export function MobileMenuButton() {
    const [isOpen, setIsOpen] = useState(false)

    return (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden"
                    aria-label="Open menu"
                >
                    <Menu className="h-6 w-6" />
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64">
                <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                <SidebarContent onItemClick={() => setIsOpen(false)} />
            </SheetContent>
        </Sheet>
    )
}

// Desktop Sidebar Component
interface SidebarProps {
    className?: string
}

export default function DashboardSidebar({ className }: SidebarProps) {
    return (
        <div className={cn("hidden md:flex border-r border-gray-200", className)}>
            <SidebarContent />
        </div>
    )
}