/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-cdaecb76'], (function (workbox) { 'use strict';

  importScripts("/sw-push.js");
  self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
      self.skipWaiting();
    }
  });

  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "sw-push.js",
    "revision": "5177237eb7ce3f310f57fc1cd3bf60fd"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "dea44f663f5eeb54c810954a32b47196"
  }, {
    "url": "pwa-512x512.png",
    "revision": "59d382c66a0a940ceda0e417af31a0fb"
  }, {
    "url": "pwa-192x192.png",
    "revision": "99a0fb7442421ec24e3ed96d5de900da"
  }, {
    "url": "index.html",
    "revision": "65cde0261340c464be69ba63f2ae3208"
  }, {
    "url": "icon.svg",
    "revision": "d44d6f447b14859e8fbdb170e20c40f2"
  }, {
    "url": "apple-touch-icon.png",
    "revision": "7f65618c011e9fab770774940da33dfd"
  }, {
    "url": "assets/purify.es-Dzkdzyfv.js",
    "revision": null
  }, {
    "url": "assets/index.es-CjXkvgXT.js",
    "revision": null
  }, {
    "url": "assets/index-BYMpoGYR.js",
    "revision": null
  }, {
    "url": "assets/index-B8mdEOPB.css",
    "revision": null
  }, {
    "url": "assets/html2canvas-C0d4RLsh.js",
    "revision": null
  }, {
    "url": "apple-touch-icon.png",
    "revision": "7f65618c011e9fab770774940da33dfd"
  }, {
    "url": "icon.svg",
    "revision": "d44d6f447b14859e8fbdb170e20c40f2"
  }, {
    "url": "pwa-192x192.png",
    "revision": "99a0fb7442421ec24e3ed96d5de900da"
  }, {
    "url": "pwa-512x512.png",
    "revision": "59d382c66a0a940ceda0e417af31a0fb"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "dea44f663f5eeb54c810954a32b47196"
  }, {
    "url": "sw-push.js",
    "revision": "5177237eb7ce3f310f57fc1cd3bf60fd"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("/index.html"), {
    denylist: [/^\/api\//]
  }));
  workbox.registerRoute(/^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "google-fonts-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 20,
      maxAgeSeconds: 31536000
    })]
  }), 'GET');

}));
