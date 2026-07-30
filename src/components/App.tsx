/**
 * @fileoverview App — root router with AppRoot theming and bottom Tabbar navigation.
 */

import { Navigate, Route, Routes, HashRouter, useLocation, useNavigate } from 'react-router-dom';
import { useLaunchParams, hapticFeedback } from '@tma.js/sdk-react';
import { AppRoot, Tabbar } from '@telegram-apps/telegram-ui';

import { routes } from '@/navigation/routes.tsx';

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

  return (
    <AppRoot
      appearance="light"
      platform={['macos', 'ios'].includes(lp.tgWebAppPlatform) ? 'ios' : 'base'}
    >
      <HashRouter>
        <Routes>
          {routes.map(({ path, Component }) => (
            <Route key={path} path={path} element={<Component />} />
          ))}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
        <AppTabbar />
      </HashRouter>
    </AppRoot>
  );
}
