import './landing-gallery-motion.css';

export type PhotoSlot = {
  title: string;
  mark: 'oak' | 'lime';
  src?: string;
  objectPosition?: string;
};

function GalleryPhoto({ title, mark, src, objectPosition = '50% 50%' }: PhotoSlot) {
  return (
    <div className={`tw:relative tw:grid tw:h-[14.375rem] tw:w-[min(22.5rem,72vw)] tw:flex-none tw:content-end tw:justify-items-start tw:overflow-hidden tw:rounded-[var(--id-radius-card)] tw:shadow-[0_.5rem_1.5rem_#27181c1a] tw:[@media(35rem<width<=51.25rem)]:h-[13.625rem] tw:[@media(35rem<width<=51.25rem)]:w-[min(21.25rem,78vw)] tw:[@media(max-width:35rem)]:h-[11.25rem] tw:[@media(max-width:35rem)]:w-[17.5rem] ${src ? 'tw:border tw:border-solid tw:border-(--id-line) tw:bg-(--id-canvas)' : 'tw:bg-[linear-gradient(145deg,#692237,#3c141f)] tw:p-5.5'}`}>
      {src ? (
        <img className="tw:absolute tw:inset-0 tw:size-full tw:object-cover" src={src} alt={title} style={{ objectPosition }} />
      ) : (
        <>
          <img className="tw:absolute tw:-top-3 tw:-right-4 tw:w-[10.625rem] tw:rotate-12 tw:opacity-10 tw:brightness-0 tw:invert" src={mark === 'oak' ? '/brand/cali-oak-mark-light.svg' : '/brand/cali-lime-mark.svg'} alt="" aria-hidden="true" />
          <small className="tw:relative tw:z-2 tw:mt-1 tw:text-[.64rem] tw:tracking-[.1em] tw:text-[#f7f3ee6b] tw:uppercase" aria-hidden="true">imagem CALI</small>
        </>
      )}
    </div>
  );
}

export function LandingGallery({ photos }: { photos: PhotoSlot[] }) {
  return (
    <div className="tw:mt-[5.375rem] tw:overflow-hidden tw:[@media(max-width:35rem)]:mt-16" role="region" aria-label="Galeria de fotos da CALI">
      <div className="tw:flex tw:w-max tw:gap-4.5 tw:motion-safe:animate-[landing-gallery-scroll_44s_linear_infinite] tw:motion-safe:hover:[animation-play-state:paused]">
        {photos.map((photo) => <GalleryPhoto key={photo.title} {...photo} />)}
        {photos.map((photo) => <div key={photo.title} aria-hidden="true" className="tw:motion-reduce:hidden"><GalleryPhoto {...photo} /></div>)}
      </div>
    </div>
  );
}
