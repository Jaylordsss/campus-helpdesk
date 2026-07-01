'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/src/lib/supabase/client'
import { MapPin, Navigation, Clock, Footprints, X, AlertCircle } from 'lucide-react'
import dynamic from 'next/dynamic'

const MapComponent = dynamic(() => import('@/components/MapComponent'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-100 rounded-2xl">
      <div className="text-center space-y-2">
        <div className="w-6 h-6 border-[3px] border-slate-200 border-t-slate-500 rounded-full animate-spin mx-auto" />
        <p className="text-xs text-slate-400">Loading map...</p>
      </div>
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
  const [locationPermission, setLocationPermission] = useState<'pending' | 'granted' | 'denied'>('pending')

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
  }, [])

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.')
      setLocationPermission('denied')
      return
    }

    navigator.geolocation.getCurrentPosition(
      pos => {
        setUserPosition([pos.coords.latitude, pos.coords.longitude])
        setLocationPermission('granted')
        setLocationError('')
      },
      err => {
        setLocationPermission('denied')
        if (err.code === err.PERMISSION_DENIED) {
          setLocationError('Location access was denied. Please enable it in your browser settings to get directions.')
        } else {
          setLocationError('Could not get your location. Please try again.')
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const getDirections = async (destination: Location) => {
    if (locationPermission === 'denied') {
      setLocationError('Please enable location access to get directions.')
      return
    }

    if (!userPosition) {
      setLocationError('Getting your location... please wait and try again.')
      requestLocation()
      return
    }

    if (!destination.latitude || !destination.longitude) {
      setLocationError('This office does not have coordinates set yet. Please contact the admin.')
      return
    }

    setLoadingRoute(true)
    setSelectedLocation(destination)
    setRouteInfo(null)
    setLocationError('')

    try {
      const url = `https://router.project-osrm.org/route/v1/foot/${userPosition[1]},${userPosition[0]};${destination.longitude},${destination.latitude}?overview=full&geometries=geojson`

      const res = await fetch(url)
      const data = await res.json()

      if (data.code === 'Ok' && data.routes.length > 0) {
        const route = data.routes[0]
        const coords = route.geometry.coordinates.map(
          (c: number[]) => [c[1], c[0]] as [number, number]
        )
        setRouteInfo({
          distance: route.distance,
          duration: route.duration,
          coordinates: coords
        })
      } else {
        setLocationError('Could not find a walking route to this location.')
      }
    } catch {
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

  const filtered = locations.filter(l =>
    filterSchool === 'ALL' || l.school === filterSchool
  )

  const isISAP = profile?.school === 'ISAP'
  const accentBtn = isISAP ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'
  const accentText = isISAP ? 'text-red-600' : 'text-blue-600'
  const accentBanner = isISAP ? 'bg-red-50 border-red-100' : 'bg-blue-50 border-blue-100'

  const formatDistance = (m: number) =>
    m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(2)} km`

  const formatDuration = (s: number) => {
    const mins = Math.round(s / 60)
    if (mins < 60) return `~${mins} min walk`
    return `~${Math.floor(mins / 60)}h ${mins % 60}m walk`
  }

  const mapCenter: [number, number] = locations.find(l => l.latitude && l.longitude)
    ? [
        locations.find(l => l.latitude && l.longitude)!.latitude,
        locations.find(l => l.latitude && l.longitude)!.longitude
      ]
    : [14.5995, 120.9842]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-[3px] border-slate-200 border-t-slate-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4 max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Campus Map</h1>
          <p className="text-sm text-slate-400 mt-1">
            Find offices and get walking directions around campus
          </p>
        </div>

        {/* Location permission button */}
        {locationPermission === 'pending' && (
          <button
            onClick={requestLocation}
            className={`flex items-center gap-2 px-4 py-2.5 text-white text-sm font-semibold rounded-xl transition-all shrink-0 ${accentBtn}`}
          >
            <Navigation size={15} />
            Enable Location
          </button>
        )}
        {locationPermission === 'granted' && (
          <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-100 rounded-xl">
            <div className="w-2 h-2 bg-emerald-400 rounded-full" />
            <span className="text-xs font-semibold text-emerald-700">Location active</span>
          </div>
        )}
      </div>

      {/* Location permission prompt */}
      {locationPermission === 'pending' && (
        <div className={`rounded-2xl border p-4 flex items-start gap-3 ${accentBanner}`}>
          <Navigation size={18} className={`shrink-0 mt-0.5 ${accentText}`} />
          <div>
            <p className={`text-sm font-semibold ${accentText}`}>
              Enable location for directions
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              Click "Enable Location" above to allow the map to show your position and calculate walking routes to campus offices.
            </p>
          </div>
        </div>
      )}

      {/* Route info banner */}
      {selectedLocation && routeInfo && (
        <div className={`rounded-2xl border p-4 ${accentBanner}`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className={`text-sm font-bold ${accentText}`}>
                Directions to {selectedLocation.office_name}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {selectedLocation.building}{selectedLocation.room ? ` · ${selectedLocation.room}` : ''}
              </p>
            </div>
            <button
              onClick={clearRoute}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-white rounded-lg transition-all shrink-0"
            >
              <X size={16} />
            </button>
          </div>
          <div className="flex items-center gap-6 mt-3">
            <div className="flex items-center gap-2">
              <Footprints size={15} className={accentText} />
              <span className="text-sm font-bold text-slate-800">
                {formatDistance(routeInfo.distance)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock size={15} className={accentText} />
              <span className="text-sm font-bold text-slate-800">
                {formatDuration(routeInfo.duration)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Error banner */}
      {locationError && (
        <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 flex items-start gap-2">
          <AlertCircle size={15} className="text-amber-500 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 font-medium">{locationError}</p>
        </div>
      )}

      {/* Map + location list */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Map */}
        <div className="lg:col-span-2 h-[400px] sm:h-[500px] rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
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

          {/* Filter tabs */}
          <div className="flex items-center gap-2">
            {(['ALL', 'ISAP', 'MCNP'] as const).map(s => (
              <button
                key={s}
                onClick={() => setFilterSchool(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filterSchool === s
                    ? s === 'ISAP' ? 'bg-red-100 text-red-700'
                      : s === 'MCNP' ? 'bg-blue-100 text-blue-700'
                      : 'bg-slate-800 text-white'
                    : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-300'
                }`}
              >
                {s}
              </button>
            ))}
            <span className="text-xs text-slate-400 ml-1">{filtered.length}</span>
          </div>

          {/* Scrollable office list */}
          <div className="space-y-2 overflow-y-auto max-h-[460px] pr-1">
            {filtered.map(loc => {
              const isSelected = selectedLocation?.id === loc.id
              const hasCoords = loc.latitude && loc.longitude

              return (
                <div
                  key={loc.id}
                  className={`bg-white rounded-xl border p-4 transition-all ${
                    isSelected
                      ? isISAP
                        ? 'border-red-300 bg-red-50'
                        : 'border-blue-300 bg-blue-50'
                      : 'border-slate-100 hover:border-slate-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      loc.school === 'ISAP' ? 'bg-red-100' : 'bg-blue-100'
                    }`}>
                      <MapPin size={15} className={loc.school === 'ISAP' ? 'text-red-600' : 'text-blue-600'} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-semibold text-slate-900 leading-tight">
                          {loc.office_name}
                        </p>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                          loc.school === 'ISAP' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                        }`}>
                          {loc.school}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">{loc.building}</p>
                      {loc.room && (
                        <p className="text-[11px] text-slate-400">{loc.room}</p>
                      )}

                      {!hasCoords ? (
                        <p className="text-[10px] text-amber-500 mt-1.5 font-medium">
                          No coordinates set yet
                        </p>
                      ) : (
                        <button
                          onClick={() => getDirections(loc)}
                          disabled={loadingRoute && isSelected}
                          className={`mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-white px-3 py-1.5 rounded-lg transition-all disabled:opacity-60 ${accentBtn}`}
                        >
                          <Navigation size={11} />
                          {loadingRoute && isSelected ? 'Getting route...' : 'Get Directions'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}

            {filtered.length === 0 && (
              <div className="bg-white rounded-xl border border-slate-100 p-8 text-center">
                <MapPin size={24} className="text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-400">No locations found</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
          How to use
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { step: '1', text: 'Click "Enable Location" to share your current position' },
            { step: '2', text: 'Browse offices in the list or click markers on the map' },
            { step: '3', text: 'Click "Get Directions" to see the walking route' },
          ].map(item => (
            <div key={item.step} className="flex items-start gap-3">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${accentBtn}`}>
                {item.step}
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">{item.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}