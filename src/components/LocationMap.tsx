"use client";

import { useEffect, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import type { FriendLocation } from "@/lib/types";

import "leaflet/dist/leaflet.css";

interface LocationMapProps {
  friends: FriendLocation[];
  youId: string | null;
}

function FitBounds({ friends }: { friends: FriendLocation[] }) {
  const map = useMap();

  useEffect(() => {
    const valid = friends.filter(
      (friend) => friend.lat !== 0 || friend.lng !== 0,
    );
    if (valid.length === 0) return;

    if (valid.length === 1) {
      map.setView([valid[0].lat, valid[0].lng], 14);
      return;
    }

    const bounds = L.latLngBounds(
      valid.map((friend) => [friend.lat, friend.lng] as [number, number]),
    );
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 15 });
  }, [friends, map]);

  return null;
}

function createMarkerIcon(color: string, isYou: boolean) {
  return L.divIcon({
    className: "",
    html: `<div style="
      width: 18px;
      height: 18px;
      background: ${color};
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 8px rgba(0,0,0,0.35);
      ${isYou ? "transform: scale(1.2);" : ""}
    "></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

export function LocationMap({ friends, youId }: LocationMapProps) {
  const validFriends = useMemo(
    () => friends.filter((friend) => friend.lat !== 0 || friend.lng !== 0),
    [friends],
  );

  const center = useMemo(() => {
    if (validFriends.length === 0) return [37.7749, -122.4194] as [number, number];
    const you = validFriends.find((friend) => friend.id === youId);
    if (you) return [you.lat, you.lng] as [number, number];
    return [validFriends[0].lat, validFriends[0].lng] as [number, number];
  }, [validFriends, youId]);

  return (
    <MapContainer
      center={center}
      zoom={13}
      className="h-full w-full"
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds friends={validFriends} />
      {validFriends.map((friend) => (
        <Marker
          key={friend.id}
          position={[friend.lat, friend.lng]}
          icon={createMarkerIcon(friend.color, friend.id === youId)}
        >
          <Popup>
            <div className="max-w-[200px] text-sm">
              <strong>{friend.name}</strong>
              {friend.id === youId ? " (you)" : ""}
              {friend.latestStatus && (
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                  {friend.latestStatus}
                </p>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
