export const ROUTES = {
  listings: '/',
  groups: '/groups',
  setup: '/setup',
  guide: '/guide',
  receive: '/receive',
  settings: '/settings',
} as const;

export type RouteKey = keyof typeof ROUTES;
