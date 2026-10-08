package com.makemytrip.makemytrip.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.function.Supplier;

/**
 * Keeps the finished JSON of the big catalogue lists (every flight, hotel and service) in memory.
 * The home page asks for them on every visit, and building them from the database takes seconds on a small server.
 * <ul>
 *   <li>A copy younger than {@link #FRESH_MS} is returned at once.</li>
 *   <li>An older copy is still returned at once, and a fresh one is built in the background for the next visitor.</li>
 *   <li>{@link #clear()} (used after every admin change) forgets everything, so edits show up immediately.</li>
 *   <li>{@link #markStale()} (used after bookings, cancellations and new reviews) keeps serving the old copy once
 *       while the new one is built, since seat counts and ratings may differ by a few seconds without harm; the server
 *       always re-checks them when a booking is made.</li>
 * </ul>
 */
@Component
public class CatalogCache {
    private static final long FRESH_MS = 30_000;

    private static class Entry {
        final byte[] body;
        final long builtAt;
        volatile boolean stale;

        Entry(byte[] body, long builtAt) {
            this.body = body;
            this.builtAt = builtAt;
        }
    }

    @Autowired
    private ObjectMapper mapper;

    private final Map<String, Entry> entries = new ConcurrentHashMap<>();
    private final Set<String> refreshing = ConcurrentHashMap.newKeySet();
    private final ExecutorService worker = Executors.newSingleThreadExecutor(r -> {
        Thread t = new Thread(r, "catalog-cache");
        t.setDaemon(true);
        return t;
    });

    public ResponseEntity<byte[]> get(String key, Supplier<Object> loader) {
        Entry e = entries.get(key);
        if (e == null) return json(build(key, loader).body);
        boolean old = e.stale || System.currentTimeMillis() - e.builtAt > FRESH_MS;
        if (old && refreshing.add(key)) {
            worker.submit(() -> {
                try {
                    build(key, loader);
                } catch (RuntimeException ignored) {
                    // keep serving the old copy; the next visit tries again
                } finally {
                    refreshing.remove(key);
                }
            });
        }
        return json(e.body);
    }

    /** Builds the list now, unless another request has just done it. */
    private synchronized Entry build(String key, Supplier<Object> loader) {
        Entry e = entries.get(key);
        if (e != null && !e.stale && System.currentTimeMillis() - e.builtAt <= FRESH_MS) return e;
        try {
            Entry fresh = new Entry(mapper.writeValueAsBytes(loader.get()), System.currentTimeMillis());
            entries.put(key, fresh);
            return fresh;
        } catch (com.fasterxml.jackson.core.JsonProcessingException ex) {
            throw new RuntimeException("Could not build the list", ex);
        }
    }

    /** Forget everything: the next request rebuilds from the database. */
    public void clear() {
        entries.clear();
    }

    /** Keep serving the old copy once more, but rebuild it in the background. */
    public void markStale() {
        entries.values().forEach(e -> e.stale = true);
    }

    private static ResponseEntity<byte[]> json(byte[] body) {
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON).body(body);
    }
}
