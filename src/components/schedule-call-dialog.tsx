"use client"

import { ArrowRight, Calendar, ExternalLink, Video } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface ScheduleCallDialogProps {
  title: string
  open: boolean
  onClose: () => void
  subTitle?: string
}

const ScheduleCallDialog: React.FC<ScheduleCallDialogProps> = ({
  open,
  onClose,
  title,
  subTitle,
}) => {
  const handleScheduleCall = () => {
    window.open("https://zcal.co/chabanov/support", "_blank")
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
            <Video className="h-8 w-8 text-blue-600" />
          </div>
          <DialogTitle className="text-xl font-semibold text-gray-900">
            {title}
          </DialogTitle>
          {subTitle && (
            <DialogDescription className="mt-2 text-gray-600">
              {subTitle}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg bg-gray-50 p-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-gray-600" />
                <span className="text-sm font-medium text-gray-900">
                  10-minute verification call
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Video className="h-5 w-5 text-gray-600" />
                <span className="text-sm font-medium text-gray-900">
                  Video call via Zoom
                </span>
              </div>
              <div className="flex items-center gap-3">
                <ExternalLink className="h-5 w-5 text-gray-600" />
                <span className="text-sm font-medium text-gray-900">
                  Available Monday - Friday, 9 AM - 6 PM PST
                </span>
              </div>
            </div>
          </div>

          <Button
            onClick={handleScheduleCall}
            className="w-full bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700"
            size="lg"
          >
            Schedule Call
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>

          <Button
            onClick={onClose}
            variant="ghost"
            className="w-full text-gray-600 hover:text-gray-800"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default ScheduleCallDialog
