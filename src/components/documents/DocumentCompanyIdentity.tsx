export function DocumentCompanyLogo({ logo, name, list }: { logo?: string | null; name: string; list?: boolean }) {
  return <span className={`${list ? 'v2-record-logo tw:size-[2.615rem] tw:text-[0.923rem]/[inherit]' : 'v2-doc-client-logo tw:size-[2.308rem] tw:text-[0.846rem]/[inherit]'} tw:grid tw:shrink-0 tw:place-items-center tw:overflow-hidden tw:rounded-[0.538rem] tw:border tw:border-solid tw:border-[#eadfd6] tw:bg-white tw:font-extrabold tw:text-cali-brand`}>
    {logo ? <img className="tw:size-full tw:object-contain" src={logo} alt="" /> : <span aria-hidden="true">{name.slice(0, 1).toUpperCase()}</span>}
  </span>;
}

export function DocumentCompanyIdentity({ logo, name, context }: { logo?: string | null; name: string; context: string }) {
  return <div className="v2-doc-client tw:flex tw:min-w-0 tw:items-center tw:gap-[0.692rem]">
    <DocumentCompanyLogo logo={logo} name={name} />
    <div className="tw:flex tw:min-w-0 tw:flex-col tw:gap-[0.154rem]">
      <strong className="tw:truncate tw:text-[0.846rem]/[inherit] tw:text-[#322f2c]">{name}</strong>
      <small className="tw:truncate tw:text-[0.769rem]/[inherit] tw:text-[#a18e80]">{context}</small>
    </div>
  </div>;
}
