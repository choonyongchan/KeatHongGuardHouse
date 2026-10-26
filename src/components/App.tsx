/**
 * @fileoverview App — root router with AppRoot theming and a frosted bottom tab bar.
 */

import { useEffect } from 'react';
import { Navigate, Route, Routes, HashRouter, useLocation, useNavigate } from 'react-router-dom';
import { useLaunchParams, useSignal, hapticFeedback, miniApp } from '@tma.js/sdk-react';
import { AppRoot } from '@telegram-apps/telegram-ui';
import { Analytics } from '@vercel/analytics/react';

import { FeedPage } from '@/pages/FeedPage.tsx';
import { CreatePage } from '@/pages/CreatePage.tsx';
import { SettingsPage } from '@/pages/SettingsPage.tsx';
import { ToastProvider } from './ToastProvider.tsx';
import { bottomBarStyle, theme } from '@/lib/theme.ts';

/** Tab routes, in tab bar order. */
const routes = [
  { path: '/',         Component: FeedPage,     tabLabel: 'Groups',   tabIcon: '👥' },
  { path: '/create',   Component: CreatePage,   tabLabel: 'Create',   tabIcon: '➕' },
  { path: '/settings', Component: SettingsPage, tabLabel: 'Settings', tabIcon: '⚙️' },
];

function AppTabbar() {
  const location = useLocation();
  const navigate = useNavigate();

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
              flex: 1, height: 56, background: 'none', border: 'none', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
              color: selected ? theme.accent : theme.textSecondary, fontSize: 12, fontWeight: selected ? 600 : 400,
            }}
          >
            <span style={{ fontSize: 20, lineHeight: 1, opacity: selected ? 1 : 0.6 }}>{route.tabIcon}</span>
            {route.tabLabel}
          </button>
        );
      })}
    </nav>
  );
}

/**
 * Root application component: AppRoot for Telegram theming, then a HashRouter
 * with tab-based navigation.
 */
export function App() {
  const lp = useLaunchParams();
  const isDark = useSignal(miniApp.isDark);

  useEffect(() => {
    document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
  }, [isDark]);

  return (
    <AppRoot
      appearance={isDark ? 'dark' : 'light'}
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
