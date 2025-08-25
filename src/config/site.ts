import { SiteConfig } from "@/types"

const baseUrl = `${process.env.NEXT_PUBLIC_APP_URL}`

export const siteConfig: SiteConfig = {
  name: "Wellspring",
  author: "Slava Chabanov",
  description:
    "A high-yield savings platform",
  keywords: [
    "Turnkey",
    "Web3",
    "Next.js",
    "React",
    "Tailwind CSS",
    "Radix UI",
    "shadcn/ui",
  ],
  url: {
    base: baseUrl,
    author: "https://wellspring.money",
  },
  links: {
    github: "https://",
  },
  ogImage: `${baseUrl}/og.jpg`,
}
