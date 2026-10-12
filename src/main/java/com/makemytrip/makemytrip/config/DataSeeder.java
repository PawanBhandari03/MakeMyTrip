package com.makemytrip.makemytrip.config;

import com.makemytrip.makemytrip.models.Users;
import com.makemytrip.makemytrip.repositories.FlightStatusRepository;
import com.makemytrip.makemytrip.repositories.UserRepository;
import com.makemytrip.makemytrip.services.DummyDataService;
import com.makemytrip.makemytrip.services.FlightStatusService;
import com.makemytrip.makemytrip.services.RecommendationSeeder;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * Runs on startup: makes sure demo data, flight statuses and a default admin exist.
 * Nothing is overwritten; see {@link DummyDataService#load(boolean)}.
 */
@Configuration
public class DataSeeder {

    @Bean
    CommandLineRunner seedDatabase(DummyDataService dummyData,
                                   UserRepository users,
                                   FlightStatusRepository flightStatuses,
                                   FlightStatusService flightStatusService,
                                   PasswordEncoder passwordEncoder,
                                   RecommendationSeeder recommendationSeeder) {
        return args -> {
            dummyData.load(false);
            // the built-in accounts were renamed with the product: move existing ones over instead of creating duplicates
            for (String older : new String[]{"makemytrip.com", "travelease.com"}) {
                renameAccount(users, "admin@" + older, "admin@voyago.com");
                renameAccount(users, "user@" + older, "user@voyago.com");
            }
            if (users.findByEmail("admin@voyago.com") == null) {
                Users admin = new Users();
                admin.setFirstName("Admin");
                admin.setLastName("User");
                admin.setEmail("admin@voyago.com");
                admin.setPhoneNumber("9999999999");
                admin.setPassword(passwordEncoder.encode("admin123"));
                admin.setRole("ADMIN");
                users.save(admin);
            }
            if (users.findByEmail("user@voyago.com") == null) {
                Users demo = new Users();
                demo.setFirstName("Demo");
                demo.setLastName("User");
                demo.setEmail("user@voyago.com");
                demo.setPhoneNumber("9999999998");
                demo.setPassword(passwordEncoder.encode("user123"));
                demo.setRole("USER");
                users.save(demo);
            }
            recommendationSeeder.seedDemoUser();
            if (flightStatuses.count() == 0) {
                flightStatusService.seedMockData();
            } else {
                flightStatusService.syncFromFlights();
            }
        };
    }

    /** Gives an existing account its new address, unless an account with the new address already exists. */
    private static void renameAccount(UserRepository users, String from, String to) {
        Users old = users.findByEmail(from);
        if (old != null && users.findByEmail(to) == null) {
            old.setEmail(to);
            users.save(old);
        }
    }
}
