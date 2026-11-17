export const privacySupportLink = 'mailto:privacidade@calirh.com';
export const caliInstagram = 'https://www.instagram.com/calirh_/';
export const caliLinkedIn = 'https://br.linkedin.com/company/cali-rh';

export function accessSupportLink(message?: string) {
  const subject = encodeURIComponent('Acesso ao CALI Workspace');
  return `mailto:patricia@calirh.com?subject=${subject}${message ? `&body=${encodeURIComponent(message)}` : ''}`;
}
