package com.lms.loanmanagementsystem.repository;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserRepositoryTest {

    @Mock
    private UserRepository userRepository;

    @Test
    void shouldCheckEmailExists() {
        when(userRepository.existsByEmail("test@example.com")).thenReturn(true);

        assertTrue(userRepository.existsByEmail("test@example.com"));
    }
}
