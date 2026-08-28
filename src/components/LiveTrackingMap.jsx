import { useState, useEffect, useRef } from 'react';
import { Navigation, Clock, Signal, MapPin } from 'lucide-react';
import { io } from 'socket.io-client';
import { API_URL } from '../config';

// ─── Leaflet CSS (injected once) ─────────────────────────────────────────────
if (typeof document !== 'undefined' && !document.getElementById('leaflet-css')) {
  const link = document.createElement('link');
  link.id = 'leaflet-css';
  link.rel = 'stylesheet';
  link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
  document.head.appendChild(link);
}

// ─── Haversine distance (returns km) ─────────────────────────────────────────
const haversineKm = (lat1, lng1, lat2, lng2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const SOCKET_URL = API_URL.replace('/api', '');

const LiveTrackingMap = ({ bookingId, providerName, serviceAddress, isProvider = false }) => {
  const mapRef = useRef(null);
  const leafletMap = useRef(null);
  const provMarker = useRef(null);
  const destMarker = useRef(null);
  const polyRef = useRef(null);
  const socketRef = useRef(null);
  const watchIdRef = useRef(null);

  const [providerCoords, setProviderCoords] = useState(null);
  const [destCoords, setDestCoords] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const [etaMinutes, setEtaMinutes] = useState(null);
  const [isLive, setIsLive] = useState(false);
  const [gpsError, setGpsError] = useState('');
  const [secondsAgo, setSecondsAgo] = useState(0);

  // ── Geocode serviceAddress → lat/lng via Nominatim (free) ────────────────
  useEffect(() => {
    if (!serviceAddress) return;
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(serviceAddress)}&limit=1`)
      .then((r) => r.json())
      .then((data) => {
        if (data && data.length > 0) {
          setDestCoords({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) });
        }
      })
      .catch(() => {});
  }, [serviceAddress]);

  // ── "X seconds ago" ticker ────────────────────────────────────────────────
  useEffect(() => {
    if (!lastUpdate) return;
    const id = setInterval(() => setSecondsAgo(Math.floor((Date.now() - lastUpdate) / 1000)), 1000);
    return () => clearInterval(id);
  }, [lastUpdate]);

  // ── Init Leaflet map ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return;
    import('leaflet').then((L) => {
      if (!mapRef.current) return;
      const map = L.map(mapRef.current, { center: [20.5937, 78.9629], zoom: 13 });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);
      leafletMap.current = map;
    });
    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }
    };
  }, []);

  // ── Destination marker ────────────────────────────────────────────────────
  useEffect(() => {
    if (!leafletMap.current || !destCoords) return;
    import('leaflet').then((L) => {
      if (!leafletMap.current) return;
      const icon = L.divIcon({
        html: `<div style="background:#10b981;width:30px;height:30px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 0 12px rgba(16,185,129,0.7);display:flex;align-items:center;justify-content:center;">
                 <span style="transform:rotate(45deg);font-size:14px">📍</span></div>`,
        className: '',
        iconSize: [30, 30],
        iconAnchor: [15, 30],
      });
      if (destMarker.current) {
        destMarker.current.setLatLng([destCoords.lat, destCoords.lng]);
      } else {
        destMarker.current = L.marker([destCoords.lat, destCoords.lng], { icon })
          .addTo(leafletMap.current)
          .bindPopup(`📍 <b>Service Address</b><br>${serviceAddress || 'Customer Location'}`);
      }
    });
  }, [destCoords, serviceAddress]);

  // ── Provider moving marker + route line + ETA ─────────────────────────────
  useEffect(() => {
    if (!leafletMap.current || !providerCoords) return;
    import('leaflet').then((L) => {
      if (!leafletMap.current) return;
      const icon = L.divIcon({
        html: `<div style="background:#6366f1;width:38px;height:38px;border-radius:50%;border:3px solid white;box-shadow:0 0 18px rgba(99,102,241,0.9);display:flex;align-items:center;justify-content:center;font-size:18px;">🚗</div>
               <div style="position:absolute;top:-20px;left:50%;transform:translateX(-50%);background:#1e1b4b;color:#a5b4fc;font-size:9px;font-weight:800;padding:1px 5px;border-radius:4px;white-space:nowrap;">${providerName?.split(' ')[0] || 'Provider'}</div>`,
        className: '',
        iconSize: [38, 38],
        iconAnchor: [19, 19],
      });
      if (provMarker.current) {
        provMarker.current.setLatLng([providerCoords.lat, providerCoords.lng]);
      } else {
        provMarker.current = L.marker([providerCoords.lat, providerCoords.lng], { icon })
          .addTo(leafletMap.current)
          .bindPopup(`🚗 <b>${providerName || 'Provider'}</b><br>On the way!`);
        leafletMap.current.setView([providerCoords.lat, providerCoords.lng], 14);
      }

      if (destCoords) {
        const pts = [
          [providerCoords.lat, providerCoords.lng],
          [destCoords.lat, destCoords.lng],
        ];
        if (polyRef.current) {
          polyRef.current.setLatLngs(pts);
        } else {
          polyRef.current = L.polyline(pts, {
            color: '#6366f1',
            weight: 3,
            dashArray: '8,8',
            opacity: 0.75,
          }).addTo(leafletMap.current);
        }
        leafletMap.current.fitBounds(L.latLngBounds(pts), { padding: [50, 50] });
        const km = haversineKm(providerCoords.lat, providerCoords.lng, destCoords.lat, destCoords.lng);
        setEtaMinutes(Math.max(1, Math.round((km / 30) * 60)));
      }
    });
  }, [providerCoords, destCoords, providerName]);

  // ── CUSTOMER — listen for live location from Socket.io ───────────────────
  useEffect(() => {
    if (!bookingId || isProvider) return;
    const sock = io(SOCKET_URL);
    socketRef.current = sock;
    sock.emit('join_tracking_room', bookingId);
    sock.on('provider_location_update', ({ lat, lng, accuracy: acc }) => {
      setProviderCoords({ lat, lng });
      setAccuracy(acc ? Math.round(acc) : null);
      setLastUpdate(Date.now());
      setIsLive(true);
      setSecondsAgo(0);
    });
    sock.on('tracking_stopped', () => setIsLive(false));
    return () => sock.disconnect();
  }, [bookingId, isProvider]);

  // ── PROVIDER — broadcast GPS location via Socket.io ──────────────────────
  useEffect(() => {
    if (!bookingId || !isProvider) return;
    if (!navigator.geolocation) {
      setGpsError('Geolocation not supported by your browser.');
      return;
    }

    const sock = io(SOCKET_URL);
    socketRef.current = sock;
    sock.emit('join_tracking_room', bookingId);

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng, accuracy: acc } = pos.coords;
        setProviderCoords({ lat, lng });
        setAccuracy(Math.round(acc));
        setLastUpdate(Date.now());
        setIsLive(true);
        setSecondsAgo(0);
        setGpsError('');
        sock.emit('provider_location', { bookingId, lat, lng, accuracy: acc });
      },
      (err) => setGpsError(`GPS Error: ${err.message}. Allow location access in browser.`),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
    );
    watchIdRef.current = watchId;

    return () => {
      navigator.geolocation.clearWatch(watchId);
      sock.emit('stop_tracking', bookingId);
      sock.disconnect();
    };
  }, [bookingId, isProvider]);

  return (
    <div
      style={{
        background: 'linear-gradient(135deg,#0f172a,#1e293b)',
        borderRadius: '1rem',
        overflow: 'hidden',
        border: '1px solid rgba(99,102,241,0.3)',
        marginBottom: '1.5rem',
        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.4)',
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          padding: '0.85rem 1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{ background: '#4f46e5', padding: '0.35rem', borderRadius: '50%', display: 'flex' }}>
            <Navigation size={16} style={{ color: 'white' }} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#f8fafc' }}>
              {isProvider ? '📡 Broadcasting Live Location' : 'Live GPS Provider Tracking'}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
              {isProvider
                ? 'Your GPS is being shared with the customer in real-time'
                : `${providerName || 'Provider'} is en route · OpenStreetMap`}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {/* Live badge */}
          <div
            style={{
              background: isLive ? 'rgba(16,185,129,0.15)' : 'rgba(100,116,139,0.15)',
              border: `1px solid ${isLive ? 'rgba(16,185,129,0.4)' : 'rgba(100,116,139,0.3)'}`,
              color: isLive ? '#34d399' : '#94a3b8',
              padding: '0.25rem 0.65rem',
              borderRadius: '2rem',
              fontSize: '0.72rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: isLive ? '#34d399' : '#64748b',
                display: 'inline-block',
              }}
            />
            {isLive ? '🔴 LIVE' : 'Waiting…'}
          </div>
          {etaMinutes && (
            <div
              style={{
                background: 'rgba(99,102,241,0.15)',
                border: '1px solid rgba(99,102,241,0.35)',
                color: '#a5b4fc',
                padding: '0.25rem 0.65rem',
                borderRadius: '2rem',
                fontSize: '0.72rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
              }}
            >
              <Clock size={12} /> ~{etaMinutes} min
            </div>
          )}
        </div>
      </div>

      {/* ── GPS error ── */}
      {gpsError && (
        <div
          style={{
            background: 'rgba(239,68,68,0.12)',
            color: '#fca5a5',
            padding: '0.6rem 1.25rem',
            fontSize: '0.82rem',
            fontWeight: 600,
          }}
        >
          ⚠️ {gpsError}
        </div>
      )}

      {/* ── Map container ── */}
      <div ref={mapRef} style={{ height: '280px', width: '100%', minHeight: '280px' }} />

      {/* ── Footer ── */}
      <div
        style={{
          padding: '0.6rem 1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          fontSize: '0.73rem',
          color: '#64748b',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <MapPin size={12} style={{ color: '#10b981' }} />
          <span style={{ color: '#cbd5e1', fontWeight: 600 }}>
            {serviceAddress ? (serviceAddress.length > 42 ? serviceAddress.slice(0, 42) + '…' : serviceAddress) : 'Waiting for address…'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {accuracy && (
            <span style={{ color: '#818cf8', display: 'flex', alignItems: 'center', gap: 3 }}>
              <Signal size={11} /> ±{accuracy}m
            </span>
          )}
          {lastUpdate ? (
            <span>Updated {secondsAgo}s ago</span>
          ) : (
            <span>{isProvider ? 'Acquiring GPS…' : 'Waiting for provider…'}</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default LiveTrackingMap;
