/**
 * @fileoverview App — root router with AppRoot theming and bottom Tabbar navigation.
 */

import { useEffect } from 'react';
import { Navigate, Route, Routes, HashRouter, useLocation, useNavigate } from 'react-router-dom';
import { useLaunchParams, useSignal, hapticFeedback, miniApp } from '@tma.js/sdk-react';
import { AppRoot, Tabbar } from '@telegram-apps/telegram-ui';
import { Analytics } from '@vercel/analytics/react';

import { routes } from '@/navigation/routes.tsx';
import { ToastProvider } from './ToastProvider.tsx';

/** localStorage key marking that the user has opened the app before. */
const HAS_VISITED_KEY = 'kh_has_visited';

/**
 * Redirects brand-new users to the Help tab on their very first launch,
 * so they see the how-to guide before anything else. Runs once per device
 * (tracked via localStorage), and only when landing on the default route.
 *
 * @returns Nothing; performs a navigation side effect.
 */
function FirstVisitRedirect() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (location.pathname !== '/') return;
    if (localStorage.getItem(HAS_VISITED_KEY)) return;

    localStorage.setItem(HAS_VISITED_KEY, '1');
    void navigate('/help', { replace: true });
  }, []);

  return null;
}

/**
 * Bottom tab bar that highlights the active route and navigates on tap.
 * Extracted as a helper component to keep App lean.
 *
 * @returns A Telegram UI Tabbar element.
 */
function AppTabbar() {
  const location = useLocation();
  const navigate = useNavigate();

  /**
   * Handles tab selection with haptic feedback.
   *
   * @param path - The route path to navigate to.
   */
  function handleSelect(path: string) {
    if (location.pathname !== path) {
      hapticFeedback.selectionChanged();
      void navigate(path);
    }
  }

  return (
    <Tabbar style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100 }}>
      {routes.map((route) => (
        <Tabbar.Item
          key={route.path}
          text={route.tabLabel}
          selected={location.pathname === route.path}
          onClick={() => handleSelect(route.path)}
          style={location.pathname === route.path ? { color: '#22c55e' } : undefined}
        >
          <span style={{ fontSize: 20 }}>{route.tabIcon}</span>
        </Tabbar.Item>
      ))}
    </Tabbar>
  );
}

/**
 * Root application component.
 * Wraps the app in Telegram's AppRoot for automatic theme application,
 * then renders a HashRouter with tab-based navigation.
 *
 * @returns The themed application shell.
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
          <FirstVisitRedirect />
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
