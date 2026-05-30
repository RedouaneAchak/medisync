package com.medisync.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // This tells Spring Boot: "If a URL starts with /uploads/, 
        // go look for the file in the physical 'uploads' folder on the hard drive."
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations("file:uploads/");
    }
}