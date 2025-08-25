import Link from "next/link"

import { Button } from "./ui/button"

export default function Legal() {
  return (
    <div className=" py-4 text-center text-xs text-muted-foreground">
      By continuing, you agree to{" "}
      <Button
        variant="link"
        className="h-min p-0 text-xs text-secondary-foreground"
      >
        <Link target="_blank" href="https://wellspring-documentation.notion.site/Terms-of-Service-238b6a6be3988019a06dd806169cc393">
          Terms & Conditions
        </Link>
      </Button>{" "}
      and{" "}
      <Button
        variant="link"
        className="h-min p-0 text-xs text-secondary-foreground"
      >
        <Link target="_blank" href="https://wellspring-documentation.notion.site/Privacy-Policy-238b6a6be3988076a5c1cf678a81f67f">
          Privacy Policy
        </Link>
      </Button>
    </div>
  )
}
