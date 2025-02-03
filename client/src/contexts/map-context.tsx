"use client"

import { createContext, useContext, useState } from "react"
import type { Property } from "@/actions/property.action"

interface MapContextType {
  selectedProperty: Property | null
  setSelectedProperty: (property: Property | null) => void
}

const MapContext = createContext<MapContextType | undefined>(undefined)

export function MapProvider({ children }: { children: React.ReactNode }) {
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)

  return <MapContext.Provider value={{ selectedProperty, setSelectedProperty }}>{children}</MapContext.Provider>
}

export function useMap() {
  const context = useContext(MapContext)
  if (context === undefined) {
    throw new Error("useMap must be used within a MapProvider")
  }
  return context
}

