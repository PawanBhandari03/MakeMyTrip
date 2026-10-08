package com.makemytrip.makemytrip.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/** Forgets the cached catalogue after anything an admin changes (adding, editing, deleting, resetting demo data). */
@Configuration
public class CatalogCacheConfig implements WebMvcConfigurer {
    @Autowired
    private CatalogCache catalogCache;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(new HandlerInterceptor() {
            @Override
            public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) {
                if (!"GET".equals(request.getMethod())) catalogCache.clear();
            }
        }).addPathPatterns("/admin/**");
    }
}
