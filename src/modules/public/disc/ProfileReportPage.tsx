import { useEffect } from 'react';
import '../../shared/disc/profile-pages.css';

export function ProfileReportPage() {
  useEffect(() => { document.title = 'Perfil Comportamental · CALI RH'; }, []);

  return <div className="cali-profile-shell">
    <div className="cps-done">
      <img className="cps-done-logo" src="/brand/cali-rh-bordo.png" alt="CALI RH" />
      <span className="cps-done-mark" aria-hidden="true"><img src="/brand/cali-oak-mark-light.svg" alt="" /></span>
      <h1>Obrigada por responder!</h1>
      <p>Suas respostas foram registradas.</p>
      <div className="cps-done-status">
        Se precisar de uma cópia do seu relatório em PDF, solicite à CALI RH.
      </div>
      <small><a href="mailto:privacidade@calirh.com">privacidade@calirh.com</a></small>
    </div>
  </div>;
}
