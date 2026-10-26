package com.BankingTech.demo.service;

import com.BankingTech.demo.controller.FixedDepositAccountController;
import com.BankingTech.demo.dto.requestdto.FixedDepositAccountRequestDTO;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.*;
import org.springframework.web.server.ResponseStatusException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class FdCreationAuthorizationTest {
    private FdCreationAuthorization authorization;
    private String profile;
    private int status;
    private String receivedToken;
    @BeforeEach void setup() {
        status = 200;
        profile = "{\"role\":\"CUSTOMER\",\"customerId\":17,\"customerStatus\":\"ACTIVE\"}";
        var client = mock(FdAuthKafkaClient.class);
        when(client.profile(anyString())).thenAnswer(call -> {
            receivedToken = call.getArgument(0);
            if (status != 200) throw new ResponseStatusException(
                status == 403 ? org.springframework.http.HttpStatus.UNAUTHORIZED : org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE);
            return new tools.jackson.databind.json.JsonMapper().readValue(profile, FdCreationAuthorization.Profile.class);
        });
        authorization = new FdCreationAuthorization(client);
    }
    private FixedDepositAccountRequestDTO request(String id) {
        var request = new FixedDepositAccountRequestDTO();
        request.setCustomerId(id);
        return request;
    }
    @Test void acceptsOwnApprovedProfileAndForwardsToken() {
        authorization.authorize("Bearer valid", request("17"));
        assertEquals("Bearer valid", receivedToken);
    }
    @Test void rejectsAnotherCustomerOnBothEndpointsBeforeWriting() {
        var service = mock(FixedDepositAccountService.class);
        var controller = new FixedDepositAccountController(service, authorization);
        assertEquals(403, assertThrows(ResponseStatusException.class,
                () -> controller.createAccount(request("18"), "Bearer valid")).getStatusCode().value());
        assertEquals(403, assertThrows(ResponseStatusException.class,
                () -> controller.createAccountWithTransaction(request("18"), "Bearer valid")).getStatusCode().value());
        verifyNoInteractions(service);
    }
    @Test void rejectsMissingInvalidTokensAndUnavailableAuth() {
        assertEquals(401, assertThrows(ResponseStatusException.class,
                () -> authorization.authorize(null, request("17"))).getStatusCode().value());
        status = 403;
        assertEquals(401, assertThrows(ResponseStatusException.class,
                () -> authorization.authorize("Bearer invalid", request("17"))).getStatusCode().value());
        status = 500;
        assertEquals(503, assertThrows(ResponseStatusException.class,
                () -> authorization.authorize("Bearer valid", request("17"))).getStatusCode().value());
    }
    @Test void rejectsPendingKycMissingProfileAndUnsupportedRole() {
        for (String response : new String[]{
                "{\"role\":\"CUSTOMER\",\"customerId\":17,\"customerStatus\":\"KYC_PENDING\"}",
                "{\"role\":\"CUSTOMER\"}"}) {
            profile = response;
            assertEquals(403, assertThrows(ResponseStatusException.class,
                    () -> authorization.authorize("Bearer valid", request("17"))).getStatusCode().value());
        }
    }
    @Test void staffCanStillSelectCustomer() {
        for (String role : new String[]{"ADMIN", "BANK_OFFICER", "STAFF"}) {
            var client = mock(FdAuthKafkaClient.class);
            when(client.profile("Bearer valid")).thenReturn(
                    new FdCreationAuthorization.Profile(role, null, null));
            var privilegedAuthorization = new FdCreationAuthorization(client);
            privilegedAuthorization.authorize("Bearer valid", request("18"));
            verify(client).profile("Bearer valid");
        }
    }
    @Test void bothEndpointsPassAuthorizedRequestsToExistingService() {
        var service = mock(FixedDepositAccountService.class);
        var controller = new FixedDepositAccountController(service, authorization);
        var request = request("17");
        controller.createAccount(request, "Bearer valid");
        controller.createAccountWithTransaction(request, "Bearer valid");
        verify(service).createAccount(request);
        verify(service).createAccountWithTransaction(request);
    }
}
