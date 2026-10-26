/**
 * @fileoverview Fallback UI rendered when the app is opened in an outdated or
 * non-Telegram client that cannot provide a compatible WebApp environment.
 */

import { Placeholder, AppRoot } from '@telegram-apps/telegram-ui';
import { retrieveLaunchParams } from '@tma.js/sdk-react';
import { useMemo } from 'react';

/**
 * Renders an error placeholder when the Telegram client version is unsupported.
 * Always light. Derives the platform from launch params; falls
 * back to light Android defaults if params are unavailable.
 *
 * @returns A themed AppRoot containing a Placeholder error message.
 */
export function EnvUnsupported() {
  const platform = useMemo(() => {
    try {
      return retrieveLaunchParams().tgWebAppPlatform;
    } catch {
      return 'android';
    }
  }, []);

  return (
    <AppRoot
      appearance="light"
      platform={['macos', 'ios'].includes(platform) ? 'ios' : 'base'}
    >
      <Placeholder
        header="Oops"
        description="You are using too old Telegram client to run this application"
      >
        <img
          alt="Telegram sticker"
          src="https://xelene.me/telegram.gif"
          style={{ display: 'block', width: '144px', height: '144px' }}
        />
      </Placeholder>
    </AppRoot>
  );
}