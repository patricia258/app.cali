import { useState } from 'react';
import { Outlet, RouterProvider, createRootRoute, createRoute, createRouter } from '@tanstack/react-router';
import { ExtraVisitExpenses } from '../../src/components/calendar/ExtraVisitExpenses';
import { ExtraVisitRequest } from '../../src/components/calendar/ExtraVisitRequest';
import { Link } from '../../src/components/navigation/Link';
import { Navigate } from '../../src/components/navigation/Navigate';

export function RequestFixture() {
  return (
    <>
      <button
        type="button"
        onClick={() =>
          window.dispatchEvent(
            new CustomEvent('cali:open-papo-request', {
              detail: { date: '2030-01-08', time: '10:00', duration: 89 },
            }),
          )
        }
      >
        Horário da agenda
      </button>
      {location.pathname === '/cliente/cronograma' && <h1>Cronograma fixture</h1>}
      <ExtraVisitRequest />
    </>
  );
}

export function ExpensesFixture() {
  return <ExtraVisitExpenses />;
}

const destination = '/destino?filtro=um&filtro=dois#selecionado';

function NavigationHome() {
  const [redirect, setRedirect] = useState<{ replace: boolean }>();
  const [cancelled, setCancelled] = useState(0);
  return (
    <>
      <h1>Início fixture</h1>
      <Link to={destination}>Destino interno</Link>
      <Link to={destination} target="_blank">
        Nova aba
      </Link>
      <Link to="/fixture-download.txt" download="fixture.txt">
        Download nativo
      </Link>
      <Link to="https://navigation.example.invalid/destino">URL externa</Link>
      <Link to="//navigation.example.invalid/destino">URL sem protocolo</Link>
      <Link
        to={destination}
        onClick={(event) => {
          event.preventDefault();
          setCancelled((count) => count + 1);
        }}
      >
        Cancelar navegação
      </Link>
      <output aria-label="Cancelamentos">{cancelled}</output>
      <button type="button" onClick={() => setRedirect({ replace: false })}>
        Redirecionar e manter origem
      </button>
      <button type="button" onClick={() => setRedirect({ replace: true })}>
        Redirecionar substituindo origem
      </button>
      {redirect && <Navigate to={destination} replace={redirect.replace} />}
    </>
  );
}

const root = createRootRoute({ component: Outlet });
const home = createRoute({ getParentRoute: () => root, path: '/', component: NavigationHome });
const target = createRoute({
  getParentRoute: () => root,
  path: '/destino',
  component: () => (
    <>
      <h1>Destino fixture</h1>
      <Link to={destination}>Mesmo destino</Link>
    </>
  ),
});
const router = createRouter({ routeTree: root.addChildren([home, target]) });

export function NavigationFixture() {
  return <RouterProvider router={router} />;
}
