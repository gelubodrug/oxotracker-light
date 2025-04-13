"use client"

import type React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface SmallCardProps {
  title: string
  value?: number | string
  description?: string
  subValue?: string
  customContent?: React.ReactNode
  onExport?: () => void
}

export function SmallCard({ title, value, description, subValue, customContent, onExport }: SmallCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-sm font-medium">
            {title}
            {description && <span className="ml-1 text-xs font-normal text-muted-foreground">- {description}</span>}
          </CardTitle>
          {onExport && (
            <button
              onClick={onExport}
              className="text-xs flex items-center gap-1 text-muted-foreground hover:text-foreground"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4">
        {customContent ? (
          customContent
        ) : (
          <div>
            <div className="text-2xl font-bold">{value}</div>
            {subValue && <p className="text-xs text-muted-foreground">{subValue}</p>}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
