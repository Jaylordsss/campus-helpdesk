'use client'

import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix Leaflet default icon issue with Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

const userIcon = L.divIcon({
  html: `<div style="
    width: 16px; height: 16px; background: #3b82f6;
    border: 3px solid white; border-radius: 50%;
    box-shadow: 0 0 0 3px rgba(59,130,246,0.3);
  "></div>`,
  className: '',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
})

const destinationIcon = L.divIcon({
  html: `<div style="
    width: 20px; height: 20px; background: #ef4444;
    border: 3px solid white; border-radius: 50%;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  "></div>`,
  className: '',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
})

const officeIcon = (school: string) => L.divIcon({
  html: `<div style="
    width: 14px; height: 14px;
    background: ${school === 'ISAP' ? '#ef4444' : '#3b82f6'};
    border: 2px solid white; border-radius: 50%;
    box-shadow: 0 1px 4px rgba(0,0,0,0.2);
  "></div>`,
  className: '',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
})

function FitBounds({ userPosition, selectedLocation }: {
  userPosition: [number, number] | null
  selectedLocation: { latitude: number; longitude: number } | null
}) {
  const map = useMap()

  useEffect(() => {
    if (userPosition && selectedLocation?.latitude && selectedLocation?.longitude) {
      const bounds = L.latLngBounds(
        [userPosition[0], userPosition[1]],
        [selectedLocation.latitude, selectedLocation.longitude]
      )
      map.fitBounds(bounds, { padding: [40, 40] })
    } else if (selectedLocation?.latitude && selectedLocation?.longitude) {
      map.setView([selectedLocation.latitude, selectedLocation.longitude], 18)
    }
  }, [selectedLocation, userPosition])

  return null
}

type Location = {
  id: string
  office_name: string
  building: string
  room: string
  latitude: number
  longitude: number
  school: string
}

type Props = {
  center: [number, number]
  zoom: number
  locations: Location[]
  userPosition: [number, number] | null
  selectedLocation: Location | null
  routeCoordinates: [number, number][] | null
  onLocationClick: (location: Location) => void
  school: string
}

export default function MapComponent({
  center, zoom, locations, userPosition,
  selectedLocation, routeCoordinates, onLocationClick, school
}: Props) {
  const routeColor = school === 'ISAP' ? '#ef4444' : '#3b82f6'

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height: '100%', width: '100%' }}
      className="z-0"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* User location */}
      {userPosition && (
        <Marker position={userPosition} icon={userIcon}>
          <Popup>
            <div className="text-xs font-semibold">📍 Your location</div>
          </Popup>
        </Marker>
      )}

      {/* Office markers */}
      {locations.map(loc => {
        if (!loc.latitude || !loc.longitude) return null
        const isSelected = selectedLocation?.id === loc.id
        return (
          <Marker
            key={loc.id}
            position={[loc.latitude, loc.longitude]}
            icon={isSelected ? destinationIcon : officeIcon(loc.school)}
          >
            <Popup>
              <div className="text-xs">
                <p className="font-bold text-slate-900">{loc.office_name}</p>
                <p className="text-slate-500">{loc.building}</p>
                {loc.room && <p className="text-slate-500">{loc.room}</p>}
                <button
                  onClick={() => onLocationClick(loc)}
                  className="mt-2 text-xs font-semibold text-blue-600 hover:underline"
                >
                  Get directions →
                </button>
              </div>
            </Popup>
          </Marker>
        )
      })}

      {/* Route line */}
      {routeCoordinates && routeCoordinates.length > 0 && (
        <Polyline
          positions={routeCoordinates}
          color={routeColor}
          weight={4}
          opacity={0.8}
          dashArray="8, 4"
        />
      )}

      {/* Fit map to route */}
      <FitBounds userPosition={userPosition} selectedLocation={selectedLocation} />
    </MapContainer>
  )
}