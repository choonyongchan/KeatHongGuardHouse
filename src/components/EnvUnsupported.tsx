/**
 * @fileoverview Fallback UI rendered when the app is opened in an outdated or
 * non-Telegram client that cannot provide a compatible WebApp environment.
 */

import { Placeholder, AppRoot } from '@telegram-apps/telegram-ui';
import { retrieveLaunchParams, isColorDark, isRGB } from '@tma.js/sdk-react';
import { useMemo } from 'react';

/**
 * Renders an error placeholder when the Telegram client version is unsupported.
 * Attempts to derive the correct theme and platform from launch params; falls
 * back to light Android defaults if params are unavailable.
 *
 * @returns A themed AppRoot containing a Placeholder error message.
 */
export function EnvUnsupported() {
  const [platform, isDark] = useMemo(() => {
    try {
      const lp = retrieveLaunchParams();
      const { bg_color: bgColor } = lp.tgWebAppThemeParams;
      return [lp.tgWebAppPlatform, bgColor && isRGB(bgColor) ? isColorDark(bgColor) : false];
    } catch {
      return ['android', false];
    }
  }, []);

  return (
    <AppRoot
      appearance={isDark ? 'dark' : 'light'}
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