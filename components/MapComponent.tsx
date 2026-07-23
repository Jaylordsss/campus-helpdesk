'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import type { Map as LeafletMap } from 'leaflet'

type Location = {
  id: string
  office_name: string
  building: string
  room: string
  latitude: number
  longitude: number
  school: string
  photo_url?: string | null
  description?: string | null
}

type Props = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  locations: any[]
  selectedId?: string | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSelect?: (loc: any) => void
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export default function MapComponent({ locations, selectedId, onSelect }: Props) {
  const mapRef = useRef<LeafletMap | null>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const userMarkerRef = useRef<import('leaflet').Marker | null>(null)
  const destMarkerRef = useRef<import('leaflet').Marker | null>(null)
  const lineRef = useRef<import('leaflet').Polyline | null>(null)
  const watchIdRef = useRef<number | null>(null)
  const markersRef = useRef<Record<string, import('leaflet').Marker>>({})
  const leafletRef = useRef<typeof import('leaflet') | null>(null)
  const userPosRef = useRef<{ lat: number; lng: number } | null>(null)

  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null)
  const [distance, setDistance] = useState<number | null>(null)
  const [tracking, setTracking] = useState(false)
  const [gpsError, setGpsError] = useState('')

  // ── Draw line from user to destination ─────────────────────────────────
  const drawLine = useCallback((destLat: number, destLng: number) => {
    if (!mapRef.current || !leafletRef.current) return
    const L = leafletRef.current
    const pos = userPosRef.current
    if (!pos) return

    lineRef.current?.remove()
    lineRef.current = L.polyline(
      [[pos.lat, pos.lng], [destLat, destLng]],
      { color: '#10b981', weight: 3, dashArray: '8, 8', opacity: 0.8 }
    ).addTo(mapRef.current)

    const dist = haversineDistance(pos.lat, pos.lng, destLat, destLng)
    setDistance(Math.round(dist))
  }, [])

  // ── Init map ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current) return

    const initMap = async () => {
      const L = (await import('leaflet')).default
      await import('leaflet/dist/leaflet.css')
      leafletRef.current = L

      const map = L.map(mapContainerRef.current!, {
        center: [17.6135, 121.7290],
        zoom: 17,
        zoomControl: true,
      })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(map)

      mapRef.current = map

      locations.forEach(loc => {
        if (!loc.latitude || !loc.longitude) return
        const isISAP = loc.school === 'ISAP'
        const color = isISAP ? '#dc2626' : '#2563eb'

        const icon = L.divIcon({
          html: `
            <div style="
              width:36px;height:36px;border-radius:50% 50% 50% 0;
              background:${color};transform:rotate(-45deg);
              border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);
              display:flex;align-items:center;justify-content:center;
            ">
              <div style="transform:rotate(45deg);color:white;font-size:14px;">📍</div>
            </div>
          `,
          iconSize: [36, 36],
          iconAnchor: [18, 36],
          className: '',
        })

        const marker = L.marker([loc.latitude, loc.longitude], { icon })
          .addTo(map)
          .on('click', () => onSelect?.(loc))

        marker.bindTooltip(loc.office_name, {
          permanent: false,
          direction: 'top',
          offset: [0, -36],
          className: 'custom-tooltip',
        })

        markersRef.current[loc.id] = marker
      })
    }

    initMap()

    return () => {
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current)
      mapRef.current?.remove()
      mapRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── When selectedId changes ───────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !leafletRef.current) return
    const L = leafletRef.current
    const loc = locations.find(l => l.id === selectedId)
    if (!loc?.latitude || !loc?.longitude) return

    mapRef.current.flyTo([loc.latitude, loc.longitude], 18, { duration: 1 })

    destMarkerRef.current?.remove()

    const destIcon = L.divIcon({
      html: `
        <div style="position:relative;width:48px;height:48px;">
          <div style="
            position:absolute;inset:0;border-radius:50%;
            background:rgba(16,185,129,0.3);
            animation:pulse 1.5s ease-in-out infinite;
          "></div>
          <div style="
            position:absolute;inset:8px;border-radius:50%;
            background:#10b981;border:3px solid white;
            display:flex;align-items:center;justify-content:center;
            color:white;font-size:14px;box-shadow:0 2px 8px rgba(0,0,0,0.3);
          ">🏁</div>
        </div>
        <style>@keyframes pulse{0%,100%{transform:scale(1);opacity:0.6}50%{transform:scale(1.4);opacity:0.2}}</style>
      `,
      iconSize: [48, 48],
      iconAnchor: [24, 24],
      className: '',
    })

    destMarkerRef.current = L.marker([loc.latitude, loc.longitude], { icon: destIcon })
      .addTo(mapRef.current)

    drawLine(loc.latitude, loc.longitude)
  }, [selectedId, locations, drawLine])

  // ── Start GPS tracking ────────────────────────────────────────────────────
  const startTracking = async () => {
    if (!navigator.geolocation) {
      setGpsError('GPS not supported on this device')
      return
    }

    setTracking(true)
    setGpsError('')

    const L = (await import('leaflet')).default
    leafletRef.current = L

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        const newPos = { lat: latitude, lng: longitude }
        userPosRef.current = newPos
        setUserPos(newPos)

        userMarkerRef.current?.remove()

        const userIcon = L.divIcon({
          html: `
            <div style="position:relative;width:40px;height:40px;">
              <div style="
                position:absolute;inset:0;border-radius:50%;
                background:rgba(59,130,246,0.3);
                animation:userPulse 1.5s ease-in-out infinite;
              "></div>
              <div style="
                position:absolute;inset:6px;border-radius:50%;
                background:#2563eb;border:3px solid white;
                box-shadow:0 2px 8px rgba(0,0,0,0.4);
                display:flex;align-items:center;justify-content:center;
                color:white;font-size:12px;
              ">👤</div>
            </div>
            <style>@keyframes userPulse{0%,100%{transform:scale(1);opacity:0.5}50%{transform:scale(1.5);opacity:0.1}}</style>
          `,
          iconSize: [40, 40],
          iconAnchor: [20, 20],
          className: '',
        })

        userMarkerRef.current = L.marker([latitude, longitude], { icon: userIcon })
          .addTo(mapRef.current!)
          .bindTooltip('You are here', { permanent: false, direction: 'top' })

        // Update line + distance to selected destination
        const selectedLoc = locations.find(l => l.id === selectedId)
        if (selectedLoc?.latitude && selectedLoc?.longitude) {
          lineRef.current?.remove()
          lineRef.current = L.polyline(
            [[latitude, longitude], [selectedLoc.latitude, selectedLoc.longitude]],
            { color: '#10b981', weight: 3, dashArray: '8, 8', opacity: 0.8 }
          ).addTo(mapRef.current!)

          const dist = haversineDistance(latitude, longitude, selectedLoc.latitude, selectedLoc.longitude)
          setDistance(Math.round(dist))
        }
      },
      (err) => {
        setGpsError('Could not get your location. Please allow location access.')
        setTracking(false)
        console.error(err)
      },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
    )
  }

  const stopTracking = () => {
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    userMarkerRef.current?.remove()
    userMarkerRef.current = null
    lineRef.current?.remove()
    lineRef.current = null
    userPosRef.current = null
    setUserPos(null)
    setDistance(null)
    setTracking(false)
  }

  const formatDistance = (meters: number) => {
    if (meters < 1000) return `${meters} m`
    return `${(meters / 1000).toFixed(1)} km`
  }

  const formatWalkTime = (meters: number) => {
    const minutes = Math.round(meters / 80)
    if (minutes < 1) return 'Less than 1 min'
    if (minutes === 1) return '~1 min walk'
    return `~${minutes} min walk`
  }

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden">
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

      {/* GPS Controls */}
      <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-2">
        <button
          onClick={tracking ? stopTracking : startTracking}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold shadow-lg transition-all"
          style={{
            backgroundColor: tracking ? '#dc2626' : '#2563eb',
            color: '#ffffff',
          }}
        >
          {tracking ? '⏹ Stop GPS' : '📍 Track Me'}
        </button>. 
      </div>

      {/* Distance + walk time indicator */}
      {distance !== null && selectedId && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000]">
          <div className="bg-white rounded-2xl shadow-xl px-5 py-3 flex items-center gap-4 border border-slate-100">
            <div className="text-center">
              <p className="text-xs text-slate-400 font-semibold">DISTANCE</p>
              <p className="text-xl font-black text-slate-900">{formatDistance(distance)}</p>
            </div>
            <div className="w-px h-10 bg-slate-200" />
            <div className="text-center">
              <p className="text-xs text-slate-400 font-semibold">EST. WALK</p>
              <p className="text-sm font-bold text-emerald-600">{formatWalkTime(distance)}</p>
            </div>
            {distance < 20 && (
              <>
                <div className="w-px h-10 bg-slate-200" />
                <p className="text-sm font-bold text-emerald-600 animate-pulse">✅ You arrived!</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* GPS error */}
      {gpsError && (
        <div className="absolute top-14 right-3 z-[1000] bg-red-50 border border-red-200 rounded-xl px-3 py-2 max-w-[200px]">
          <p className="text-xs text-red-600 font-semibold">{gpsError}</p>
        </div>
      )}

      {/* GPS active indicator */}
      {tracking && !gpsError && (
        <div className="absolute top-14 right-3 z-[1000] bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <p className="text-xs text-emerald-700 font-semibold">GPS Active</p>
          </div>
        </div>
      )}
    </div>
  )
}