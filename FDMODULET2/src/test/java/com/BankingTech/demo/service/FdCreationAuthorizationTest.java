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
    private HttpServer server;
    private FdCreationAuthorization authorization;
    private String profile;
    private int status;
    private String receivedToken;

    @BeforeEach void setup() throws Exception {
        status = 200;
        profile = "{\"username\":\"customer@example.com\",\"firstName\":\"Test\",\"role\":\"CUSTOMER\",\"customerId\":17,\"customerStatus\":\"ACTIVE\"}";
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/users/me", exchange -> {
            receivedToken = exchange.getRequestHeaders().getFirst("Authorization");
            byte[] body = profile.getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.sendResponseHeaders(status, body.length);
            exchange.getResponseBody().write(body);
            exchange.close();
        });
        server.start();
        authorization = new FdCreationAuthorization("http://127.0.0.1:" + server.getAddress().getPort());
    }
    @AfterEach void cleanup() { server.stop(0); }
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
                "{\"role\":\"CUSTOMER\"}", "{\"role\":\"STAFF\"}"}) {
            profile = response;
            assertEquals(403, assertThrows(ResponseStatusException.class,
                    () -> authorization.authorize("Bearer valid", request("17"))).getStatusCode().value());
        }
    }
    @Test void staffCanStillSelectCustomer() {
        for (String role : new String[]{"ADMIN", "BANK_OFFICER"}) {
            profile = "{\"role\":\"" + role + "\"}";
            authorization.authorize("Bearer valid", request("18"));
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
