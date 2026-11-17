import { WorkspaceCompanyLogo } from '../../../components/workspace/WorkspaceCompanyLogo';

export function HoursCompanyLogo({ name, logoUrl, logoFallbackUrl }: { name: string; logoUrl?: string | null; logoFallbackUrl?: string | null }) {
  return (
    <span data-workspace-identity className="tw:grid tw:size-11 tw:place-items-center tw:overflow-hidden tw:rounded-lg tw:border tw:border-solid tw:border-cali-sand-line tw:bg-cali-neutral-soft tw:text-sm tw:leading-[inherit] tw:font-extrabold tw:text-cali-brand tw:has-[img]:border-cali-sand-line tw:has-[img]:bg-cali-day-canvas">
      <WorkspaceCompanyLogo
        original={logoUrl}
        derived={logoFallbackUrl}
        alt={`Logo ${name}`}
        fallback={name.trim().split(/\s+/).slice(0, 2).map((word) => word[0]).join('').toUpperCase()}
        className="tw:block tw:size-full tw:rounded-[inherit] tw:object-cover! tw:object-center tw:mix-blend-normal!"
      />
    </span>
  );
}
