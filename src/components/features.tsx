import { CheckCircle, GitFork, ShieldCheck } from "lucide-react"

import { Icons } from "@/components/icons"

import Feature from "../components/feature"

export default function Features() {
  return (
    <div className="text-wellspring-navy flex h-full w-full flex-col justify-center gap-16 px-24">
      <Feature
        title="Highest Yield"
        icon={<GitFork className="text-wellspring-navy" />}
      >
        Earn up to 12% APY.
      </Feature>
      <Feature
        title="Non-custodial"
        icon={<CheckCircle className="text-wellspring-navy" />}
      >
        Only you can access your private keys.
      </Feature>

      <Feature
        title="Passwordless"
        icon={
          <Icons.passwordLess className="text-wellspring-navy -mt-1 h-7 w-7" />
        }
      >
        <p className="text-wellspring-navy">
          No need to remember a password or seed phrase. Authentication methods
          include email, passkeys and more.
        </p>
      </Feature>
      <Feature
        title="Secure"
        icon={<ShieldCheck className="text-wellspring-navy" />}
      >
        Scalable, institutional-grade security.
      </Feature>
    </div>
  )
}
