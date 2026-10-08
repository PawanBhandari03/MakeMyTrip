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
            if (users.findByEmail("admin@makemytrip.com") == null) {
                Users admin = new Users();
                admin.setFirstName("Admin");
                admin.setLastName("User");
                admin.setEmail("admin@makemytrip.com");
                admin.setPhoneNumber("9999999999");
                admin.setPassword(passwordEncoder.encode("admin123"));
                admin.setRole("ADMIN");
                users.save(admin);
            }
            if (users.findByEmail("user@makemytrip.com") == null) {
                Users demo = new Users();
                demo.setFirstName("Demo");
                demo.setLastName("User");
                demo.setEmail("user@makemytrip.com");
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
}
