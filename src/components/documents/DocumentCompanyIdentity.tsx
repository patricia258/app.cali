export function DocumentCompanyLogo({ logo, name, list }: { logo?: string | null; name: string; list?: boolean }) {
  return <span className={`${list ? 'v2-record-logo tw:size-10.5 tw:text-cali-body/none' : 'v2-doc-client-logo tw:size-9 tw:text-sm/none'} tw:flex tw:shrink-0 tw:items-center tw:justify-center tw:overflow-hidden tw:rounded-lg tw:border tw:border-solid tw:border-cali-line tw:bg-cali-neutral-surface tw:font-extrabold tw:text-cali-brand`}>
    {logo ? <img className="tw:size-full tw:object-contain" src={logo} alt="" /> : <span aria-hidden="true">{name.slice(0, 1).toUpperCase()}</span>}
  </span>;
}

export function DocumentCompanyIdentity({ logo, name, context }: { logo?: string | null; name: string; context: string }) {
  return <div className="v2-doc-client tw:flex tw:min-w-0 tw:items-center tw:gap-3">
    <DocumentCompanyLogo logo={logo} name={name} />
    <div className="tw:flex tw:min-w-0 tw:flex-col tw:gap-0.5">
      <strong className="tw:truncate tw:text-sm/[inherit] tw:text-cali-text">{name}</strong>
      <small className="tw:truncate tw:text-xs/[inherit] tw:text-cali-muted">{context}</small>
    </div>
  </div>;
}
