import { useState } from 'react';
import { Star } from 'lucide-react';
import type { Member } from '../../../domain/team';

const avatarSources = {
  female: '/team-avatars/feminino.webp',
  male: '/team-avatars/masculino.webp',
  neutral: '/team-avatars/neutro.webp',
};

type TeamAvatarProps = {
  name: string;
  style?: Member['avatar_style'];
  large?: boolean;
  leader?: boolean;
};

export function TeamAvatar({ name, style = 'neutral', large = false, leader = false }: TeamAvatarProps) {
  const src = avatarSources[style] ?? avatarSources.neutral;
  const [failedSrc, setFailedSrc] = useState<string>();
  const size = large
    ? 'tw:size-[4.125rem] tw:compact-content:size-[5.077rem]'
    : 'tw:size-[2.375rem] tw:compact-content:size-[2.923rem]';
  return (
    <span className={`tw:relative tw:inline-grid tw:flex-none tw:place-items-center ${size}`}>
      <span
        aria-hidden="true"
        className={`tw:grid tw:size-full tw:place-items-center tw:overflow-hidden tw:rounded-[0.4375rem] tw:border tw:border-solid tw:border-cali-gold tw:bg-[#f7f3ee] tw:font-cali-heading tw:font-bold tw:leading-none tw:text-cali-brand ${large ? 'tw:text-2xl' : 'tw:text-base'}`}
      >
        {failedSrc === src ? (
          name.trim().slice(0, 1).toUpperCase() || 'C'
        ) : (
          <img
            src={src}
            alt=""
            className="tw:block tw:size-full tw:rounded-[inherit] tw:object-cover"
            onError={() => setFailedSrc(src)}
          />
        )}
      </span>
      {leader && (
        <span
          title="Liderança"
          aria-label="Liderança"
          className={`tw:absolute tw:grid tw:place-items-center tw:rounded-[0.4375rem] tw:bg-[#e9c57e] tw:text-cali-brand tw:shadow-[0_0.125rem_0.3125rem_#28111636] ${large ? 'tw:-right-1.75 tw:-top-2 tw:size-6' : 'tw:-right-1.5 tw:-top-1.75 tw:size-5 tw:compact-content:size-[1.54rem]'}`}
        >
          <Star size={large ? 15 : 12} fill="currentColor" />
        </span>
      )}
    </span>
  );
}
