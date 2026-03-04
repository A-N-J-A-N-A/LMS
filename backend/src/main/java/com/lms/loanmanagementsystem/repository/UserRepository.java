package com.lms.loanmanagementsystem.repository;

import com.lms.loanmanagementsystem.model.User;
import com.lms.loanmanagementsystem.model.KycStatus;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends MongoRepository<User, String> {

    Optional<User> findByEmail(String email);
    List<User> findByRole(String role);
    List<User> findByRoleAndKycStatus(String role, KycStatus kycStatus);

    boolean existsByEmail(String email);
    boolean existsByMobile(String mobile);

}
