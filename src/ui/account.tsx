import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { CharacterDoc } from '../engine/types';
import { avatarUrl, beginLogin, logout, type Account } from '../storage/api';
import { markMigrationOffered, migrateLocalRoster } from '../storage/store';
import { subscribeSync, syncStatus, type SyncStatus } from '../storage/sync';

interface AccountApi {
  account: Account | null;
  /** The API could not be reached. Signed out and server-down are different situations and the
   *  UI must not present the second as the first. */
  offline: boolean;
  /** Anonymous characters in this browser that the signed-in account has not been asked about. */
  pendingMigration: CharacterDoc[];
  dismissMigration: () => void;
  runMigration: (clearAfter: boolean) => Promise<number>;
}

const Ctx = createContext<AccountApi | null>(null);

export function useAccount(): AccountApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAccount outside provider');
  return ctx;
}

export function AccountProvider({ value, children }: { value: AccountApi; children: ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Builds the context value from what `boot()` resolved. Kept here so App stays a router. */
export function useAccountState(initial: { account: Account | null; offline: boolean; localRosterToOffer: CharacterDoc[] }): AccountApi {
  const [pendingMigration, setPending] = useState(initial.localRosterToOffer);

  const dismissMigration = () => {
    if (initial.account) markMigrationOffered(initial.account.id);
    setPending([]);
  };

  const runMigration = async (clearAfter: boolean) => {
    if (!initial.account) return 0;
    const n = await migrateLocalRoster(initial.account, pendingMigration, clearAfter);
    setPending([]);
    return n;
  };

  return { account: initial.account, offline: initial.offline, pendingMigration, dismissMigration, runMigration };
}

/** Sign-in button when signed out; name, avatar and a sign-out control when signed in. */
export function AccountBadge() {
  const { account, offline } = useAccount();
  const [busy, setBusy] = useState(false);

  if (offline && !account) {
    return (
      <span className="text-muted" style={{ fontSize: 11 }} title="The character service could not be reached. Characters are being kept in this browser and will not sync until it is back.">
        ⚠ offline
      </span>
    );
  }

  if (!account) {
    return (
      <button className="btn btn-secondary" style={{ fontSize: 12 }} onClick={() => beginLogin()}
        title="Sign in with Discord to keep your characters on your account instead of in this browser">
        Sign in with Discord
      </button>
    );
  }

  const src = avatarUrl(account);
  const signOut = async () => {
    setBusy(true);
    try {
      await logout();
    } finally {
      // A full reload is the honest way back to the anonymous roster: every screen re-reads its
      // character from the (now un-scoped) cache instead of holding a signed-in one in state.
      window.location.hash = '#/';
      window.location.reload();
    }
  };

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      {src
        ? <img src={src} alt="" width={22} height={22} style={{ borderRadius: '50%' }} />
        : <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--color-surface)' }} />}
      <span style={{ fontSize: 12.5 }}>{account.displayName}</span>
      <button className="btn btn-ghost" style={{ fontSize: 11 }} disabled={busy} onClick={signOut}>Sign out</button>
    </span>
  );
}

const SYNC_TEXT: Record<SyncStatus, string> = {
  idle: 'Saved',
  pending: 'Saving…',
  saving: 'Saving…',
  error: 'Not saved',
};

/** Replaces the old static "Saved" label. Signed out it still means "written to this browser";
 *  signed in it tracks whether the server has the latest edit. */
export function SyncBadge() {
  const { account } = useAccount();
  const [state, setState] = useState(syncStatus);

  useEffect(() => subscribeSync(() => setState(syncStatus())), []);

  if (!account) {
    return <span className="text-muted" style={{ fontSize: 11 }} title="Saved in this browser. Sign in to keep characters on your account.">Saved locally</span>;
  }
  const failed = state.status === 'error';
  return (
    <span style={{ fontSize: 11, color: failed ? 'var(--warn-fg)' : 'var(--color-neutral-500)' }}
      title={state.error ?? 'Saved to your account'}>
      {failed ? '⚠ ' : ''}{SYNC_TEXT[state.status]}
    </span>
  );
}
