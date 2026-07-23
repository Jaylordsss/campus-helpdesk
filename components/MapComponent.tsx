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
  const outerRef = useRef<HTMLDivElement>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<import('leaflet').Map | null>(null)
  const leafletRef = useRef<typeof import('leaflet') | null>(null)
  const userMarkerRef = useRef<import('leaflet').Marker | null>(null)
  const destMarkerRef = useRef<import('leaflet').Marker | null>(null)
  const lineRef = useRef<import('leaflet').Polyline | null>(null)
  const watchIdRef = useRef<number | null>(null)
  const userPosRef = useRef<{ lat: number; lng: number } | null>(null)
  const markersRef = useRef<Record<string, import('leaflet').Marker>>({})
  const currentBearingRef = useRef<number>(0)
  const [mapReady, setMapReady] = useState(false)

  // ── Apply rotation to inner map container only ───────────────────────────
  const applyRotation = useCallback((bearing: number) => {
    if (!mapContainerRef.current) return
    currentBearingRef.current = bearing
    mapContainerRef.current.style.transform = `rotate(${-bearing}deg)`
    mapContainerRef.current.style.transition = 'transform 0.8s ease'
    mapContainerRef.current.style.transformOrigin = 'center center'
  }, [])

  const resetRotation = useCallback(() => {
    if (!mapContainerRef.current) return
    currentBearingRef.current = 0
    mapContainerRef.current.style.transform = 'rotate(0deg)'
    mapContainerRef.current.style.transition = 'transform 0.8s ease'
  }, [])

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
      })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
      }).addTo(map)

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

  // ── Add markers when map ready ───────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current || !leafletRef.current) return
    const L = leafletRef.current

    Object.values(markersRef.current).forEach(m => m.remove())
    markersRef.current = {}

    locations.forEach(loc => {
      if (!loc.latitude || !loc.longitude) return
      const color = loc.school === 'ISAP' ? '#dc2626' : '#2563eb'

      const icon = L.divIcon({
        html: `
          <div style="
            width:32px;height:32px;
            border-radius:50% 50% 50% 0;
            background:${color};
            transform:rotate(-45deg);
            border:2px solid white;
            box-shadow:0 2px 6px rgba(0,0,0,0.3);
            display:flex;align-items:center;justify-content:center;
          ">
            <div style="transform:rotate(45deg);color:white;font-size:12px;">📍</div>
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

  // ── When selectedId changes ──────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current || !leafletRef.current) return
    const L = leafletRef.current
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const loc = locations.find((l: any) => l.id === selectedId)

    destMarkerRef.current?.remove()
    lineRef.current?.remove()

    if (!loc?.latitude || !loc?.longitude) return

    // Destination marker
    const destIcon = L.divIcon({
      html: `
        <div style="position:relative;width:44px;height:44px;">
          <div style="position:absolute;inset:0;border-radius:50%;background:rgba(16,185,129,0.25);animation:destPulse 1.5s infinite;"></div>
          <div style="position:absolute;inset:8px;border-radius:50%;background:#10b981;border:3px solid white;display:flex;align-items:center;justify-content:center;color:white;font-size:13px;box-shadow:0 2px 6px rgba(0,0,0,0.3);">🏁</div>
        </div>
        <style>@keyframes destPulse{0%,100%{transform:scale(1);opacity:0.6}50%{transform:scale(1.4);opacity:0.1}}</style>
      `,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
      className: '',
    })

    destMarkerRef.current = L.marker([loc.latitude, loc.longitude], { icon: destIcon })
      .addTo(mapRef.current)

    const pos = userPosRef.current
    if (pos) {
      // Draw line
      lineRef.current = L.polyline(
        [[pos.lat, pos.lng], [loc.latitude, loc.longitude]],
        { color: '#10b981', weight: 4, dashArray: '10,8', opacity: 0.85 }
      ).addTo(mapRef.current)

      const dist = haversineDistance(pos.lat, pos.lng, loc.latitude, loc.longitude)
      onTrackingUpdate?.(pos, Math.round(dist))

      // Rotate map to face destination
      const bearing = getBearing(pos.lat, pos.lng, loc.latitude, loc.longitude)
      applyRotation(bearing)

      // Fit both in view
      const bounds = L.latLngBounds([[pos.lat, pos.lng], [loc.latitude, loc.longitude]])
      mapRef.current.fitBounds(bounds, { padding: [80, 80] })
    } else {
      mapRef.current.flyTo([loc.latitude, loc.longitude], 18, { duration: 1 })
    }
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

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const selLoc = locations.find((l: any) => l.id === selectedId)
          if (selLoc?.latitude && selLoc?.longitude) {
            lineRef.current?.remove()
            lineRef.current = L.polyline(
              [[latitude, longitude], [selLoc.latitude, selLoc.longitude]],
              { color: '#10b981', weight: 4, dashArray: '10,8', opacity: 0.85 }
            ).addTo(mapRef.current!)

            const dist = haversineDistance(latitude, longitude, selLoc.latitude, selLoc.longitude)
            onTrackingUpdate?.(newPos, Math.round(dist))

            // Rotate map to face destination from current position
            const bearing = getBearing(latitude, longitude, selLoc.latitude, selLoc.longitude)
            applyRotation(bearing)

            // Keep both in view
            const bounds = L.latLngBounds(
              [[latitude, longitude], [selLoc.latitude, selLoc.longitude]]
            )
            mapRef.current!.fitBounds(bounds, { padding: [70, 70] })
          } else {
            onTrackingUpdate?.(newPos, null)
            mapRef.current!.flyTo([latitude, longitude], 18)
          }
        },
        (err) => { console.error('GPS error:', err) },
        { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
      )
    } else {
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
      resetRotation()
    }

    return () => {
      if (watchIdRef.current && !trackingActive) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackingActive, mapReady, selectedId])

  return (
    // Outer: clipping rectangle — always stays perfectly rectangular
    <div
      ref={outerRef}
      style={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        position: 'relative',
        borderRadius: 'inherit',
      }}
    >
      {/* Inner: oversized map div that rotates inside the clip */}
      <div
        ref={mapContainerRef}
        style={{
          position: 'absolute',
          // Make it 40% bigger on each side so corners don't show when rotated
          top: '-20%',
          left: '-20%',
          width: '140%',
          height: '140%',
          transformOrigin: 'center center',
        }}
      />
    </div>
  )
}