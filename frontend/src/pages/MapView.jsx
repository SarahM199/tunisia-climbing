import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import RatingStars from "../components/RatingStars";


const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

/*
  Fix Leaflet's default marker icons that break with bundlers like Vite.
  This tells Leaflet where to find the marker images.
*/
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

/*
  Custom colored marker for sectors (smaller, different color than crags).
  We create it using Leaflet's divIcon — a plain div styled with CSS.
*/
const sectorIcon = new L.DivIcon({
  className: "sector-marker",
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

function MapView() {
  const [crags, setCrags] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [status, setStatus] = useState("loading");
  const [showSectors, setShowSectors] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch both crags and sectors in parallel
    Promise.all([
      fetch(`${API_URL}/crags`).then((r) => r.json()),
      fetch(`${API_URL}/sectors`).then((r) => r.json()),
    ])
      .then(([cragData, sectorData]) => {
        setCrags(cragData);
        setSectors(sectorData);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, []);

  // Center of Tunisia
  const tunisiaCenter = [35.5, 9.5];

  return (
    <>
      <header className="site-header">
        <span className="eyebrow">Explore</span>
        <h1>Crag Map</h1>
        <p className="tagline">
          Blue markers = crags. Orange dots = individual sectors.
        </p>
      </header>

      {/* Toggle to show/hide sector markers */}
      <div className="map-controls">
        <label className="map-toggle">
          <input
            type="checkbox"
            checked={showSectors}
            onChange={(e) => setShowSectors(e.target.checked)}
          />
          <span>Show sectors</span>
        </label>
      </div>

      {status === "loading" && <p className="status-message">Loading map…</p>}
      {status === "error" && (
        <p className="status-message error">Couldn't load map data.</p>
      )}

      {status === "ready" && (
        <div className="map-container">
          <MapContainer
            center={tunisiaCenter}
            zoom={7}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Crag markers (blue, default Leaflet pins) */}
            {crags
              .filter((c) => c.latitude && c.longitude)
              .map((crag) => (
                <Marker key={`crag-${crag.id}`} position={[crag.latitude, crag.longitude]}>
                  <Popup>
                    <div className="map-popup">
                      <strong>{crag.name}</strong>
                      {crag.region && <p>{crag.region}</p>}
                      {crag.rock_type && <p>{crag.rock_type}</p>}
                      <button
                        className="map-popup-link"
                        onClick={() => navigate(`/crags/${crag.id}`)}
                      >
                        View crag →
                      </button>
                    </div>
                  </Popup>
                </Marker>
              ))}

            {/* Sector markers (small orange dots) — only if toggle is on */}
            {showSectors &&
              sectors
                .filter((s) => s.latitude && s.longitude)
                .map((sector) => (
                  <Marker
                    key={`sector-${sector.id}`}
                    position={[sector.latitude, sector.longitude]}
                    icon={sectorIcon}
                  >
                    <Popup>
                      <div className="map-popup">
                        <strong>{sector.name}</strong>
                        <p>{sector.crag_name}</p>
                        {sector.climbing_type && <p>{sector.climbing_type}</p>}
                        {sector.num_routes && <p>{sector.num_routes} routes</p>}
                        {sector.grade_min && sector.grade_max && (
                          <p>Grades: {sector.grade_min} – {sector.grade_max}</p>
                        )}
                        <button
                          className="map-popup-link"
                          onClick={() => navigate(`/crags/${sector.crag_id}`)}
                        >
                          View crag →
                        </button>
                        <RatingStars value={sector.rating} count={sector.rating_count} />
                      </div>
                    </Popup>
                  </Marker>
                ))}
          </MapContainer>
        </div>
      )}
    </>
  );
}

export default MapView;
