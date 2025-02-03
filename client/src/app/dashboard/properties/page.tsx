"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import UserLocationMap from "@/components/map/map"
import { MapProvider } from "@/contexts/map-context"
import PropertyDataVisualization from "@/components/map/property-data-visualization"

const queryClient = new QueryClient()

export default function Page() {
  return (
    <QueryClientProvider client={queryClient}>
      <MapProvider>
        <div className="container mx-auto p-4 min-h-screen bg-gradient-to-b from-background to-muted/20">
          <div className="max-w-7xl mx-auto space-y-8 py-8">
            <PropertyDataVisualization/>
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight">Location Tracker</h1>
              <p className="text-muted-foreground">
                View your current location and nearby properties on an interactive map.
              </p>
            </div>
            <UserLocationMap />
          </div>
        </div>
      </MapProvider>
    </QueryClientProvider>
  )
}

