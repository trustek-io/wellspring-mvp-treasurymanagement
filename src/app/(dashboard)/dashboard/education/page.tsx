import Link from "next/link"
import { FileText } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function Education() {
  const resources = [
    {
      title: "Wellspring at a Glance",
      description:
        "Learn how Wellspring combines DeFi and stablecoins to deliver high-yield savings.",
      type: "guide | 6 articles",
      icon: FileText,
      link: "https://wellspring-documentation.notion.site/Overview-229b6a6be39880bf9f4fe833d6e86406",
    },
    {
      title: "Getting Started with Wellspring",
      description:
        "Follow simple steps to set up your account, verify your identity, and start earning.",
      type: "guide | 4 articles",
      icon: FileText,
      link: "https://wellspring-documentation.notion.site/Onboarding-229b6a6be3988049b8a3c3a1f6919deb",
    },
    {
      title: "How DeFi Yields Work",
      description:
        "Understand how your funds earn variable returns through secure, automated DeFi strategies.",
      type: "guide | 7 articles",
      icon: FileText,
      link: "https://wellspring-documentation.notion.site/How-it-Works-229b6a6be398806a8ff8e583d7437639",
    },
    {
      title: "Keeping Your Funds Safe",
      description:
        "Your assets stay self-custodied—Wellspring adds extra security and fraud protection.",
      type: "guide | 4 articles",
      icon: FileText,
      link: "https://wellspring-documentation.notion.site/Security-229b6a6be39880e09b44fb4a904715b6",
    },
  ]

  return (
    <div className="container mx-auto space-y-4 p-2 sm:p-8 lg:space-y-8 xl:px-12 2xl:px-24">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Education</h1>
        <p className="text-muted-foreground">
          Learn more about Wellspring, DeFi yield, stablecoins, and how to
          maximize your returns safely.
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {resources.map((resource, index) => {
          const Icon = resource.icon
          return (
            <Card key={index} className="transition-shadow hover:shadow-md">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-blue-100 p-2">
                      <Icon className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">
                        {resource.title}
                      </CardTitle>
                      <p className="text-sm capitalize text-muted-foreground text-purple-700">
                        {resource.type}
                      </p>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-muted-foreground">
                  {resource.description}
                </p>
                <Button variant="outline" className="w-full">
                  <Link
                    className="w-full"
                    href={resource.link}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Learn more
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>
      <div className="mb-4 text-xs text-muted-foreground">
        The information provided on this page is for educational purposes only
        and is not intended as financial, investment, legal, or tax advice.
        Wellspring is a technology platform and does not offer or imply any
        personalized recommendations or guarantees. All users are solely
        responsible for their own decisions and should consult licensed
        professionals for specific advice related to their individual
        circumstances.
      </div>
    </div>
  )
}
