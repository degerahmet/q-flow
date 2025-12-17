"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircle2, XCircle, RefreshCw, Loader2 } from "lucide-react"
import { checkHealth } from "@/lib/api"
import type { HealthCheckResponse } from "@/lib/types/health"

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp)
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

export default function HealthCheckPanel() {
  const [healthStatus, setHealthStatus] = useState<HealthCheckResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchHealthStatus = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const status = await checkHealth()
      setHealthStatus(status)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to check health status")
      setHealthStatus({
        ok: false,
        db: "down",
        ts: new Date().toISOString(),
        message: "Failed to fetch health status",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // Initial load
    fetchHealthStatus()
  }, [])

  const isUp = healthStatus?.ok === true && healthStatus?.db === "up"

  return (
    <Card className="border-slate-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-slate-900">API Health Status</CardTitle>
            <CardDescription className="text-slate-600">
              Monitor the status of the API service
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={fetchHealthStatus}
            disabled={isLoading}
            className="border-slate-300"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
            ) : (
              <RefreshCw className="h-4 w-4 text-slate-500" />
            )}
            <span className="sr-only">Refresh</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Status Badge */}
          <div className="flex items-center gap-3">
            {isUp ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600" />
            )}
            <Badge
              variant={isUp ? "secondary" : "destructive"}
              className={
                isUp
                  ? "bg-green-100 text-green-700 hover:bg-green-100"
                  : "bg-red-100 text-red-700 hover:bg-red-100"
              }
            >
              {isUp ? "Up" : "Down"}
            </Badge>
            {healthStatus?.pgvector && (
              <Badge variant="outline" className="text-slate-600">
                pgvector: {healthStatus.pgvector}
              </Badge>
            )}
          </div>

          {/* Last Check Time */}
          {healthStatus?.ts && (
            <div className="text-sm text-slate-600">
              <span className="font-medium">Last checked:</span>{" "}
              {formatTimestamp(healthStatus.ts)}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Additional Info */}
          {healthStatus?.message && !isUp && (
            <div className="rounded-md bg-yellow-50 border border-yellow-200 p-3">
              <p className="text-sm text-yellow-800">{healthStatus.message}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
