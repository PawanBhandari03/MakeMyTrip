package com.makemytrip.makemytrip.models;
import com.fasterxml.jackson.annotation.JsonProperty;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.List;
import java.util.ArrayList;
@Document(collection = "users")
public class Users {
    @Id
    private String _id;
    private String firstName;
    private String lastName;
    private String email;
    private String password;
    private String role;
    private String phoneNumber;
    private List<Booking> bookings = new ArrayList<>();;


    public String getFirstName() {return firstName;}
    public String getId() {
        return _id;
    }
    public void setFirstName(String firstName) {
        this.firstName = firstName;
    }
    public String getLastName() {
        return lastName;
    }
    public void setLastName(String lastName) {
        this.lastName = lastName;
    }
    public void setPhoneNumber(String phoneNumber) {
        this.phoneNumber = phoneNumber;
    }
    public String getPhoneNumber() {
        return phoneNumber;
    }
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    public String getPassword() {return password;}
    public String getEmail() {return email;}
    public void setEmail(String email) {this.email = email;}
    public String getRole() {return role;}
    public void setPassword(String password) {this.password = password;}
    public void setRole(String role) {this.role = role;}
    public List<Booking> getBookings(){return bookings;}
    public void setBookings(List<Booking> bookings){this.bookings=bookings;}


    @lombok.Getter
    @lombok.Setter
    public static class Booking{
        private String type;
        /** Id of the flight / hotel / listing that was booked. */
        private String bookingId;
        /** Human friendly reference shown to the customer, e.g. MMT7K2Q9XA. */
        private String reference;
        private String title;
        private String category;
        /** CONFIRMED or CANCELLED. */
        private String status;
        private String date;
        private String bookedAt;
        private String travelDate;
        private int quantity;
        private int nights;
        private double discount;
        private double totalPrice;
        /** Price per seat, night or ticket that was charged, and the base fare it started from. */
        private double unitPrice;
        private double basePrice;
        /** Net dynamic-pricing adjustment applied to the base fare, in percent. */
        private double adjustmentPct;
        /** True when a price freeze set the price; {@code freezeCredit} is the freeze fee taken off the total. */
        private boolean priceFrozen;
        private double freezeCredit;
        /** Non-refundable booking fee included in the total. */
        private double fees;
        /** How many of the booked units have been cancelled so far, and the money refunded for them. */
        private int cancelledQuantity;
        private double refundAmount;
        private String cancelReason;
        private String cancelledAt;
    }
}
