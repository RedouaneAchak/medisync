package com.medisync.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * TEMPORARY debug filter — add this to your project, hit the doctors page,
 * check your Spring console for the ">>> PATH" line, then delete this file.
 */
@Component
@Order(1) // runs before everything else
public class DebugFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        System.out.printf(">>> PATH [%s] %s | ContextPath='%s' | ServletPath='%s'%n",
            request.getMethod(),
            request.getRequestURI(),
            request.getContextPath(),
            request.getServletPath()
        );
        chain.doFilter(request, response);
    }
}
