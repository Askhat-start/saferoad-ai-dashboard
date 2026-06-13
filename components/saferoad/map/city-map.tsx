'use client'

import {
  CircleMarker,
  MapContainer,
  Polyline,
  TileLayer,
  Tooltip,
  useMapEvents,
} from 'react-leaflet'
import {
  ALMATY_CENTER,
  RISK_COLORS,
  type LatLng,
  type Segment,
} from '@/lib/city-data'
import type { RouteLeg } from '@/lib/api'

interface CityMapProps {
  segments: Segment[]
  selectedId?: string | null
  onSelect?: (id: string) => void
  showRoutes?: boolean
  fastestRoute?: LatLng[]
  saferoadRoute?: LatLng[]
  /** colored legs returned from the live backend route */
  routeLegs?: RouteLeg[]
  start?: LatLng | null
  end?: LatLng | null
  /** dim segments to focus on routes */
  dimSegments?: boolean
  /** fired with [lat,lng] when the user clicks the map */
  onMapClick?: (point: LatLng) => void
}

function ClickCapture({ onMapClick }: { onMapClick?: (p: LatLng) => void }) {
  useMapEvents({
    click(e) {
      onMapClick?.([e.latlng.lat, e.latlng.lng])
    },
  })
  return null
}

export default function CityMap({
  segments,
  selectedId,
  onSelect,
  showRoutes = false,
  fastestRoute,
  saferoadRoute,
  routeLegs,
  start,
  end,
  dimSegments = false,
  onMapClick,
}: CityMapProps) {
  return (
    <MapContainer
      center={ALMATY_CENTER}
      zoom={13}
      zoomControl
      className="h-full w-full"
      style={{ background: '#0a0d15', cursor: onMapClick ? 'crosshair' : '' }}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; OpenStreetMap &copy; CARTO'
        subdomains="abcd"
        maxZoom={19}
      />

      <ClickCapture onMapClick={onMapClick} />

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

      {routeLegs?.map((leg, i) => (
        <Polyline
          key={`leg-${i}`}
          positions={leg.positions}
          pathOptions={{
            color: leg.color,
            weight: 7,
            opacity: 1,
            lineCap: 'round',
            lineJoin: 'round',
          }}
        >
          <Tooltip sticky>
            {leg.risk != null
              ? `Risk ${Math.round(leg.risk)} · SafeRoad route`
              : 'SafeRoad AI route'}
          </Tooltip>
        </Polyline>
      ))}

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
