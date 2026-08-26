import { useEffect, useRef, useState } from 'react';
import { TooltipProvider } from './Tooltip';
import { Roster } from './Roster';
import { Builder } from './Builder';
import { SheetPreview } from './SheetPreview';
import { PlaySheet } from './PlaySheet';
import { AccountProvider, useAccountState } from './account';
import { boot, type Boot } from '../storage/store';

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
  // Which account we are, and that account's roster, must both be settled before any screen
  // reads a character — otherwise the first render shows the wrong (or an empty) roster and
  // flips a moment later.
  const [booted, setBooted] = useState<Boot | null>(null);
  // StrictMode runs effects twice in development; booting twice would fire a second round of
  // requests and flush the sync queue concurrently with itself.
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void boot().then(setBooted);
  }, []);

  if (!booted) return <BootScreen />;
  return <Routed booted={booted} />;
}

function Routed({ booted }: { booted: Boot }) {
  const [route, setRoute] = useState<Route>(parseHash());
  const account = useAccountState(booted);

  useEffect(() => {
    const onHash = () => setRoute(parseHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  return (
    <AccountProvider value={account}>
      <TooltipProvider>
        {route.name === 'roster' && <Roster />}
        {route.name === 'builder' && <Builder id={route.id} key={route.id} />}
        {route.name === 'sheet' && <SheetPreview id={route.id} key={route.id} />}
        {route.name === 'play' && <PlaySheet id={route.id} key={route.id} />}
      </TooltipProvider>
    </AccountProvider>
  );
}

/** Deliberately plain: this is on screen for one request against our own server, and a spinner
 *  that flashes for 40ms reads as a glitch. */
function BootScreen() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--color-accent)' }}>Pathmaker</span>
    </div>
  );
}
