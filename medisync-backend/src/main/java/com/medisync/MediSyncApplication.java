package com.medisync;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class MediSyncApplication {

	public static void main(String[] args) {
		SpringApplication.run(MediSyncApplication.class, args);
	}

}
