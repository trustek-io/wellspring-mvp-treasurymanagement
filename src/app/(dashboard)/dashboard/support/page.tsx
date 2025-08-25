"use client"

import { useState } from "react"
import Link from "next/link"
import { Mail, MessageCircle, Phone } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import ScheduleCallDialog from "@/components/schedule-call-dialog"

export default function Support() {
  const [callDialogShown, setCallDialogShown] = useState(false)

  const supportOptions = [
    {
      title: "Live Chat",
      description: "Get instant help from our support team",
      icon: MessageCircle,
      action: "Start Chat",
      available: "Available 24/7",
      link: "https://t.me/+0YlCOLCBB05mZmYx",
    },
    {
      title: "Email Support",
      description: "Send us a detailed email about your issue",
      icon: Mail,
      action: "Send Email",
      available: "Response within 2-4 hours",
      link: "mailto:andrey@trustek.io",
    },
    {
      title: "Phone Support",
      description: "Speak directly with a support representative",
      icon: Phone,
      action: "Call Now",
      available: "Mon-Fri 9AM-6PM PST",
      handler: () => {
        setCallDialogShown(true)
      },
    },
  ]

  const faqs = [
    {
      question: "What is Wellspring?",
      answer:
        "Wellspring is a consumer app that turns your bank deposits into a high-yield alternative to traditional savings-earning up to 12% APY. You get a dedicated bank account linked directly to DeFi strategies powered by stablecoins, making it easy to route part of your paycheck into secure, automated yield generation.",
    },
    {
      question: "How do I earn yield on my deposits?",
      answer:
        "Once your USD deposit is received, it's converted to stablecoins. These are then deployed into DeFi lending protocols that generate yield through lending and borrowing strategies. Wellspring uses HypurrFi's rigorously tested, audited systems-built on protocols like AAVE v3 and Fraxlend.",
    },
    {
      question: "Is my money safe?",
      answer:
        "Yes. Your funds are protected at every step. USD deposits are converted to stablecoins through Bridge (a Stripe company) and Lead Bank, a regulated community bank. Assets are held in your self-custodial wallet via Turnkey, meaning only you control them. We add extra protection with video call and phone verification for withdrawals-designed to stop fraud before it happens. You can adjust or remove these safeguards anytime.",
    },
    {
      question: "Do I need to understand crypto to use Wellspring?",
      answer:
        "Not at all. Wellspring handles the technical complexity behind the scenes. You get a simple, familiar experience - like setting up direct deposit into a high-yield savings account.",
    },
    {
      question: "Are yields guaranteed?",
      answer:
        "No. Yields are variable and depend on market conditions in the underlying DeFi protocols. While our goal is to offer consistent high returns, rates can fluctuate over time.",
    },
    {
      question: "What are the fees?",
      answer:
        "It’s simple. Wellspring charges a 1% fee on incoming deposits and retains 20% of the yield your savings generate.",
    },
  ]

  return (
    <div className="container mx-auto space-y-4 p-2 sm:p-8 lg:space-y-8 xl:px-12 2xl:px-24">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Support</h1>
        <p className="text-muted-foreground">
          Get help when you need it. We&apos;re here to support you.
        </p>
      </div>

      {/* Contact Options */}
      <div className="grid gap-6 md:grid-cols-3">
        {supportOptions.map((option, index) => {
          const Icon = option.icon
          return (
            <Card key={index}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-blue-100 p-2">
                    <Icon className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{option.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {option.available}
                    </p>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <p className="mb-4 text-muted-foreground">
                  {option.description}
                </p>

                {option.handler ? (
                  <Button
                    className="w-full bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800"
                    onClick={option.handler}
                  >
                    {option.action}
                  </Button>
                ) : (
                  <Button
                    className="w-full bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800"
                  >
                    <Link
                      className="w-full"
                      href={option.link}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {option.action}
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* FAQ */}
      <Card>
        <CardHeader>
          <CardTitle>Frequently Asked Questions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {faqs.map((faq, index) => (
            <div key={index} className="border-b pb-4 last:border-b-0">
              <h3 className="mb-2 font-semibold">{faq.question}</h3>
              <p className="text-muted-foreground">{faq.answer}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <ScheduleCallDialog
        open={callDialogShown}
        onClose={() => setCallDialogShown(false)}
        title="Schedule a Call with Our Support Team"
      />
    </div>
  )
}
