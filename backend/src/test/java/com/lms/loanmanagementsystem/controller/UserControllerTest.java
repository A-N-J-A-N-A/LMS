package com.lms.loanmanagementsystem.controller;

import com.lms.loanmanagementsystem.dto.KycStatusResponse;
import com.lms.loanmanagementsystem.dto.KycUpdateRequest;
import com.lms.loanmanagementsystem.dto.UpdateUserProfileRequest;
import com.lms.loanmanagementsystem.dto.UserLoanApplicationResponse;
import com.lms.loanmanagementsystem.dto.UserProfileResponse;
import com.lms.loanmanagementsystem.model.KycStatus;
import com.lms.loanmanagementsystem.model.LoanApplication;
import com.lms.loanmanagementsystem.service.UserService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserControllerTest {

    @Mock
    private UserService userService;

    @InjectMocks
    private UserController userController;

    @Mock
    private Authentication authentication;

    @Test
    void shouldGetProfileFromService() {
        UserProfileResponse profile = org.mockito.Mockito.mock(UserProfileResponse.class);
        when(authentication.getName()).thenReturn("user-1");
        when(userService.getUserProfile("user-1")).thenReturn(profile);

        UserProfileResponse actual = userController.getProfile(authentication);

        assertSame(profile, actual);
        verify(userService).getUserProfile("user-1");
    }

    @Test
    void shouldUpdateProfileThroughService() {
        UpdateUserProfileRequest request = new UpdateUserProfileRequest();
        UserProfileResponse updated = org.mockito.Mockito.mock(UserProfileResponse.class);
        when(authentication.getName()).thenReturn("user-1");
        when(userService.updateUserProfile("user-1", request)).thenReturn(updated);

        UserProfileResponse actual = userController.updateProfile(request, authentication);

        assertSame(updated, actual);
        verify(userService).updateUserProfile("user-1", request);
    }

    @Test
    void shouldGetUserLoansFromService() {
        List<LoanApplication> loans = List.of(new LoanApplication());
        when(authentication.getName()).thenReturn("user-1");
        when(userService.getUserLoans("user-1")).thenReturn(loans);

        List<LoanApplication> actual = userController.getUserLoans(authentication);

        assertSame(loans, actual);
        verify(userService).getUserLoans("user-1");
    }

    @Test
    void shouldGetUserApplicationsFromService() {
        List<UserLoanApplicationResponse> apps =
                List.of(org.mockito.Mockito.mock(UserLoanApplicationResponse.class));
        when(authentication.getName()).thenReturn("user-1");
        when(userService.getUserApplications("user-1")).thenReturn(apps);

        List<UserLoanApplicationResponse> actual = userController.getUserApplications(authentication);

        assertSame(apps, actual);
        verify(userService).getUserApplications("user-1");
    }

    @Test
    void shouldUpdateKycThroughService() {
        KycUpdateRequest request = new KycUpdateRequest();
        when(authentication.getName()).thenReturn("user-1");

        userController.updateKyc(request, authentication);

        verify(userService).updateKyc("user-1", request);
    }

    @Test
    void shouldGetKycStatusFromService() {
        KycStatusResponse response = new KycStatusResponse(KycStatus.VERIFIED, true);
        when(authentication.getName()).thenReturn("user-1");
        when(userService.getKycStatus("user-1")).thenReturn(response);

        KycStatusResponse actual = userController.getKycStatus(authentication);

        assertSame(response, actual);
        verify(userService).getKycStatus("user-1");
    }
}
