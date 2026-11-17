import './landing-gallery-motion.css';

export type PhotoSlot = {
  title: string;
  mark: 'oak' | 'lime';
  src?: string;
  objectPosition?: string;
};

function GalleryPhoto({ title, mark, src, objectPosition = '50% 50%' }: PhotoSlot) {
  return (
    <div className={`tw:relative tw:grid tw:h-57.5 tw:w-[min(22.5rem,72vw)] tw:flex-none tw:content-end tw:justify-items-start tw:overflow-hidden tw:rounded-[var(--id-radius-card)] tw:shadow-[0_.5rem_1.5rem_rgb(var(--cali-rgb-burgundy-inverse)/0.102)] tw:[@media(35rem<width<=51.25rem)]:h-54.5 tw:[@media(35rem<width<=51.25rem)]:w-[min(21.25rem,78vw)] tw:[@media(max-width:35rem)]:h-45 tw:[@media(max-width:35rem)]:w-70 ${src ? 'tw:border tw:border-solid tw:border-(--id-line) tw:bg-(--id-canvas)' : 'tw:bg-[linear-gradient(145deg,var(--cali-color-burgundy-accent),var(--cali-color-burgundy-text))] tw:p-5.5'}`}>
      {src ? (
        <img className="tw:absolute tw:inset-0 tw:size-full tw:object-cover" src={src} alt={title} style={{ objectPosition }} />
      ) : (
        <>
          <img className="tw:absolute tw:-top-3 tw:-right-4 tw:w-42.5 tw:rotate-12 tw:opacity-10 tw:brightness-0 tw:invert" src={mark === 'oak' ? '/brand/cali-oak-mark-light.svg' : '/brand/cali-lime-mark.svg'} alt="" aria-hidden="true" />
          <small className="tw:relative tw:z-2 tw:mt-1 tw:text-cali-micro tw:tracking-[.1em] tw:text-cali-sand-soft/42 tw:uppercase" aria-hidden="true">imagem CALI</small>
        </>
      )}
    </div>
  );
}

export function LandingGallery({ photos }: { photos: PhotoSlot[] }) {
  return (
    <div className="tw:mt-21.5 tw:overflow-hidden tw:[@media(max-width:35rem)]:mt-16" role="region" aria-label="Galeria de fotos da CALI">
      <div className="tw:flex tw:w-max tw:gap-4.5 tw:motion-safe:animate-[landing-gallery-scroll_44s_linear_infinite] tw:motion-safe:hover:[animation-play-state:paused]">
        {photos.map((photo) => <GalleryPhoto key={photo.title} {...photo} />)}
        {photos.map((photo) => <div key={photo.title} aria-hidden="true" className="tw:motion-reduce:hidden"><GalleryPhoto {...photo} /></div>)}
      </div>
    </div>
  );
}
