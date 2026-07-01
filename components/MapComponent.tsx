'use client'

import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'

// Fix Leaflet icon issue with Next.js
const fixLeafletIcons = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (L.Icon.Default.prototype as any)._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  })
}

const createUserIcon = () => L.divIcon({
  html: `<div style="
    width:18px;height:18px;
    background:#3b82f6;
    border:3px solid white;
    border-radius:50%;
    box-shadow:0 0 0 3px rgba(59,130,246,0.3);
  "></div>`,
  className: '',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
})

const createDestinationIcon = () => L.divIcon({
  html: `<div style="
    width:22px;height:22px;
    background:#ef4444;
    border:3px solid white;
    border-radius:50%;
    box-shadow:0 2px 8px rgba(0,0,0,0.4);
  "></div>`,
  className: '',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
})

const createOfficeIcon = (school: string, isSelected: boolean) => L.divIcon({
  html: `<div style="
    width:${isSelected ? 18 : 14}px;
    height:${isSelected ? 18 : 14}px;
    background:${isSelected ? '#ef4444' : school === 'ISAP' ? '#f87171' : '#60a5fa'};
    border:2px solid white;
    border-radius:50%;
    box-shadow:0 1px 4px rgba(0,0,0,0.3);
    transition:all 0.2s;
  "></div>`,
  className: '',
  iconSize: [isSelected ? 18 : 14, isSelected ? 18 : 14],
  iconAnchor: [isSelected ? 9 : 7, isSelected ? 9 : 7],
})

function FitBounds({
  userPosition,
  selectedLocation
}: {
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
      map.fitBounds(bounds, { padding: [60, 60] })
    } else if (selectedLocation?.latitude && selectedLocation?.longitude) {
      map.setView([selectedLocation.latitude, selectedLocation.longitude], 19)
    }
  }, [selectedLocation, userPosition, map])

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
  useEffect(() => { fixLeafletIcons() }, [])

  const routeColor = school === 'ISAP' ? '#ef4444' : '#3b82f6'

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height: '100%', width: '100%' }}
      className="z-0 rounded-2xl"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* User location marker */}
      {userPosition && (
        <Marker position={userPosition} icon={createUserIcon()}>
          <Popup>
            <div className="text-xs font-semibold text-center">📍 Your location</div>
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
            icon={createOfficeIcon(loc.school, isSelected)}
          >
            <Popup>
              <div className="text-xs space-y-1 min-w-32">
                <p className="font-bold text-slate-900">{loc.office_name}</p>
                <p className="text-slate-500">{loc.building}</p>
                {loc.room && <p className="text-slate-500">{loc.room}</p>}
                <button
                  onClick={() => onLocationClick(loc)}
                  className="mt-2 w-full text-xs font-semibold text-white bg-blue-500 hover:bg-blue-600 px-2 py-1 rounded-lg transition-all"
                >
                  Get directions →
                </button>
              </div>
            </Popup>
          </Marker>
        )
      })}

      {/* Route polyline */}
      {routeCoordinates && routeCoordinates.length > 0 && (
        <>
          {/* Route shadow for depth */}
          <Polyline
            positions={routeCoordinates}
            color="#000"
            weight={6}
            opacity={0.15}
          />
          {/* Main route line */}
          <Polyline
            positions={routeCoordinates}
            color={routeColor}
            weight={4}
            opacity={0.9}
            dashArray="10, 6"
          />
        </>
      )}

      <FitBounds userPosition={userPosition} selectedLocation={selectedLocation} />
    </MapContainer>
  )
}