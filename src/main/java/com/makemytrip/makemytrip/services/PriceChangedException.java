package com.makemytrip.makemytrip.services;

/**
 * Thrown when the price moved between the moment the customer saw it and the moment they pressed Book.
 * The customer is shown the new total and asked to confirm instead of being charged an amount they did not agree to.
 */
public class PriceChangedException extends RuntimeException {

    private final double expectedTotal;
    private final double newTotal;

    public PriceChangedException(double expectedTotal, double newTotal) {
        super("The price changed from ₹" + Math.round(expectedTotal) + " to ₹" + Math.round(newTotal)
                + " while you were booking. Please check the new total and confirm.");
        this.expectedTotal = expectedTotal;
        this.newTotal = newTotal;
    }

    public double getExpectedTotal() {
        return expectedTotal;
    }

    public double getNewTotal() {
        return newTotal;
    }
}
