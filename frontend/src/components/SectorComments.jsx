import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { useAuth } from "../context/AuthContext";

// Keep these in step with the backend (MAX_PHOTOS_PER_COMMENT and
// MAX_UPLOAD_BYTES). Checking here too just gives faster feedback —
// the backend is what actually enforces it.
const MAX_PHOTOS = 3;
const MAX_FILE_BYTES = 8 * 1024 * 1024;

function Stars({ value, onChange, readOnly = false, disabled = false }) {
  const stars = [1, 2, 3, 4, 5];

  if (readOnly) {
    return (
      <span className="stars stars--readonly" aria-label={`${value} out of 5`}>
        {stars.map((n) => (
          <span key={n} className={n <= value ? "star star--on" : "star"}>
            ★
          </span>
        ))}
      </span>
    );
  }

  return (
    <span className="stars">
      {stars.map((n) => (
        <button
          key={n}
          type="button"
          disabled={disabled}
          className={n <= value ? "star star--on" : "star"}
          onClick={() => onChange(n)}
          aria-label={`Rate ${n} out of 5`}
        >
          ★
        </button>
      ))}
    </span>
  );
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function SectorComments({ sectorId }) {
  const { user } = useAuth();

  const [data, setData] = useState(null);
  const [status, setStatus] = useState("loading");

  // New-comment form
  const [newBody, setNewBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");

  // Photos queued for the next comment (not uploaded yet)
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const fileInputRef = useRef(null);

  // Inline editing
  const [editingId, setEditingId] = useState(null);
  const [editBody, setEditBody] = useState("");

  const [savingRating, setSavingRating] = useState(false);

  // Full-screen photo viewer — reuses the lightbox CSS from PhotoGallery
  const [lightboxUrl, setLightboxUrl] = useState(null);

  function loadComments() {
    apiFetch(`/sectors/${sectorId}/comments`)
      .then((res) => {
        setData(res);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }

  useEffect(() => {
    setStatus("loading");
    loadComments();
  }, [sectorId]);

  /*
    Build local preview URLs for the queued files.

    createObjectURL makes a temporary in-memory URL for a File. It must be
    revoked afterwards or the browser holds the image in memory for the
    lifetime of the page — that's what the cleanup return does.
  */
  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  function handleFilePick(e) {
    const picked = Array.from(e.target.files || []);
    setError("");

    const tooBig = picked.find((f) => f.size > MAX_FILE_BYTES);
    if (tooBig) {
      setError(`"${tooBig.name}" is over 8 MB — pick a smaller image.`);
      return;
    }

    const combined = [...files, ...picked];
    if (combined.length > MAX_PHOTOS) {
      setError(`You can attach up to ${MAX_PHOTOS} photos per comment.`);
    }
    setFiles(combined.slice(0, MAX_PHOTOS));

    // Reset the input so picking the same file twice still fires onChange
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeQueuedFile(index) {
    setFiles(files.filter((_, i) => i !== index));
  }

  async function handleRate(value) {
    setError("");
    setSavingRating(true);
    try {
      if (data?.my_rating === value) {
        await apiFetch(`/sectors/${sectorId}/ratings`, { method: "DELETE" });
      } else {
        await apiFetch(`/sectors/${sectorId}/ratings`, {
          method: "PUT",
          body: JSON.stringify({ rating: value }),
        });
      }
      loadComments();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingRating(false);
    }
  }

  /*
    Posting is TWO steps: create the comment, then upload each photo to it.

    The photo endpoint needs a comment id to attach to, and multipart can't
    carry the JSON body cleanly, so they're separate requests. If a photo
    fails we keep the comment and report which one — better than throwing
    away someone's writing.
  */
  async function handlePost(e) {
    e.preventDefault();
    setError("");
    setPosting(true);

    try {
      const created = await apiFetch(`/sectors/${sectorId}/comments`, {
        method: "POST",
        body: JSON.stringify({ body: newBody }),
      });

      const failures = [];
      for (const file of files) {
        const form = new FormData();
        form.append("file", file); // name must match the backend's `file` param
        try {
          await apiFetch(`/comments/${created.id}/photos`, {
            method: "POST",
            body: form,
          });
        } catch (err) {
          failures.push(`${file.name}: ${err.message}`);
        }
      }

      setNewBody("");
      setFiles([]);
      if (failures.length) {
        setError(`Comment posted, but some photos failed — ${failures.join("; ")}`);
      }
      loadComments();
    } catch (err) {
      setError(err.message);
    } finally {
      setPosting(false);
    }
  }

  function startEdit(comment) {
    setEditingId(comment.id);
    setEditBody(comment.body);
    setError("");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditBody("");
  }

  async function handleSaveEdit(commentId) {
    setError("");
    try {
      await apiFetch(`/comments/${commentId}`, {
        method: "PATCH",
        body: JSON.stringify({ body: editBody }),
      });
      cancelEdit();
      loadComments();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteComment(commentId) {
    setError("");
    try {
      await apiFetch(`/comments/${commentId}`, { method: "DELETE" });
      loadComments();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeletePhoto(photoId) {
    setError("");
    try {
      await apiFetch(`/photos/${photoId}`, { method: "DELETE" });
      loadComments();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section className="sector-community">
      <h2 className="section-title" style={{ marginTop: "40px" }}>
        Community
      </h2>

      {status === "ready" && data.average_rating != null && (
        <div className="rating-summary">
          <Stars value={Math.round(data.average_rating)} readOnly />
          <span className="rating-summary-value">{data.average_rating}</span>
          <span className="rating-summary-count">
            from {data.rating_count} {data.rating_count === 1 ? "climber" : "climbers"}
          </span>
        </div>
      )}

      {status === "ready" && user && (
        <div className="rating-block">
          <span className="rating-block-label">Your rating</span>
          <Stars
            value={data.my_rating || 0}
            onChange={handleRate}
            disabled={savingRating}
          />
          {data.my_rating && (
            <span className="rating-block-hint">Click the same star to remove</span>
          )}
        </div>
      )}

      {error && <p className="status-message error">{error}</p>}

      {user ? (
        <form className="comment-form" onSubmit={handlePost}>
          <div className="form-field">
            <label htmlFor="comment-body">Add a comment</label>
            <textarea
              id="comment-body"
              rows={3}
              placeholder="Rock quality, shade timing, approach notes…"
              value={newBody}
              onChange={(e) => setNewBody(e.target.value)}
              required
              maxLength={2000}
            />
          </div>

          {/* PHOTO PICKER */}
          <div className="form-field">
            <label htmlFor="comment-photos">Photos (optional)</label>
            <input
              id="comment-photos"
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFilePick}
              className="photo-input"
            />
            <span className="field-hint">
              Up to {MAX_PHOTOS} images. They're resized and compressed on upload.
            </span>
          </div>

          {/* Local previews of queued files */}
          {previews.length > 0 && (
            <div className="photo-preview-row">
              {previews.map((src, i) => (
                <div key={src} className="photo-preview-wrap">
                  <img src={src} alt="" className="photo-preview" />
                  <button
                    type="button"
                    className="photo-remove"
                    onClick={() => removeQueuedFile(i)}
                    aria-label="Remove photo"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="comment-form-actions">
            <button type="submit" className="submit-button" disabled={posting}>
              {posting ? "Posting…" : "Post comment"}
            </button>
          </div>
        </form>
      ) : (
        <div className="community-placeholder">
          <p>
            <Link to="/login">Log in</Link> or{" "}
            <Link to="/register">create an account</Link> to comment and rate this
            sector.
          </p>
        </div>
      )}

      {status === "loading" && <p className="status-message">Loading comments…</p>}
      {status === "error" && (
        <p className="status-message error">Couldn't load comments.</p>
      )}

      {status === "ready" && data.comments.length === 0 && (
        <p className="status-message">No comments yet — be the first.</p>
      )}

      {status === "ready" && data.comments.length > 0 && (
        <ul className="comment-list">
          {data.comments.map((c) => {
            const isMine = c.user_id === user?.id;
            const isEditing = editingId === c.id;

            return (
              <li key={c.id} className="comment">
                <div className="comment-head">
                  <span className="comment-author">{c.author}</span>
                  {c.author_rating != null && (
                    <Stars value={c.author_rating} readOnly />
                  )}
                  <span className="comment-date">
                    {formatDate(c.created_at)}
                    {c.updated_at && <span className="comment-edited"> · edited</span>}
                  </span>
                </div>

                {isEditing ? (
                  <div className="comment-edit">
                    <textarea
                      rows={3}
                      value={editBody}
                      onChange={(e) => setEditBody(e.target.value)}
                      maxLength={2000}
                    />
                    <div className="comment-actions">
                      <button
                        type="button"
                        className="submit-button submit-button--small"
                        onClick={() => handleSaveEdit(c.id)}
                      >
                        Save
                      </button>
                      <button type="button" className="text-button" onClick={cancelEdit}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="comment-body">{c.body}</p>

                    {/* Attached photos — click to enlarge */}
                    {c.photos && c.photos.length > 0 && (
                      <div className="comment-photo-row">
                        {c.photos.map((p) => (
                          <div key={p.id} className="comment-photo-wrap">
                            <img
                              src={p.url}
                              alt=""
                              className="comment-photo"
                              loading="lazy"
                              onClick={() => setLightboxUrl(p.url)}
                            />
                            {isMine && (
                              <button
                                type="button"
                                className="photo-remove"
                                onClick={() => handleDeletePhoto(p.id)}
                                aria-label="Delete photo"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {isMine && (
                      <div className="comment-actions">
                        <button
                          type="button"
                          className="text-button"
                          onClick={() => startEdit(c)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="text-button"
                          onClick={() => handleDeleteComment(c.id)}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* Lightbox — reuses the CSS classes already in App.css */}
      {lightboxUrl && (
        <div className="lightbox-overlay" onClick={() => setLightboxUrl(null)}>
          <button className="lightbox-close" onClick={() => setLightboxUrl(null)}>
            ✕
          </button>
          <img
            src={lightboxUrl}
            alt=""
            className="lightbox-image"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </section>
  );
}

export default SectorComments;
