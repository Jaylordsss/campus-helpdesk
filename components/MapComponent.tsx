'use client'

import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'

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

function FitBounds({
  userPosition,
  selectedLocation,
}: {
  userPosition: [number, number] | null
  selectedLocation: Location | null
}) {
  const map = useMap()

  useEffect(() => {
    if (
      userPosition &&
      selectedLocation?.latitude &&
      selectedLocation?.longitude
    ) {
      const bounds = L.latLngBounds(
        [userPosition[0], userPosition[1]],
        [selectedLocation.latitude, selectedLocation.longitude]
      )
      map.fitBounds(bounds, { padding: [80, 80] })
    } else if (selectedLocation?.latitude && selectedLocation?.longitude) {
      map.setView([selectedLocation.latitude, selectedLocation.longitude], 19)
    }
  }, [selectedLocation, userPosition, map])

  return null
}

export default function MapComponent({
  center,
  zoom,
  locations,
  userPosition,
  selectedLocation,
  routeCoordinates,
  onLocationClick,
  school,
}: Props) {
  const mapRef = useRef<L.Map | null>(null)

  useEffect(() => {
    // Fix Leaflet default icon issue with Next.js
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (L.Icon.Default.prototype as any)._getIconUrl
    L.Icon.Default.mergeOptions({
      iconRetinaUrl:
        'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl:
        'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl:
        'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    })
  }, [])

  const routeColor = school === 'ISAP' ? '#ef4444' : '#3b82f6'

  const userIcon = L.divIcon({
    html: `<div style="
      width:18px;height:18px;
      background:#3b82f6;
      border:3px solid white;
      border-radius:50%;
      box-shadow:0 0 0 4px rgba(59,130,246,0.25);
    "></div>`,
    className: '',
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  })

  const destinationIcon = L.divIcon({
    html: `<div style="
      width:24px;height:24px;
      background:${routeColor};
      border:3px solid white;
      border-radius:50%;
      box-shadow:0 2px 8px rgba(0,0,0,0.4);
    "></div>`,
    className: '',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  })

  const officeIcon = (locSchool: string, isSelected: boolean) =>
    L.divIcon({
      html: `<div style="
        width:${isSelected ? 20 : 14}px;
        height:${isSelected ? 20 : 14}px;
        background:${
          isSelected
            ? routeColor
            : locSchool === 'ISAP'
            ? '#f87171'
            : '#60a5fa'
        };
        border:2.5px solid white;
        border-radius:50%;
        box-shadow:0 1px 5px rgba(0,0,0,0.3);
      "></div>`,
      className: '',
      iconSize: [isSelected ? 20 : 14, isSelected ? 20 : 14],
      iconAnchor: [isSelected ? 10 : 7, isSelected ? 10 : 7],
    })

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height: '100%', width: '100%' }}
      className="z-0"
      ref={mapRef}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* User location */}
      {userPosition && (
        <Marker position={userPosition} icon={userIcon}>
          <Popup>
            <div style={{ fontSize: '12px', fontWeight: 600, textAlign: 'center' }}>
              📍 Your location
            </div>
          </Popup>
        </Marker>
      )}

      {/* Office markers */}
      {locations.map((loc) => {
        if (!loc.latitude || !loc.longitude) return null
        const isSelected = selectedLocation?.id === loc.id
        return (
          <Marker
            key={loc.id}
            position={[loc.latitude, loc.longitude]}
            icon={officeIcon(loc.school, isSelected)}
          >
            <Popup>
              <div style={{ fontSize: '12px', minWidth: '120px' }}>
                <p style={{ fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
                  {loc.office_name}
                </p>
                <p style={{ color: '#64748b', marginBottom: '2px' }}>{loc.building}</p>
                {loc.room && (
                  <p style={{ color: '#64748b', marginBottom: '8px' }}>{loc.room}</p>
                )}
                <button
                  onClick={() => onLocationClick(loc)}
                  style={{
                    background: routeColor,
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '5px 12px',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    width: '100%',
                  }}
                >
                  Get Directions →
                </button>
              </div>
            </Popup>
          </Marker>
        )
      })}

      {/* Route line — shadow layer */}
      {routeCoordinates && routeCoordinates.length >= 2 && (
        <Polyline
          positions={routeCoordinates}
          pathOptions={{
            color: '#000000',
            weight: 8,
            opacity: 0.12,
          }}
        />
      )}

      {/* Route line — main colored line */}
      {routeCoordinates && routeCoordinates.length >= 2 && (
        <Polyline
          positions={routeCoordinates}
          pathOptions={{
            color: routeColor,
            weight: 5,
            opacity: 1,
            dashArray: '14, 8',
            lineCap: 'round',
            lineJoin: 'round',
          }}
        />
      )}

      {/* Destination marker on top */}
      {selectedLocation?.latitude && selectedLocation?.longitude && (
        <Marker
          position={[selectedLocation.latitude, selectedLocation.longitude]}
          icon={destinationIcon}
          zIndexOffset={1000}
        >
          <Popup>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>
              📍 {selectedLocation.office_name}
            </div>
          </Popup>
        </Marker>
      )}

      <FitBounds
        userPosition={userPosition}
        selectedLocation={selectedLocation}
      />
    </MapContainer>
  )
}