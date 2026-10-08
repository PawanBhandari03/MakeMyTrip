package com.makemytrip.makemytrip.config;

import com.makemytrip.makemytrip.controllers.ListingController;
import com.makemytrip.makemytrip.controllers.RootController;
import com.makemytrip.makemytrip.services.RecommendationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/** Builds the catalogue lists as soon as the server is up, so the first visitor does not have to wait for them. */
@Component
public class CatalogWarmup {
    @Autowired
    private RootController rootController;
    @Autowired
    private ListingController listingController;
    @Autowired
    private RecommendationService recommendationService;

    @EventListener(ApplicationReadyEvent.class)
    public void warm() {
        Thread t = new Thread(() -> {
            try {
                rootController.getallflights();
                rootController.getallhotel();
                listingController.list(null);
                recommendationService.refresh();
            } catch (RuntimeException ignored) {
                // the lists are simply built on the first request instead
            }
        }, "catalog-warmup");
        t.setDaemon(true);
        t.start();
    }
}
