import { useEffect, useState } from 'react';
import { TooltipProvider } from './Tooltip';
import { Roster } from './Roster';
import { Builder } from './Builder';
import { SheetPreview } from './SheetPreview';
import { PlaySheet } from './PlaySheet';

type Route =
  | { name: 'roster' }
  | { name: 'builder'; id: string }
  | { name: 'sheet'; id: string }
  | { name: 'play'; id: string };

function parseHash(): Route {
  const h = window.location.hash.replace(/^#\/?/, '');
  const [screen, id] = h.split('/');
  if (screen === 'builder' && id) return { name: 'builder', id };
  if (screen === 'sheet' && id) return { name: 'sheet', id };
  if (screen === 'play' && id) return { name: 'play', id };
  return { name: 'roster' };
}

export function navigate(route: Route): void {
  if (route.name === 'roster') window.location.hash = '#/';
  else window.location.hash = `#/${route.name}/${route.id}`;
}

export function App() {
  const [route, setRoute] = useState<Route>(parseHash());

  useEffect(() => {
    const onHash = () => setRoute(parseHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  return (
    <TooltipProvider>
      {route.name === 'roster' && <Roster />}
      {route.name === 'builder' && <Builder id={route.id} key={route.id} />}
      {route.name === 'sheet' && <SheetPreview id={route.id} key={route.id} />}
      {route.name === 'play' && <PlaySheet id={route.id} key={route.id} />}
    </TooltipProvider>
  );
}
