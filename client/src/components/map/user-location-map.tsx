"use client"

import { useEffect, useState } from "react"
import { MapContainer, TileLayer, Marker, Tooltip, Circle } from "react-leaflet"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, MapPin, RefreshCw, Navigation, Crosshair } from "lucide-react"
import "leaflet/dist/leaflet.css"
import L from "leaflet"

// Custom marker icon with a more modern design
const icon = L.icon({
  iconUrl: "https://cdn.jsdelivr.net/npm/@raruto/leaflet-elevation@2.5.0/images/elevation-poi.png",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
  tooltipAnchor: [16, -20],
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

export default function UserLocationMap() {
  const [location, setLocation] = useState<Location | null>(null)
  const [error, setError] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)

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
    <Card className="w-full max-w-4xl mx-auto">
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
                Latitude : {location.lat.toFixed(6)},Longitude {location.lng.toFixed(6)}
              </Badge>
              {typeof location.accuracy === "number" && location.accuracy > 0 && (
                <Badge variant="outline" className="font-mono">
                  Accuracy: ±{Math.round(location.accuracy)}m
                </Badge>
              )}
            </div>

            <div className="h-[400px] w-full rounded-lg overflow-hidden border">
              <MapContainer
                center={[location.lat, location.lng]}
                zoom={16}
                className="h-full w-full"
                zoomControl={true}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {typeof location.accuracy === "number" && location.accuracy > 0 && (
                  <Circle
                    center={[location.lat, location.lng]}
                    radius={location.accuracy}
                    pathOptions={{
                      color: "var(--primary)",
                      fillColor: "var(--primary)",
                      fillOpacity: 0.1,
                      weight: 1,
                    }}
                  />
                )}
                <Marker position={[location.lat, location.lng]} icon={icon}>
                  <Tooltip permanent>
                    <span className="text-sm font-medium">You are here</span>
                  </Tooltip>
                </Marker>
              </MapContainer>
            </div>

            <p className="text-sm text-muted-foreground">Full Address: {location.address}</p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

