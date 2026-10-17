"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, Calendar, MapPin, Users, DollarSign, Copy, AlertTriangle } from "lucide-react"
import { useRouter } from "next/navigation"

interface PurchaseConfirmationProps {
  purchaseId: string
  eventName: string
  transferInitiated: Date
  transferCompleted: Date
  guestCount: number
  totalPrice: number
  onViewBooking?: () => void
  className?: string
  /**
   * Exact refund details that will be sent on-chain. When provided, the
   * refund-claim flow requires an explicit confirmation step showing these
   * values before the request is dispatched.
   */
  refundAmount?: number
  refundAsset?: string
  refundDestination?: string
  /**
   * Dispatches the refund claim request. Only invoked after the user has
   * confirmed the displayed amount/asset/destination.
   */
  onClaimRefund?: (details: {
    amount: number
    asset: string
    destination: string
  }) => void | Promise<void>
}

const PurchaseConfirmation: React.FC<PurchaseConfirmationProps> = ({
  purchaseId,
  eventName,
  transferInitiated,
  transferCompleted,
  guestCount,
  totalPrice,
  onViewBooking,
  className,
  refundAmount,
  refundAsset,
  refundDestination,
  onClaimRefund
}) => {
  const router = useRouter()

  const [isConfirmingRefund, setIsConfirmingRefund] = React.useState(false)
  const [isSubmittingRefund, setIsSubmittingRefund] = React.useState(false)

  const handleViewBooking = () => {
    if (onViewBooking) {
      onViewBooking()
    } else {
      router.push(`/dashboard/event/payment?purchaseId=${purchaseId}`)
    }
  }

  const hasRefundDetails =
    typeof refundAmount === "number" &&
    typeof refundAsset === "string" &&
    refundAsset.length > 0 &&
    typeof refundDestination === "string" &&
    refundDestination.length > 0

  const handleStartRefundClaim = () => {
    if (!hasRefundDetails) return
    setIsConfirmingRefund(true)
  }

  const handleCancelRefundClaim = () => {
    setIsConfirmingRefund(false)
  }

  const handleConfirmRefundClaim = async () => {
    // Guard: the request must never fire unless the user has seen and
    // confirmed the exact amount/asset/destination.
    if (!hasRefundDetails || !isConfirmingRefund || isSubmittingRefund) return

    setIsSubmittingRefund(true)
    try {
      await onClaimRefund?.({
        amount: refundAmount as number,
        asset: refundAsset as string,
        destination: refundDestination as string
      })
    } finally {
      setIsSubmittingRefund(false)
      setIsConfirmingRefund(false)
    }
  }

  const nights = Math.ceil((transferCompleted.getTime() - transferInitiated.getTime()) / (1000 * 60 * 60 * 24))

  return (
    <Card className={`!rounded-3xl !shadow-none border-black/10 w-full max-w-md ${className}`}>
      <CardHeader className="text-center pb-4">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle strokeWidth={1} className="h-8 w-8 text-green-600" />
          </div>
        </div>
        <CardTitle className="text-xl text-green-600">Booking Confirmed!</CardTitle>
        <p className="text-sm text-muted-foreground">
          Your reservation has been secured with TrueStub escrow
        </p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <Calendar className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium">{eventName}</p>
              <p className="text-xs text-muted-foreground">
                {transferInitiated.toLocaleDateString()} - {transferCompleted.toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
              <Users className="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium">{nights} night{nights > 1 ? 's' : ''}</p>
              <p className="text-xs text-muted-foreground">
                {guestCount} guest{guestCount > 1 ? 's' : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <DollarSign strokeWidth={1} className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium">Total Paid</p>
              <p className="text-xs text-muted-foreground">
                ${totalPrice.toFixed(2)} (secured in escrow)
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 p-3 rounded-lg overflow-hidden">
          <p className="text-xs text-muted-foreground flex items-center gap-2">Booking ID <Copy className="w-3 h-3" onClick={() => navigator.clipboard.writeText(purchaseId)} /></p>
          <p className="text-sm font-mono truncate">{purchaseId}</p>
        </div>

        {hasRefundDetails && (
          <div className="border border-black/10 rounded-2xl p-3 space-y-3">
            {isConfirmingRefund ? (
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-sm font-medium">
                    Confirm refund details before submitting
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  This will execute a real on-chain transaction. Please verify the
                  exact amount, asset and destination below.
                </p>
                <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">Amount</span>
                    <span className="text-sm font-medium font-mono">
                      {(refundAmount as number).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">Asset</span>
                    <span className="text-sm font-medium font-mono">
                      {refundAsset}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs text-muted-foreground">Destination</span>
                    <span className="text-sm font-medium font-mono break-all text-right">
                      {refundDestination}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Button
                    onClick={handleConfirmRefundClaim}
                    disabled={isSubmittingRefund}
                    className="w-full cursor-pointer rounded-3xl h-12"
                  >
                    {isSubmittingRefund
                      ? "Submitting refund claim..."
                      : `Confirm refund of ${(refundAmount as number).toFixed(2)} ${refundAsset}`}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleCancelRefundClaim}
                    disabled={isSubmittingRefund}
                    className="w-full cursor-pointer rounded-3xl h-12"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                onClick={handleStartRefundClaim}
                className="w-full cursor-pointer rounded-3xl h-12"
              >
                Claim Refund
              </Button>
            )}
          </div>
        )}

        <div className="space-y-2 pt-4">
          <Button onClick={handleViewBooking} className="w-full cursor-pointer rounded-3xl h-12">
            View Booking Details
          </Button>
          <Button variant="outline" onClick={() => router.push('/dashboard')} className="w-full cursor-pointer rounded-3xl h-12">
            Back to Dashboard
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export { PurchaseConfirmation }
export type { PurchaseConfirmationProps }
