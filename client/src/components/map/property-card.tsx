"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Home, MapPin, Star, User } from 'lucide-react'
import { useMap } from "@/contexts/map-context"
import { cn } from "@/lib/utils"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Property } from "@/actions/property.action"

export function PropertyCard({ property }: { property: Property }) {
  const { selectedProperty, setSelectedProperty } = useMap()
  const isSelected = selectedProperty?._id === property._id
  const [isExpanded, setIsExpanded] = useState(false)

  // Function to truncate text
  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text
    return text.slice(0, maxLength) + '...'
  }

  // Function to handle text display
  const displayText = (text: string, maxLength: number) => {
    if (!text) return ''
    return isExpanded ? text : truncateText(text, maxLength)
  }

  return (
    <Card className={cn("h-full transition-colors", isSelected && "ring-2 ring-primary")}>
      <CardHeader className="p-4">
        <div className="flex flex-col gap-4 items-start justify-between">
          <div className="space-y-1">
            <h3 className="font-semibold leading-none tracking-tight">
              {displayText(property.name, 20)}
            </h3>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {displayText(`${property.neighbourhood}, ${property.country_code}`, 20)}
            </p>
          </div>
          <div className="flex flex-col gap-2 z-50">
            {/* <Badge
              variant={property.instant_bookable ? "default" : "secondary"}
            >
              {property.instant_bookable ? "Instant Book" : "Request to Book"}
            </Badge> */}
            <Badge
              variant={isSelected ? "default" : "secondary"}
              className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
              onClick={() => setSelectedProperty(isSelected ? null : property)}
            >
              {isSelected ? "Hide from Map" : "View in Map"}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-2xl font-bold">${property.price}</p>
            <Badge variant="outline">{property.room_type}</Badge>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-1">
              <Home className="h-4 w-4 text-muted-foreground" />
              <span>{displayText(property.neighbourhood_group, 20)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>Min. {property.minimum_nights} nights</span>
            </div>
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 text-muted-foreground" />
              <span>{property.review_rate_number} Rating</span>
            </div>
            <div className="flex items-center gap-1">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>Host: {property.host_identity_verified}</span>
            </div>
          </div>
          {property.house_rules && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Rules: {displayText(property.house_rules, 20)}
              </p>
              {property.house_rules.length > 20 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  onClick={() => setIsExpanded(!isExpanded)}
                >
                  {isExpanded ? 'Show Less' : 'Show More'}
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}