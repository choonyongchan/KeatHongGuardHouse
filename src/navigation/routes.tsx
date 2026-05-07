/**
 * @fileoverview Route definitions for the KeatHong MiniApp.
 * Each route maps to a full-page tab component.
 */

import type { ComponentType } from 'react';

import { BrowsePage } from '@/pages/BrowsePage.tsx';
import { CreatePage } from '@/pages/CreatePage.tsx';
import { MyGroupsPage } from '@/pages/MyGroupsPage.tsx';
import { SettingsPage } from '@/pages/SettingsPage.tsx';

/** A single application route. */
export interface AppRoute {
  path: string;
  Component: ComponentType;
  tabLabel: string;
  tabIcon: string;
}

/** All tab routes, ordered as they appear in the bottom TabBar. */
export const routes: AppRoute[] = [
  { path: '/',          Component: BrowsePage,   tabLabel: 'Browse',   tabIcon: '🍱' },
  { path: '/create',    Component: CreatePage,    tabLabel: 'Create',   tabIcon: '➕' },
  { path: '/my-groups', Component: MyGroupsPage,  tabLabel: 'Mine',     tabIcon: '👤' },
  { path: '/settings',  Component: SettingsPage,  tabLabel: 'Settings', tabIcon: '⚙️' },
];
