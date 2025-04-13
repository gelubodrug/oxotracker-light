"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AlertCircle } from "lucide-react"

interface ConfirmDeleteDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (password?: string) => void
  title: string
  description: string
  requirePassword?: boolean
}

export function ConfirmDeleteDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  requirePassword = false,
}: ConfirmDeleteDialogProps) {
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")

  const handleConfirm = () => {
    if (requirePassword) {
      if (password === "1111") {
        setError("")
        onConfirm(password)
      } else {
        setError("Incorrect password. Please try again.")
      }
    } else {
      onConfirm()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {requirePassword && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Enter password to confirm deletion:</div>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full"
            />
            {error && (
              <div className="flex items-center text-red-500 text-sm mt-1">
                <AlertCircle className="h-4 w-4 mr-1" />
                {error}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirm}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
