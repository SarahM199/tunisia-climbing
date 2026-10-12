import { useState } from "react";

/*
  PhotoGallery — a shared component for showing photos with click-to-enlarge.
  
  Props:
    basePath: folder path in /public (e.g. "/photos/sectors")
    id: the entity ID (used to build filenames)
    maxExtras: how many _1, _2, _3 files to try loading (default 4)
  
  Features:
    - Tries to load {id}.png, {id}_1.png, {id}_2.png, etc.
    - Hides any images that 404 (onError handler)
    - Click a photo to open it full-screen in a lightbox overlay
    - Press Escape or click the X to close the lightbox
*/
function PhotoGallery({ basePath, id, maxExtras = 4 }) {
  const [lightboxSrc, setLightboxSrc] = useState(null);

  // Build list of possible image URLs
  const images = [`${basePath}/${id}.png`];
  for (let i = 1; i <= maxExtras; i++) {
    images.push(`${basePath}/${id}_${i}.png`);
  }

  function openLightbox(src) {
    setLightboxSrc(src);
  }

  function closeLightbox() {
    setLightboxSrc(null);
  }

  // Close on Escape key
  function handleKeyDown(e) {
    if (e.key === "Escape") closeLightbox();
  }

  return (
    <>
      {/* Thumbnail strip */}
      <div className="photo-gallery">
        {images.map((src, i) => (
          <img
            key={i}
            src={src}
            alt=""
            className="gallery-photo"
            onClick={() => openLightbox(src)}
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />
        ))}
      </div>

      {/* Lightbox overlay — only shows when a photo is clicked */}
      {lightboxSrc && (
        <div
          className="lightbox-overlay"
          onClick={closeLightbox}
          onKeyDown={handleKeyDown}
          tabIndex={0}
          role="dialog"
          aria-label="Photo viewer"
        >
          <button className="lightbox-close" onClick={closeLightbox}>
            ✕
          </button>
          <img
            src={lightboxSrc}
            alt=""
            className="lightbox-image"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}

export default PhotoGallery;
