'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/src/lib/supabase/client'
import { MapPin, Navigation, Clock, Footprints, Filter } from 'lucide-react'
import dynamic from 'next/dynamic'

// Dynamic import to avoid SSR issues with Leaflet
const MapComponent = dynamic(() => import('@/components/MapComponent'), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-100 rounded-2xl">
      <div className="w-6 h-6 border-[3px] border-slate-200 border-t-slate-500 rounded-full animate-spin" />
    </div>
  )
})

type Location = {
  id: string
  office_name: string
  building: string
  room: string
  latitude: number
  longitude: number
  school: string
}

type RouteInfo = {
  distance: number
  duration: number
  coordinates: [number, number][]
}

export default function MapPage() {
  const [locations, setLocations] = useState<Location[]>([])
  const [profile, setProfile] = useState<{ name: string; school: string } | null>(null)
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null)
  const [userPosition, setUserPosition] = useState<[number, number] | null>(null)
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null)
  const [loadingRoute, setLoadingRoute] = useState(false)
  const [filterSchool, setFilterSchool] = useState<'ALL' | 'ISAP' | 'MCNP'>('ALL')
  const [loading, setLoading] = useState(true)
  const [locationError, setLocationError] = useState('')

  useEffect(() => {
    const getData = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profileData } = await supabase
        .from('profiles').select('name, school').eq('id', user.id).single()
      if (profileData) {
        setProfile(profileData)
        setFilterSchool(profileData.school as 'ISAP' | 'MCNP')
      }

      const { data: locData } = await supabase
        .from('locations').select('*').order('school').order('office_name')
      setLocations(locData || [])
      setLoading(false)
    }
    getData()

    // Get user's current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setUserPosition([pos.coords.latitude, pos.coords.longitude]),
        err => setLocationError('Could not get your location. Please enable location access.')
      )
    }
  }, [])

  const getDirections = async (destination: Location) => {
    if (!userPosition) {
      setLocationError('Please enable location access to get directions.')
      return
    }
    if (!destination.latitude || !destination.longitude) {
      setLocationError('This location does not have coordinates set yet.')
      return
    }

    setLoadingRoute(true)
    setSelectedLocation(destination)
    setRouteInfo(null)
    setLocationError('')

    try {
      const [userLng, userLat] = [userPosition[1], userPosition[0]]
      const [destLng, destLat] = [destination.longitude, destination.latitude]

      const url = `https://router.project-osrm.org/route/v1/foot/${userLng},${userLat};${destLng},${destLat}?overview=full&geometries=geojson`
      const res = await fetch(url)
      const data = await res.json()

      if (data.code === 'Ok' && data.routes.length > 0) {
        const route = data.routes[0]
        const coords = route.geometry.coordinates.map((c: number[]) => [c[1], c[0]] as [number, number])
        setRouteInfo({
          distance: route.distance,
          duration: route.duration,
          coordinates: coords
        })
      } else {
        setLocationError('Could not find a route. The destination may be too far.')
      }
    } catch (err) {
      setLocationError('Failed to get directions. Please check your internet connection.')
    } finally {
      setLoadingRoute(false)
    }
  }

  const clearRoute = () => {
    setSelectedLocation(null)
    setRouteInfo(null)
    setLocationError('')
  }

  const filtered = locations.filter(l => filterSchool === 'ALL' || l.school === filterSchool)
  const isISAP = profile?.school === 'ISAP'
  const accentClass = isISAP ? 'text-red-600' : 'text-blue-600'
  const accentBg = isISAP ? 'bg-red-100' : 'bg-blue-100'
  const accentBtn = isISAP ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'

  const formatDistance = (meters: number) => {
    if (meters < 1000) return `${Math.round(meters)}m`
    return `${(meters / 1000).toFixed(1)}km`
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.round(seconds / 60)
    if (mins < 60) return `${mins} min`
    return `${Math.floor(mins / 60)}h ${mins % 60}m`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-[3px] border-slate-200 border-t-slate-500 rounded-full animate-spin" />
      </div>
    )
  }

  // Default center — use first location with coords, or Philippines center
  const mapCenter: [number, number] = locations.find(l => l.latitude && l.longitude)
    ? [locations.find(l => l.latitude && l.longitude)!.latitude, locations.find(l => l.latitude && l.longitude)!.longitude]
    : [14.5995, 120.9842]

  return (
    <div className="space-y-4 max-w-5xl mx-auto">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Campus Map</h1>
        <p className="text-sm text-slate-400 mt-1">Find offices and get walking directions</p>
      </div>

      {/* Route info banner */}
      {selectedLocation && routeInfo && (
        <div className={`rounded-2xl border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3
          ${isISAP ? 'bg-red-50 border-red-100' : 'bg-blue-50 border-blue-100'}`}>
          <div>
            <p className={`text-sm font-bold ${accentClass}`}>
              Directions to {selectedLocation.office_name}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              {selectedLocation.building} · {selectedLocation.room}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <Footprints size={14} className={accentClass} />
              <span className="text-sm font-bold text-slate-800">{formatDistance(routeInfo.distance)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock size={14} className={accentClass} />
              <span className="text-sm font-bold text-slate-800">{formatDuration(routeInfo.duration)}</span>
            </div>
            <button
              onClick={clearRoute}
              className="text-xs font-semibold text-slate-400 hover:text-slate-600 px-3 py-1.5 rounded-lg hover:bg-white transition-all"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {locationError && (
        <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
          <p className="text-xs text-amber-700 font-medium">{locationError}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Map */}
        <div className="lg:col-span-2 h-96 lg:h-[500px] rounded-2xl overflow-hidden border border-slate-200">
          <MapComponent
            center={mapCenter}
            zoom={17}
            locations={filtered}
            userPosition={userPosition}
            selectedLocation={selectedLocation}
            routeCoordinates={routeInfo?.coordinates || null}
            onLocationClick={getDirections}
            school={profile?.school || 'ISAP'}
          />
        </div>

        {/* Location list */}
        <div className="flex flex-col gap-3">

          {/* Filter */}
          <div className="flex items-center gap-2">
            <Filter size={13} className="text-slate-400" />
            {(['ALL', 'ISAP', 'MCNP'] as const).map(s => (
              <button
                key={s}
                onClick={() => setFilterSchool(s)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  filterSchool === s
                    ? s === 'ISAP' ? 'bg-red-100 text-red-700'
                      : s === 'MCNP' ? 'bg-blue-100 text-blue-700'
                      : 'bg-slate-800 text-white'
                    : 'bg-white border border-slate-200 text-slate-500'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Location cards */}
          <div className="space-y-2 overflow-y-auto max-h-[450px] pr-1">
            {filtered.map(loc => (
              <div
                key={loc.id}
                className={`bg-white rounded-xl border p-4 cursor-pointer transition-all hover:border-slate-300 hover:shadow-sm
                  ${selectedLocation?.id === loc.id
                    ? isISAP ? 'border-red-300 bg-red-50' : 'border-blue-300 bg-blue-50'
                    : 'border-slate-100'
                  }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    loc.school === 'ISAP' ? 'bg-red-100' : 'bg-blue-100'
                  }`}>
                    <MapPin size={14} className={loc.school === 'ISAP' ? 'text-red-600' : 'text-blue-600'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-900 truncate">
                      {loc.office_name}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5 truncate">{loc.building}</p>
                    {loc.room && <p className="text-[11px] text-slate-400 truncate">{loc.room}</p>}
                    {!loc.latitude || !loc.longitude ? (
                      <p className="text-[10px] text-amber-400 mt-1">No coordinates</p>
                    ) : (
                      <button
                        onClick={() => getDirections(loc)}
                        disabled={loadingRoute}
                        className={`mt-2 flex items-center gap-1 text-[11px] font-semibold text-white px-2.5 py-1 rounded-lg transition-all disabled:opacity-50 ${accentBtn}`}
                      >
                        <Navigation size={11} />
                        {loadingRoute && selectedLocation?.id === loc.id ? 'Loading...' : 'Directions'}
                      </button>
                    )}
                  </div>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                    loc.school === 'ISAP' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                  }`}>
                    {loc.school}
                  </span>
                </div>
              </div>
            ))}

            {filtered.length === 0 && (
              <div className="bg-white rounded-xl border border-slate-100 p-6 text-center">
                <MapPin size={24} className="text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-400">No locations found</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}