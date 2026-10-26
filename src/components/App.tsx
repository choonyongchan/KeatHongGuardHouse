/**
 * @fileoverview App — root router, always light, with a playful bottom tab bar.
 */

import { useEffect } from 'react';
import { Navigate, Route, Routes, HashRouter, useLocation, useNavigate } from 'react-router-dom';
import { useLaunchParams, hapticFeedback, miniApp } from '@tma.js/sdk-react';
import { AppRoot } from '@telegram-apps/telegram-ui';
import { Analytics } from '@vercel/analytics/react';

import { FeedPage } from '@/pages/FeedPage.tsx';
import { CreatePage } from '@/pages/CreatePage.tsx';
import { SettingsPage } from '@/pages/SettingsPage.tsx';
import { ToastProvider } from './ToastProvider.tsx';
import { bottomBarStyle, theme } from '@/lib/theme.ts';

/** Tab routes, in tab bar order. */
const routes = [
  { path: '/',         Component: FeedPage,     tabLabel: 'Groups',   tabIcon: '🎮' },
  { path: '/create',   Component: CreatePage,   tabLabel: 'Create',   tabIcon: '✨' },
  { path: '/settings', Component: SettingsPage, tabLabel: 'Settings', tabIcon: '⚙️' },
];

/** `?tab=` from a bot command button (api/_botCopy.ts); consumed once so tab switches aren't hijacked. */
let pendingTab: string | null = new URLSearchParams(window.location.search).get('tab');

function AppTabbar() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const path = `/${pendingTab}`;
    pendingTab = null;
    if (routes.some((r) => r.path === path)) void navigate(path, { replace: true });
  }, [navigate]);

  function handleSelect(path: string) {
    if (location.pathname !== path) {
      hapticFeedback.selectionChanged();
      void navigate(path);
    }
  }

  return (
    <nav style={{
      ...bottomBarStyle, bottom: 0, zIndex: 100, display: 'flex',
      padding: `0 ${theme.gutter} env(safe-area-inset-bottom)`,
    }}>
      {routes.map((route) => {
        const selected = location.pathname === route.path;
        return (
          <button
            key={route.path}
            onClick={() => handleSelect(route.path)}
            aria-current={selected ? 'page' : undefined}
            style={{
              flex: 1, height: 52, margin: '6px 4px', borderRadius: 16, cursor: 'pointer',
              background: selected ? theme.accentLight : 'none',
              border: `2px solid ${selected ? theme.accent : 'transparent'}`,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
              color: selected ? theme.accent : theme.textMuted, fontSize: 12, fontWeight: 800,
            }}
          >
            <span style={{
              fontSize: 22, lineHeight: 1, filter: selected ? 'none' : 'grayscale(1)', opacity: selected ? 1 : 0.6,
              transform: selected ? 'scale(1.12)' : 'none', transition: 'transform 0.15s ease',
            }}>{route.tabIcon}</span>
            {route.tabLabel}
          </button>
        );
      })}
    </nav>
  );
}

/**
 * Root application component: AppRoot pinned to light (ignores Telegram's dark theme),
 * then a HashRouter with tab-based navigation.
 */
export function App() {
  const lp = useLaunchParams();

  // Match Telegram's chrome to the cream canvas so the app reads as one light surface.
  useEffect(() => {
    miniApp.setHeaderColor.ifAvailable('#fff8ec');
    miniApp.setBgColor.ifAvailable('#fff8ec');
    miniApp.setBottomBarColor.ifAvailable('#fff8ec');
  }, []);

  return (
    <AppRoot
      appearance="light"
      platform={['macos', 'ios'].includes(lp.tgWebAppPlatform) ? 'ios' : 'base'}
    >
      <ToastProvider>
        <HashRouter>
          <Routes>
            {routes.map(({ path, Component }) => (
              <Route key={path} path={path} element={<Component />} />
            ))}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
          <AppTabbar />
          <Analytics />
        </HashRouter>
      </ToastProvider>
    </AppRoot>
  );
}
