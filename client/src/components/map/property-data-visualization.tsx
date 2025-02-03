"use client"

import { useState, useMemo, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltip } from "@/components/ui/chart"
import type { PropertyStats, CategoryType, HostVerificationStatus } from "../../../types/property"
import { useQuery } from "@tanstack/react-query"
import { getStats } from "@/actions/property.action"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"

export default function PropertyDataVisualization() {
  const [selectedNeighbourhood, setSelectedNeighbourhood] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>("roomTypes")
  const [hostVerification, setHostVerification] = useState<HostVerificationStatus>("all")

  const {
    data: propertyData,
    isLoading,
    error,
  } = useQuery<PropertyStats[]>({
    queryKey: ["propertyStats", hostVerification],
    queryFn: () => getStats(hostVerification),
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  })

  const handleNeighbourhoodChange = useCallback((value: string) => {
    setSelectedNeighbourhood(value === "allNeighbourhoods" ? null : value)
  }, [])

  const handleCategoryChange = useCallback((value: string) => {
    setSelectedCategory(value as CategoryType)
  }, [])

  const handleVerificationChange = useCallback((value: string) => {
    setHostVerification(value as HostVerificationStatus)
  }, [])

  const filteredData = useMemo(() => {
    if (!propertyData) return []
    
    // Filter for counts above 100 and sort by count in descending order
    const significantData = propertyData
      .filter(item => item.count > 100)
      .sort((a, b) => b.count - a.count)
      
    return significantData
      .filter((item) => !selectedNeighbourhood || item.neighbourhood === selectedNeighbourhood)
      .map((item) => ({
        neighbourhood: item.neighbourhood,
        count: item.count,
        value: item[selectedCategory].join(", "),
      }))
  }, [propertyData, selectedNeighbourhood, selectedCategory])

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Failed to load property data</AlertDescription>
      </Alert>
    )
  }

  if (isLoading) {
    return <Skeleton className="w-full h-[600px]" />
  }

  return (
    <Card className="w-full max-w-7xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Real Estate Data Visualization</CardTitle>
            <CardDescription>Showing neighborhoods with more than 100 properties</CardDescription>
          </div>
          <Badge variant="secondary">
            Showing {filteredData.length} neighborhoods
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <Select onValueChange={handleVerificationChange} defaultValue="all">
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Host Verification" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Hosts</SelectItem>
              <SelectItem value="verified">Verified Hosts</SelectItem>
              <SelectItem value="unconfirmed">Unverified Hosts</SelectItem>
            </SelectContent>
          </Select>

          <Select onValueChange={handleNeighbourhoodChange} defaultValue="allNeighbourhoods">
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select Neighbourhood" />
            </SelectTrigger>
            <SelectContent>
              <ScrollArea className="h-[200px]">
                <SelectItem value="allNeighbourhoods">All Neighbourhoods</SelectItem>
                {filteredData.map((item) => (
                  <SelectItem key={item.neighbourhood} value={item.neighbourhood}>
                    {item.neighbourhood} ({item.count})
                  </SelectItem>
                ))}
              </ScrollArea>
            </SelectContent>
          </Select>

          <Select onValueChange={handleCategoryChange} defaultValue={selectedCategory}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="roomTypes">Room Types</SelectItem>
              <SelectItem value="cancellationPolicies">Cancellation Policies</SelectItem>
              <SelectItem value="hostIdentityVerifiedStatuses">Host Identity Status</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="relative w-full">
          <ChartContainer
            config={{
              count: {
                label: "Number of Properties",
                color: "hsl(var(--primary))",
              },
            }}
            className="h-[400px] w-full"
          >
            <ResponsiveContainer width="100%" height={400}>
              <BarChart 
                data={filteredData}
                margin={{ top: 20, right: 30, left: 40, bottom: 100 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="neighbourhood"
                  angle={-90}
                  textAnchor="end"
                  interval={0}
                  tick={{ 
                    fontSize: 12,
                    fill: "hsl(var(--foreground))",
                  }}
                  height={100}
                />
                <YAxis 
                  tick={{ 
                    fontSize: 12,
                    fill: "hsl(var(--foreground))"
                  }}
                />
                <ChartTooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    const data = payload[0].payload
                    return (
                      <div className="rounded-lg border bg-background p-2 shadow-sm">
                        <div className="grid gap-2">
                          <div className="font-medium">{data.neighbourhood}</div>
                          <div className="font-medium text-muted-foreground">
                            Properties: {data.count}
                          </div>
                          <div className="text-sm border-t pt-2 mt-2">
                            {data.value}
                          </div>
                        </div>
                      </div>
                    )
                  }}
                />
                <Bar 
                  dataKey="count" 
                  fill="var(--color-count)" 
                  radius={[4, 4, 0, 0]}
                  maxBarSize={50}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  )
}