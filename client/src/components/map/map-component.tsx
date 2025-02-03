"use client"

import { useEffect, useMemo } from "react"
import { MapContainer, TileLayer, Marker, Tooltip, Circle, useMap } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { useMap as useMapContext } from "@/contexts/map-context"
import { Home } from "lucide-react"

// Custom marker icons
const userIcon = L.icon({
  iconUrl: "https://cdn.jsdelivr.net/npm/@raruto/leaflet-elevation@2.5.0/images/elevation-poi.png",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
  tooltipAnchor: [16, -20],
})

const propertyIcon = L.divIcon({
  html: `<div class="bg-primary text-primary-foreground rounded-full p-2">
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-home"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
  </div>`,
  className: "",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
})

function MapUpdater({
  location,
  selectedProperty,
}: {
  location: { lat: number; lng: number }
  selectedProperty: { latitude: number; longitude: number } | null
}) {
  const map = useMap()

  useEffect(() => {
    if (selectedProperty) {
      const bounds = L.latLngBounds(
        [location.lat, location.lng],
        [selectedProperty.latitude, selectedProperty.longitude],
      )
      map.fitBounds(bounds, { padding: [50, 50] })
    } else {
      map.setView([location.lat, location.lng], 16)
    }
  }, [map, location, selectedProperty])

  return null
}

interface MapComponentProps {
  location: {
    lat: number
    lng: number
    accuracy?: number
  }
}

export default function MapComponent({ location }: MapComponentProps) {
  const { selectedProperty } = useMapContext()

  useEffect(() => {
    // Fix for the missing icon issue in production
    delete (L.Icon.Default.prototype as any)._getIconUrl
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
      iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
      shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
    })
  }, [])

  useEffect(() => {
    // Scroll to top when selectedProperty changes
    if (selectedProperty) {
      window.scrollTo({ top: 800, behavior: "smooth" })
    }
  }, [selectedProperty])

  const center = useMemo(() => [location.lat, location.lng] as [number, number], [location.lat, location.lng])

  return (
    <MapContainer center={center} zoom={16} className="h-full w-full" zoomControl={true}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {typeof location.accuracy === "number" && location.accuracy > 0 && (
        <Circle
          center={center}
          radius={location.accuracy}
          pathOptions={{
            color: "var(--primary)",
            fillColor: "var(--primary)",
            fillOpacity: 0.1,
            weight: 1,
          }}
        />
      )}
      <Marker position={center} icon={userIcon}>
        <Tooltip permanent>
          <span className="text-sm font-medium">You are here</span>
        </Tooltip>
      </Marker>

      {selectedProperty && (
        <Marker position={[selectedProperty.location.coordinates[1], selectedProperty.location.coordinates[0]]} icon={propertyIcon}>
          <Tooltip permanent>
            <div className="space-y-1">
              <p className="font-medium">{selectedProperty.neighbourhood}</p>
              <p className="text-sm">$ {selectedProperty.price.toLocaleString()}</p>
            </div>
          </Tooltip>
        </Marker>
      )}

      <MapUpdater 
        location={location} 
        selectedProperty={selectedProperty ? {
          latitude: selectedProperty.location.coordinates[0],
          longitude: selectedProperty.location.coordinates[1]
        } : null} 
      />
    </MapContainer>
  )
}
