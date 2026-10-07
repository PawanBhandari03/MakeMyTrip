package com.makemytrip.makemytrip.config;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import com.makemytrip.makemytrip.services.PriceChangedException;

import java.util.Map;

/** Turns service-level RuntimeExceptions into a 400 with a readable message instead of a 500. */
@RestControllerAdvice
public class GlobalExceptionHandler {

    /** The price moved while the customer was booking: 409 with the new total so the page can ask them to confirm. */
    @ExceptionHandler(PriceChangedException.class)
    public ResponseEntity<Map<String, Object>> handlePriceChanged(PriceChangedException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                "message", ex.getMessage(),
                "code", "PRICE_CHANGED",
                "expectedTotal", ex.getExpectedTotal(),
                "total", ex.getNewTotal()));
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Map<String, String>> handleRuntime(RuntimeException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", ex.getMessage() == null ? "Request failed" : ex.getMessage()));
    }
}
