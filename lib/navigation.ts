import type { Href, Router } from 'expo-router';

export function goBackOrReplace(router: Router, fallback: Href) {
  if (typeof router.canGoBack === 'function' && router.canGoBack()) {
    router.back();
    return;
  }

  router.replace(fallback);
}
