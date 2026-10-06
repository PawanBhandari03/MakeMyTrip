package com.makemytrip.makemytrip;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class MakemytripApplication {

	public static void main(String[] args) {
		// All flight times are India time; this keeps "now" correct when the host runs in UTC (for example on Render).
		java.util.TimeZone.setDefault(java.util.TimeZone.getTimeZone("Asia/Kolkata"));
		SpringApplication.run(MakemytripApplication.class, args);
	}

}

