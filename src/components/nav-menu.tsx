"use client"

import Link from "next/link"
import Image from "next/image"

import Account from "./account"
import { MobileMenuButton } from "./dashboard-sidebar"

export default function NavMenu() {
    return (
        <div className="flex h-[5rem] items-center justify-between gap-4 bg-white p-4 sm:px-10 ">
            <div className="flex items-center gap-3">
                {/* Mobile Menu Button - only shows on mobile */}
                <MobileMenuButton />

                <Link href="/dashboard" className="flex items-center gap-3">
                    <Image
                        src="/wellspring_logo_no_bg.png"
                        alt="Wellspring Logo"
                        width={140}
                        height={40}
                        className="h-8 w-auto sm:h-10 rounded-lg"
                    />
                </Link>
            </div>

            <div className="flex items-center justify-center gap-4">
                <Account />
            </div>
        </div>
    )
}