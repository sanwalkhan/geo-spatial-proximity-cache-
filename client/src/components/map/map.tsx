"use client"

import { useEffect, useState } from "react"
import { useInfiniteQuery } from "@tanstack/react-query"
import { useInView } from "react-intersection-observer"
import dynamic from "next/dynamic"
import { Loader2, MapPin, RefreshCw, Navigation, Crosshair } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { getProperties, type Property } from "@/actions/property.action"
import { PropertyCard } from "./property-card"

// Dynamically import the Map component with no SSR
const MapComponent = dynamic(() => import("./map-component"), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center h-[400px] bg-muted/10 rounded-lg">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground mt-2">Loading map...</p>
    </div>
  ),
})

interface Location {
  lat: number
  lng: number
  address: string
  city?: string
  country?: string
  accuracy?: number
}

interface GeolocationError extends Error {
  code: number
  message: string
}

const options = {
  enableHighAccuracy: true,
  timeout: 5000,
  maximumAge: 0,
}

const ITEMS_PER_PAGE = 50;



export default function UserLocationMap() {
  const [location, setLocation] = useState<Location | null>(null)
  const [error, setError] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const { ref, inView } = useInView()

  const {
    data: propertiesData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status,
    isError: isPropertiesError,
  } = useInfiniteQuery({
    queryKey: ["properties", location?.lat, location?.lng],
    queryFn: async ({ pageParam = 1 }) => {
      if (!location) return { properties: [], nextPage: null, totalCount: 0 }
      const response = await getProperties(location.lat, location.lng, pageParam, ITEMS_PER_PAGE)
      return {
        properties: response.properties || [],
        nextPage: response.hasMore ? pageParam + 1 : null,
        totalCount: response.totalCount,
      }
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    enabled: !!location,
  })

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage])

  const getLocation = async () => {
    setIsLoading(true)
    setError("")

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, options)
      })

      const { latitude, longitude, accuracy } = position.coords

      // Fetch location details using OpenStreetMap's Nominatim API
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
      )

      if (!response.ok) {
        throw new Error("Failed to fetch location details")
      }

      const data = await response.json()

      setLocation({
        lat: latitude,
        lng: longitude,
        accuracy: accuracy || 0,
        address: data.display_name,
        city: data.address?.city || data.address?.town || data.address?.village || data.address?.suburb,
        country: data.address?.country,
      })
    } catch (err) {
      const geolocationError = err as GeolocationError
      let errorMessage = "Failed to get your location. Please try again."

      if (geolocationError.code === 1) {
        errorMessage = "Location access denied. Please enable location services and refresh."
      } else if (geolocationError.code === 2) {
        errorMessage = "Location unavailable. Please check your GPS or network connection."
      } else if (geolocationError.code === 3) {
        errorMessage = "Location request timed out. Please try again."
      }

      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if ("geolocation" in navigator) {
      getLocation()
    } else {
      setError("Geolocation is not supported by your browser")
      setIsLoading(false)
    }
  }, [])

  return (
    <div className="space-y-8">
      <Card className="w-full max-w-7xl mx-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Navigation className="h-6 w-6 text-primary" />
              <CardTitle>Your Current Location</CardTitle>
            </div>
            <Button variant="outline" size="sm" onClick={getLocation} disabled={isLoading} className="gap-2">
              <RefreshCw className={isLoading ? "animate-spin" : ""} />
              Update Location
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Getting your precise location...</p>
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : location ? (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {location.city || "Unknown City"}
                </Badge>
                {location.country && <Badge variant="outline">{location.country}</Badge>}
                <Badge variant="secondary" className="font-mono flex items-center gap-1">
                  <Crosshair className="h-3 w-3" />
                  {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                </Badge>
                {typeof location.accuracy === "number" && location.accuracy > 0 && (
                  <Badge variant="outline" className="font-mono">
                    Accuracy: ±{Math.round(location.accuracy)}m
                  </Badge>
                )}
              </div>

              <div className="h-[400px] w-full rounded-lg overflow-hidden border">
                {location && <MapComponent location={location} />}
              </div>

              <p className="text-sm text-muted-foreground">Full Address: {location.address}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {status === "loading" && (
        <div className="flex justify-center py-8">
          <div className="flex items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <p>Loading properties...</p>
          </div>
        </div>
      )}

      {isPropertiesError && (
        <Alert variant="destructive" className="max-w-4xl mx-auto">
          <AlertDescription>Failed to load properties. Please try again.</AlertDescription>
        </Alert>
      )}

      {status === "success" && propertiesData?.pages[0]?.properties?.length > 0 ? (
        <div className="space-y-4 max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Nearby Properties</h2>
            <Badge variant="secondary">
              {propertiesData.pages.reduce((acc, page) => acc + page.properties.length, 0)} properties found
            </Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {propertiesData.pages.map((page) =>
              page.properties.map((property: Property) => (
                <PropertyCard key={property.id} property={property} />
              )),
            )}
          </div>
          <div ref={ref} className="flex justify-center py-4">
            {isFetchingNextPage ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <p className="text-sm text-muted-foreground">Loading more properties...</p>
              </div>
            ) : hasNextPage ? (
              <p className="text-sm text-muted-foreground">Load more</p>
            ) : (
              <p className="text-sm text-muted-foreground">No more properties to load</p>
            )}
          </div>
        </div>
      ) : status === "success" ? (
        <Alert className="max-w-4xl mx-auto">
          <AlertDescription>No properties found in this area.</AlertDescription>
        </Alert>
      ) : null}
    </div>
  )
}

