/**
 * @fileoverview Application entry point.
 * Imports Telegram UI styles, mocks the Telegram environment in development,
 * initialises the SDK via init(), then renders Root inside StrictMode.
 * Falls back to EnvUnsupported if the environment is incompatible.
 */

// Include Telegram UI styles first to allow our code override the package CSS.
import '@telegram-apps/telegram-ui/dist/styles.css';

import ReactDOM from 'react-dom/client';
import { StrictMode } from 'react';
import { retrieveLaunchParams } from '@tma.js/sdk-react';

import { Root } from '@/components/Root.tsx';
import { EnvUnsupported } from '@/components/EnvUnsupported.tsx';
import { init } from '@/init.ts';
import { setPendingInviteCode } from '@/lib/pendingInvite.ts';

import './index.css';

// Mock the environment in case, we are outside Telegram.
import './mockEnv.ts';

const root = ReactDOM.createRoot(document.getElementById('root')!);

try {
  const launchParams = retrieveLaunchParams();
  const { tgWebAppPlatform: platform } = launchParams;
  const startParam = launchParams.tgWebAppStartParam || '';
  const debug = startParam.includes('debug') || import.meta.env.DEV;

  // A start param that looks like a group invite code (letters only, not the
  // debug sentinel) is stashed for BrowsePage to look up once mounted.
  if (startParam && /^[A-Za-z]+$/.test(startParam)) {
    setPendingInviteCode(startParam.toUpperCase());
  }

  // Configure all application dependencies.
  init({
    debug,
    eruda: debug && ['ios', 'android'].includes(platform),
    mockForMacOS: platform === 'macos',
  });

  root.render(
    <StrictMode>
      <Root/>
    </StrictMode>,
  );
} catch {
  root.render(<EnvUnsupported/>);
}
