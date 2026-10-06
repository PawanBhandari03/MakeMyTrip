package com.makemytrip.makemytrip.services;
import com.makemytrip.makemytrip.models.Users;
import com.makemytrip.makemytrip.repositories.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class UserServices{
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private PasswordEncoder passwordEncoder;

    /** "admin" and "user" are accepted as shortcuts for admin@makemytrip.com and user@makemytrip.com. */
    private static String loginId(String identifier){
        String id = identifier == null ? "" : identifier.trim();
        return id.contains("@") ? id : id.toLowerCase() + "@makemytrip.com";
    }

    public Users login(String email ,String password){
        Users user = userRepository.findByEmail(loginId(email));
        if(user != null && passwordEncoder.matches(password,user.getPassword())){
            return  user;
        }
        return null;
    }

    private static void requireValidPhone(String phone){
        if (phone == null || !phone.matches("[0-9]{10}")) {
            throw new RuntimeException("Phone number must be exactly 10 digits");
        }
    }

    public Users signup(Users user){
        requireValidPhone(user.getPhoneNumber());
        if(userRepository.findByEmail(user.getEmail())!= null){
            throw new RuntimeException("Email is already registered");
        }
        user.setPassword(passwordEncoder.encode((user.getPassword())));
        // Never trust a role sent by the client; admins are created by the seeder / directly in the database.
        user.setRole("USER");
        user.setBookings(new java.util.ArrayList<>());
        return userRepository.save(user);

    }
    public Users getUserByEmail(String email){
        return userRepository.findByEmail(email);
    }

    public Users editprofile(String id,Users updatedUser){
        requireValidPhone(updatedUser.getPhoneNumber());
        Users user=userRepository.findById(id).orElse(null);
        if(user != null){
            user.setFirstName(updatedUser.getFirstName());
            user.setLastName(updatedUser.getLastName());
            user.setPhoneNumber(updatedUser.getPhoneNumber());
            return userRepository.save(user);
        }
        return null;
    }


}