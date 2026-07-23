'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

type Props = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  locations: any[]
  selectedId?: string | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSelect?: (loc: any) => void
  trackingActive?: boolean
  onTrackingUpdate?: (pos: { lat: number; lng: number } | null, distance: number | null) => void
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

function getBearing(lat1: number, lon1: number, lat2: number, lon2: number) {
  const dLon = (lon2 - lon1) * Math.PI / 180
  const y = Math.sin(dLon) * Math.cos(lat2 * Math.PI / 180)
  const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
    Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLon)
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360
}

export default function MapComponent({
  locations, selectedId, onSelect, trackingActive = false, onTrackingUpdate
}: Props) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<import('leaflet').Map | null>(null)
  const leafletRef = useRef<typeof import('leaflet') | null>(null)
  const userMarkerRef = useRef<import('leaflet').Marker | null>(null)
  const destMarkerRef = useRef<import('leaflet').Marker | null>(null)
  const lineRef = useRef<import('leaflet').Polyline | null>(null)
  const watchIdRef = useRef<number | null>(null)
  const userPosRef = useRef<{ lat: number; lng: number } | null>(null)
  const markersRef = useRef<Record<string, import('leaflet').Marker>>({})
  const [mapReady, setMapReady] = useState(false)

  // ── Init map ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current) return

    const initMap = async () => {
      const L = (await import('leaflet')).default
      await import('leaflet/dist/leaflet.css')
      leafletRef.current = L

      const map = L.map(mapContainerRef.current!, {
        center: [17.6135, 121.7290],
        zoom: 17,
        zoomControl: false,
        rotate: true,
      } as import('leaflet').MapOptions)

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
      }).addTo(map)

      // Custom zoom control — top right
      L.control.zoom({ position: 'topright' }).addTo(map)

      mapRef.current = map
      setMapReady(true)
    }

    initMap()

    return () => {
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current)
      mapRef.current?.remove()
      mapRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Add location markers when map ready ─────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current || !leafletRef.current) return
    const L = leafletRef.current

    // Clear old markers
    Object.values(markersRef.current).forEach(m => m.remove())
    markersRef.current = {}

    locations.forEach(loc => {
      if (!loc.latitude || !loc.longitude) return
      const isISAP = loc.school === 'ISAP'
      const color = isISAP ? '#dc2626' : '#2563eb'

      const icon = L.divIcon({
        html: `
          <div style="
            width:32px;height:32px;
            border-radius:50% 50% 50% 0;
            background:${color};
            transform:rotate(-45deg);
            border:2px solid white;
            box-shadow:0 2px 6px rgba(0,0,0,0.3);
          ">
            <div style="transform:rotate(45deg);display:flex;align-items:center;justify-content:center;height:100%;color:white;font-size:12px;">📍</div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        className: '',
      })

      const marker = L.marker([loc.latitude, loc.longitude], { icon })
        .addTo(mapRef.current!)
        .on('click', () => onSelect?.(loc))

      marker.bindTooltip(loc.office_name, {
        permanent: false,
        direction: 'top',
        offset: [0, -32],
      })

      markersRef.current[loc.id] = marker
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, locations])

  // ── Draw line + destination marker ──────────────────────────────────────
  const drawRouteToDestination = useCallback((destLat: number, destLng: number) => {
    if (!mapRef.current || !leafletRef.current) return
    const L = leafletRef.current

    lineRef.current?.remove()
    destMarkerRef.current?.remove()

    // Destination marker
    const destIcon = L.divIcon({
      html: `
        <div style="position:relative;width:44px;height:44px;">
          <div style="position:absolute;inset:0;border-radius:50%;background:rgba(16,185,129,0.25);animation:pulse 1.5s infinite;"></div>
          <div style="position:absolute;inset:8px;border-radius:50%;background:#10b981;border:3px solid white;display:flex;align-items:center;justify-content:center;color:white;font-size:13px;box-shadow:0 2px 6px rgba(0,0,0,0.3);">🏁</div>
        </div>
        <style>@keyframes pulse{0%,100%{transform:scale(1);opacity:0.6}50%{transform:scale(1.4);opacity:0.1}}</style>
      `,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
      className: '',
    })

    destMarkerRef.current = L.marker([destLat, destLng], { icon: destIcon }).addTo(mapRef.current)

    // Draw dashed line if user pos known
    const pos = userPosRef.current
    if (pos) {
      lineRef.current = L.polyline(
        [[pos.lat, pos.lng], [destLat, destLng]],
        { color: '#10b981', weight: 4, dashArray: '10, 8', opacity: 0.85 }
      ).addTo(mapRef.current)

      const dist = haversineDistance(pos.lat, pos.lng, destLat, destLng)
      onTrackingUpdate?.(pos, Math.round(dist))

      // Rotate map to face destination
      const bearing = getBearing(pos.lat, pos.lng, destLat, destLng)
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const m = mapRef.current as any
        if (typeof m.setBearing === 'function') {
          m.setBearing(bearing)
        } else {
          // Fallback: rotate map container
          const container = mapRef.current.getContainer()
          container.style.transform = `rotate(${-bearing}deg)`
          container.style.transition = 'transform 0.5s ease'
        }
      } catch {
        // ignore
      }

      // Fit bounds to show both user and destination
      const bounds = L.latLngBounds([[pos.lat, pos.lng], [destLat, destLng]])
      mapRef.current.fitBounds(bounds, { padding: [60, 60] })
    } else {
      mapRef.current.flyTo([destLat, destLng], 18, { duration: 1 })
    }
  }, [onTrackingUpdate])

  // ── When selectedId changes ───────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current) return
    const loc = locations.find((l: { id: string }) => l.id === selectedId)
    if (!loc?.latitude || !loc?.longitude) {
      destMarkerRef.current?.remove()
      lineRef.current?.remove()
      return
    }
    drawRouteToDestination(loc.latitude, loc.longitude)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, mapReady])

  // ── GPS tracking ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !leafletRef.current) return
    const L = leafletRef.current

    if (trackingActive) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords
          const newPos = { lat: latitude, lng: longitude }
          userPosRef.current = newPos

          // Update user marker
          userMarkerRef.current?.remove()
          const userIcon = L.divIcon({
            html: `
              <div style="position:relative;width:36px;height:36px;">
                <div style="position:absolute;inset:0;border-radius:50%;background:rgba(37,99,235,0.25);animation:userP 1.5s infinite;"></div>
                <div style="position:absolute;inset:5px;border-radius:50%;background:#2563eb;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;color:white;font-size:11px;">👤</div>
              </div>
              <style>@keyframes userP{0%,100%{transform:scale(1);opacity:0.5}50%{transform:scale(1.6);opacity:0.1}}</style>
            `,
            iconSize: [36, 36],
            iconAnchor: [18, 18],
            className: '',
          })
          userMarkerRef.current = L.marker([latitude, longitude], { icon: userIcon })
            .addTo(mapRef.current!)
            .bindTooltip('You are here', { direction: 'top' })

          // Update route to selected destination
          const selLoc = locations.find((l: { id: string }) => l.id === selectedId)
          if (selLoc?.latitude && selLoc?.longitude) {
            lineRef.current?.remove()
            lineRef.current = L.polyline(
              [[latitude, longitude], [selLoc.latitude, selLoc.longitude]],
              { color: '#10b981', weight: 4, dashArray: '10, 8', opacity: 0.85 }
            ).addTo(mapRef.current!)

            const dist = haversineDistance(latitude, longitude, selLoc.latitude, selLoc.longitude)
            onTrackingUpdate?.(newPos, Math.round(dist))

            // Rotate map toward destination
            const bearing = getBearing(latitude, longitude, selLoc.latitude, selLoc.longitude)
            try {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const m = mapRef.current as any
              if (typeof m.setBearing === 'function') {
                m.setBearing(bearing)
              } else {
                const container = mapRef.current!.getContainer()
                container.style.transform = `rotate(${-bearing}deg)`
                container.style.transition = 'transform 0.8s ease'
              }
            } catch { /* ignore */ }

            // Keep both in view
            const bounds = L.latLngBounds([[latitude, longitude], [selLoc.latitude, selLoc.longitude]])
            mapRef.current!.fitBounds(bounds, { padding: [60, 60] })
          } else {
            onTrackingUpdate?.(newPos, null)
            mapRef.current!.flyTo([latitude, longitude], 18)
          }
        },
        (err) => { console.error('GPS error:', err) },
        { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
      )
    } else {
      // Stop tracking
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
      userMarkerRef.current?.remove()
      userMarkerRef.current = null
      lineRef.current?.remove()
      lineRef.current = null
      userPosRef.current = null
      onTrackingUpdate?.(null, null)

      // Reset map rotation
      try {
        const container = mapRef.current?.getContainer()
        if (container) container.style.transform = 'rotate(0deg)'
      } catch { /* ignore */ }
    }

    return () => {
      if (watchIdRef.current && !trackingActive) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackingActive, mapReady, selectedId])

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
    </div>
  )
}