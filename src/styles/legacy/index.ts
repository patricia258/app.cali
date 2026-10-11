/* Folhas de estilo globais anteriores à V2, usadas pela landing, pelo login e pela administradora
   até que a administradora seja migrada. Ficam fora do documento enquanto o cliente V2 está montado,
   para que exista uma única implementação visual ativa por vez. A ordem é a original de main.tsx. */
// Vinha de App.tsx, avaliado antes das folhas de main.tsx; a posição original é mantida.
import calendar from '../../page4-calendar.css?inline';
import s0 from '../../styles.css?inline';
import s1 from '../../modules.css?inline';
import s2 from '../../ux-v2.css?inline';
import s3 from '../../runtime.css?inline';
import s4 from '../../page1.css?inline';
import s5 from '../../page1-hotfix.css?inline';
import s6 from '../../page1-pass2.css?inline';
import s7 from '../../page1-rules.css?inline';
import s8 from '../../workspace-invariants.css?inline';
import s9 from '../../dashboard-scroll-fix.css?inline';
import s10 from '../../brand-experience.css?inline';
import s11 from '../../brand-experience-v2.css?inline';
import s12 from '../../menu-brand-final.css?inline';
import s13 from '../../theme-system.css?inline';
import s14 from '../../modal-standard-v2.css?inline';
import s15 from '../../modal-system-v3.css?inline';
import s16 from '../../workspace-typography-connect.css?inline';
import s17 from '../../sidebar-brand-artwork.css?inline';
import s18 from '../../sidebar-capacity-v2.css?inline';
import s19 from '../../login-home-v2.css?inline';
import s20 from '../../landing-page.css?inline';
import s21 from '../../login-theme-isolation.css?inline';
import s22 from '../../workspace-polish-2026-08-30.css?inline';
import s23 from '../../sidebar-closed-profile-fix.css?inline';
import s24 from '../../sidebar-open-night-profile-fix.css?inline';
import s25 from '../../profile-avatar-polish.css?inline';
import s26 from '../../identity-media.css?inline';
import s27 from '../../app-error-boundary.css?inline';
import s28 from '../../notification-experience-v2.css?inline';
import s29 from '../../loading-illustrations-final.css?inline';
import s30 from '../../chat-night-standard-v42.css?inline';
import s31 from '../../workspace-theme-polish-v52.css?inline';
import s32 from '../../critical-fixes-v53.css?inline';
import s33 from '../../workspace-system-v61.css?inline';
import s34 from '../../global-timer.css?inline';
import s35 from '../../uxui-shell-dashboard-preview.css?inline';
import s36 from '../../workspace-conversations-responsive-v63.css?inline';
import s37 from '../../client-reports-top-shortcut.css?inline';
import s38 from '../../client-document-brand-cover.css?inline';
import s39 from '../../client-reports-list-v64.css?inline';
import s40 from '../../profile-account-clean-v65.css?inline';
import s41 from '../../profile-account-v66.css?inline';
import s42 from '../../profile-correction-v67.css?inline';
import s43 from '../workspace-v2.css?inline';

const sheet = [calendar, s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11, s12, s13, s14, s15, s16, s17, s18, s19, s20, s21, s22, s23, s24, s25, s26, s27, s28, s29, s30, s31, s32, s33, s34, s35, s36, s37, s38, s39, s40, s41, s42, s43].join('\n');
const id = 'cali-legacy-styles';

export function mountLegacyStyles() {
  if (document.getElementById(id)) return;
  const element = document.createElement('style');
  element.id = id;
  element.textContent = sheet;
  document.head.append(element);
}

export function unmountLegacyStyles() {
  document.getElementById(id)?.remove();
}
