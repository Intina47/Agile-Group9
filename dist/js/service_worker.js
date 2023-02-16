// This is the service worker with the cache-first strategy.
self.addEventListener('install', (event) => {
    event.waitUntil(
      caches.open('my-static-cache')
        .then((cache) => {
         //all assets we are caching
          return cache.addAll([
            '/',
            '/index.html',
          ]);
        })
    );
  });
  
  self.addEventListener('fetch', (event) => {
    if (!event.request.url.includes('search')) {
        event.respondWith(
            caches.match(event.request)
                .then((response) => {
                    // If a match is found in the cache, return it
                    if (response) {
                        return response;
                    }
                    // If no match is found, fetch the resource from the network
                    return fetch(event.request)
                        .then((response) => {
                            // If the response is valid, clone it and store it in the cache
                            if (response.status === 200 || response.status === 0) {
                                const responseToCache = response.clone();
                                caches.open('my-static-cache')
                                    .then((cache) => {
                                        cache.put(event.request, responseToCache);
                                    });
                            }
                            return response;
                        });
                })
        );
    }
});

self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('search')) {
      event.respondWith(
          fetch(event.request)
              .then((response) => {
                  if (response.headers.get('x-stale-results') === 'true') {
                      // send message to client to refresh the page
                      self.clients.matchAll().then(clients => {
                          clients.forEach(client => {
                              client.postMessage({ action: 'refresh' });
                          });
                      });
                  }
                  return response;
              })
      );
  } else {
      event.respondWith(
          caches.match(event.request)
              .then((response) => {
                  // If a match is found in the cache, return it
                  if (response) {
                      return response;
                  }
                  // If no match is found, fetch the resource from the network
                  return fetch(event.request)
                      .then((response) => {
                          // If the response is valid, clone it and store it in the cache
                          if (response.status === 200 || response.status === 0) {
                              const responseToCache = response.clone();
                              caches.open('my-static-cache')
                                  .then((cache) => {
                                      cache.put(event.request, responseToCache);
                                  });
                          }
                          return response;
                      });
              })
      );
  }
});





  