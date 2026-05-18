package com.zoujuexian.aiagentdemo.config;

import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class CiFilterConfig {

    @Bean
    public FilterRegistrationBean<CiAuthFilter> ciAuthFilterRegistration(CiAuthFilter ciAuthFilter) {
        FilterRegistrationBean<CiAuthFilter> registration = new FilterRegistrationBean<>();
        registration.setFilter(ciAuthFilter);
        registration.addUrlPatterns("/api/v1/ci/*");
        registration.setOrder(1);
        return registration;
    }
}
