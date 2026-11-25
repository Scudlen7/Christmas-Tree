import { useEffect, useRef } from 'react';

export default function PhotoViewer({ photos, index, onClose, onStep }: {
  photos: string[];
  index: number | null;
  onClose: () => void;
  onStep: (direction: -1 | 1) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const open = index !== null;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (open) dialog?.showModal();
    else dialog?.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className="photo-viewer"
      aria-label="Photo preview"
      onCancel={event => {
        event.preventDefault();
        onClose();
      }}
      onKeyDown={event => {
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          event.preventDefault();
          onStep(event.key === 'ArrowLeft' ? -1 : 1);
        }
      }}
    >
      {index !== null && (
        <>
          <button className="photo-close" onClick={onClose} aria-label="Close photo">×</button>
          <img src={photos[index]} alt={`Christmas tree photo ${index + 1}`} />
          <div className="photo-navigation">
            <button onClick={() => onStep(-1)} aria-label="Previous photo">‹</button>
            <span aria-live="polite">{index + 1} / {photos.length}</span>
            <button onClick={() => onStep(1)} aria-label="Next photo">›</button>
          </div>
          <p>Swipe with your index finger to browse. Hold an open palm to close.</p>
        </>
      )}
    </dialog>
  );
}
