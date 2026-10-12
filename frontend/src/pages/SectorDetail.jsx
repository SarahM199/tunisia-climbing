import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import PhotoGallery from "../components/PhotoGallery";
import SectorComments from "../components/SectorComments";


const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

function SectorDetail() {
  const { sectorId } = useParams();
  const [sector, setSector] = useState(null);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    setStatus("loading");
    fetch(`${API_URL}/sectors/${sectorId}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Server responded ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setSector(data);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, [sectorId]);

  const gradeLabel =
    sector?.grade_min && sector?.grade_max && sector.grade_min !== sector.grade_max
      ? `${sector.grade_min} – ${sector.grade_max}`
      : sector?.grade_min || sector?.grade_max;

  return (
    <>
      {status === "loading" && <p className="status-message">Loading sector…</p>}
      {status === "error" && <p className="status-message error">Couldn't load this sector.</p>}

      {status === "ready" && sector && (
        <>
          {/* Breadcrumb navigation */}
          <nav className="breadcrumb">
            <Link to="/">Crags</Link>
            <span className="breadcrumb-sep">›</span>
            <Link to={`/crags/${sector.crag_id}`}>{sector.crag_name}</Link>
            <span className="breadcrumb-sep">›</span>
            <span>{sector.name}</span>
          </nav>

          <header className="site-header">
            <span className="eyebrow">{sector.crag_name}</span>
            <h1>{sector.name}</h1>

            {/* Description — if the sector has one */}
            {sector.description && (
              <p className="tagline">{sector.description}</p>
            )}

            {/* Tags */}
            <div className="crag-facts">
              {sector.climbing_type && <span className="tag">{sector.climbing_type}</span>}
              {gradeLabel && <span className="grade-badge">{gradeLabel}</span>}
              {sector.num_routes != null && (
                <span className="tag">{sector.num_routes} routes</span>
              )}
              {sector.orientation && (
                <span className="tag">Faces {sector.orientation}</span>
              )}
              {sector.approach_time_min && (
                <span className="tag">{sector.approach_time_min} min approach</span>
              )}
              {sector.approach_difficulty && (
                <span className="tag">{sector.approach_difficulty} approach</span>
              )}
            </div>
          </header>


          <main>
            {/* PHOTO GALLERY — tries to load main photo + extras by ID */}
            <PhotoGallery basePath="/photos/sectors" id={sectorId} maxExtras={4} />


            {/* ROUTES TABLE */}
            <h2 className="section-title">
              Routes ({sector.routes?.length || 0})
            </h2>

            {sector.routes && sector.routes.length > 0 ? (
              <table className="route-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Grade</th>
                    <th>Type</th>
                  </tr>
                </thead>
                <tbody>
                  {sector.routes.map((route) => (
                    <tr key={route.id}>
                      <td className="route-number">{route.route_number}</td>
                      <td className="route-name">{route.name}</td>
                      <td>
                        {route.grade && <span className="grade-badge">{route.grade}</span>}
                      </td>
                      <td className="route-type">{route.climbing_type || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="status-message">No routes recorded yet.</p>
            )}
            <SectorComments sectorId={sectorId} />
            
            <p className="sector-feedback">
              Something wrong or missing on this page?{" "}
              <Link
                to={`/contact?sector=${sectorId}&sectorName=${encodeURIComponent(
                  sector.name
                )}&purpose=correction`}
              >
                Suggest a correction
              </Link>
            </p>
            
          </main>
        </>
      )}
    </>
  );
}

export default SectorDetail;
