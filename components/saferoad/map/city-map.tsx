'use client'

import {
  CircleMarker,
  MapContainer,
  Polyline,
  TileLayer,
  Tooltip,
} from 'react-leaflet'
import {
  ALMATY_CENTER,
  RISK_COLORS,
  type LatLng,
  type Segment,
} from '@/lib/city-data'

interface CityMapProps {
  segments: Segment[]
  selectedId?: string | null
  onSelect?: (id: string) => void
  showRoutes?: boolean
  fastestRoute?: LatLng[]
  saferoadRoute?: LatLng[]
  start?: LatLng
  end?: LatLng
  /** dim segments to focus on routes */
  dimSegments?: boolean
}

export default function CityMap({
  segments,
  selectedId,
  onSelect,
  showRoutes = false,
  fastestRoute,
  saferoadRoute,
  start,
  end,
  dimSegments = false,
}: CityMapProps) {
  return (
    <MapContainer
      center={ALMATY_CENTER}
      zoom={13}
      zoomControl
      className="h-full w-full"
      style={{ background: '#0a0d15' }}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; OpenStreetMap &copy; CARTO'
        subdomains="abcd"
        maxZoom={19}
      />

      {segments.map((seg) => {
        const isSelected = seg.id === selectedId
        return (
          <Polyline
            key={seg.id}
            positions={seg.coords}
            eventHandlers={{
              click: () => onSelect?.(seg.id),
            }}
            pathOptions={{
              color: RISK_COLORS[seg.level],
              weight: isSelected ? 9 : 6,
              opacity: dimSegments && !isSelected ? 0.25 : isSelected ? 1 : 0.85,
              lineCap: 'round',
            }}
          >
            <Tooltip sticky direction="top" offset={[0, -6]}>
              <div className="text-xs">
                <div className="font-semibold">{seg.name}</div>
                <div>
                  Risk {seg.riskScore} · {seg.level.toUpperCase()}
                </div>
              </div>
            </Tooltip>
          </Polyline>
        )
      })}

      {showRoutes && fastestRoute && (
        <Polyline
          positions={fastestRoute}
          pathOptions={{
            color: '#dc2626',
            weight: 5,
            opacity: 0.9,
            dashArray: '2, 10',
            lineCap: 'round',
          }}
        >
          <Tooltip sticky>Fastest Route — high exposure</Tooltip>
        </Polyline>
      )}

      {showRoutes && saferoadRoute && (
        <Polyline
          positions={saferoadRoute}
          pathOptions={{
            color: '#2563eb',
            weight: 6,
            opacity: 1,
            lineCap: 'round',
          }}
        >
          <Tooltip sticky>SafeRoad AI Route — risk minimized</Tooltip>
        </Polyline>
      )}

      {start && (
        <CircleMarker
          center={start}
          radius={8}
          pathOptions={{
            color: '#0a0d15',
            weight: 3,
            fillColor: '#16a34a',
            fillOpacity: 1,
          }}
        >
          <Tooltip permanent direction="right" offset={[10, 0]}>
            Start
          </Tooltip>
        </CircleMarker>
      )}

      {end && (
        <CircleMarker
          center={end}
          radius={8}
          pathOptions={{
            color: '#0a0d15',
            weight: 3,
            fillColor: '#2563eb',
            fillOpacity: 1,
          }}
        >
          <Tooltip permanent direction="right" offset={[10, 0]}>
            Destination
          </Tooltip>
        </CircleMarker>
      )}
    </MapContainer>
  )
}
