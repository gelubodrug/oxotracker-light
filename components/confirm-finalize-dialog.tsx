"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AlertTriangle, CheckCircle, RefreshCw, Clock, MapPin } from "lucide-react"

interface ConfirmFinalizeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  isSubmitting: boolean
  title: string
  description: string
  assignmentId: number
  km: number
  warning?: string
  realStartDate?: string | null
  realCompletionDate?: string | null
}

export function ConfirmFinalizeDialog({
  open,
  onOpenChange,
  onConfirm,
  isSubmitting,
  title,
  description,
  assignmentId,
  km,
  warning = "*Verifica daca esti in aceasta deplasare ca sa poti finaliza.",
  realStartDate,
  realCompletionDate,
}: ConfirmFinalizeDialogProps) {
  // Convert km to a number to ensure proper comparison
  const kmValue = typeof km === "string" ? Number.parseFloat(km) : km || 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-blue-50 border-blue-200">
        <DialogHeader className="pb-2">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-red-500" />
            <DialogTitle className="text-blue-700">Route (ID {assignmentId})</DialogTitle>
          </div>
          <DialogDescription className="text-blue-600">{description}</DialogDescription>
        </DialogHeader>

        {kmValue === 0 ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-2 p-4 bg-amber-50 border border-amber-200 rounded-md text-amber-700">
              <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium">km sunt zero</p>
                <p className="mt-1">Calculeaza ruta inainte de Finalizare!</p>
                <p className="mt-1">Dupa ce se calculeaza ruta poti Finaliza de acolo direct.</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-700">
              <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm">{warning}</p>
            </div>

            {/* Real timestamps info - always shown */}
            {(realStartDate || realCompletionDate) && (
              <div className="flex flex-col gap-2 p-3 bg-blue-50 border border-blue-200 rounded-md text-blue-700 mt-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-500" />
                  <p className="text-sm font-medium">Timestamps from GPS data:</p>
                </div>
                {realStartDate && <p className="text-sm pl-6">Start: {realStartDate}</p>}
                {realCompletionDate && <p className="text-sm pl-6">Completion: {realCompletionDate}</p>}
              </div>
            )}
          </div>
        )}

        <DialogFooter className="flex justify-center sm:justify-center">
          {kmValue === 0 ? (
            <Button
              onClick={() => {
                onOpenChange(false)
                window.location.href = `/test/assignment-route?id=${assignmentId}`
              }}
              className="bg-orange-50 text-orange-700 hover:bg-orange-100 border-0 rounded-full px-3 py-1 text-sm font-medium flex items-center gap-1"
            >
              <RefreshCw className="h-3.5 w-3.5" />0 km
            </Button>
          ) : (
            <Button onClick={onConfirm} disabled={isSubmitting} className="bg-green-600 hover:bg-green-700 text-white">
              {isSubmitting ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Finalizing...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Finalize
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
