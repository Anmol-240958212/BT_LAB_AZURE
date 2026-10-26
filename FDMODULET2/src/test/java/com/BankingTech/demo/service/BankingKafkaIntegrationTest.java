package com.BankingTech.demo.service;

import com.BankingTech.demo.dto.FdMaturityEventDto;
import com.BankingTech.demo.entity.FixedDepositAccountEntity;
import com.BankingTech.demo.repository.*;
import com.BankingTech.demo.service.plugins.accountnumber.AccountNumberGenerator;
import com.BankingTech.demo.service.serviceimpl.EmailNotificationServiceImpl;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.kafka.core.*;
import org.springframework.kafka.test.context.EmbeddedKafka;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.apache.kafka.clients.producer.ProducerConfig;
import org.apache.kafka.common.serialization.StringSerializer;
import java.net.URI;
import java.net.http.*;
import java.time.*;
import java.math.BigDecimal;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "spring.datasource.url=jdbc:h2:mem:banking;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver", "spring.datasource.username=sa", "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=create-drop", "spring.jpa.show-sql=false",
        "spring.kafka.consumer.bootstrap-servers=${spring.embedded.kafka.brokers}",
        "banking.scheduling.enabled=false", "banking.notifications.publish-delay-ms=3600000",
        "banking.mail.from=bank@example.com", "management.health.mail.enabled=false",
        "logging.level.org.apache.kafka=WARN", "logging.level.kafka=WARN" })
@EmbeddedKafka(partitions = 1, topics = {"customer-kyc-events", "fd-maturity-events"},
        bootstrapServersProperty = "spring.kafka.bootstrap-servers")
class BankingKafkaIntegrationTest {
    @Value("${local.server.port}") int port;
    @Value("${spring.kafka.bootstrap-servers}") String broker;
    @Autowired FdCustomerRegistryRepository customers;
    @Autowired FixedDepositAccountRepository accounts;
    @Autowired FDTransactionRepository transactions;
    @Autowired NotificationLogRepository logs;
    @Autowired MaturityProcessingService maturity;
    @Autowired MaturityEventPublisher publisher;
    @MockitoBean JavaMailSender mail;
    @MockitoBean AccountNumberGenerator numbers;
    @MockitoBean FdProductPricingService pricing;
    // Authentication is covered by FdCreationAuthorizationTest; this test exercises the Kafka/maturity path.
    @MockitoBean FdCreationAuthorization creationAuthorization;
    @MockitoSpyBean EmailNotificationServiceImpl notifications;

    @Test void kafkaCustomerValidationMaturityEmailAndSwagger() throws Exception {
        var factory = new DefaultKafkaProducerFactory<String, String>(Map.of(
                ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, broker,
                ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class,
                ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, StringSerializer.class));
        var kafka = new KafkaTemplate<>(factory);
        try {
            doAnswer(invocation -> {
                var request = invocation.getArgument(0, com.BankingTech.demo.dto.requestdto.FixedDepositAccountRequestDTO.class);
                request.setCurrency("INR");
                request.setInterestRate(new BigDecimal("7"));
                request.setInterestType("SIMPLE");
                request.setInterestFrequency("MONTHLY");
                return null;
            }).when(pricing).applyAuthoritativePricing(any());
            kafka.send("customer-kyc-events", "10", """
                    {"eventId":"approved-10","customerId":10,"customerIdentifier":"10","fullName":"Fresh Test",
                     "email":"customer@example.com","customerStatus":"ACTIVE","kycStatus":"ACTIVE"}
                    """).get(10, TimeUnit.SECONDS);
            await(() -> customers.findById("10").isPresent());
            assertEquals("customer@example.com", customers.findById("10").orElseThrow().getEmail());
            var client = HttpClient.newHttpClient();
            String body = """
                    {"customerId":"10","productCode":"FD_STANDARD","branchCode":"001","principalAmount":10000,
                     "interestRate":7,"termMonths":12,"interestType":"SIMPLE","interestPayoutType":"CAPITALIZE","interestFrequency":"MONTHLY"}
                    """;
            when(numbers.generate("001")).thenReturn("0019999990");
            doNothing().when(creationAuthorization).authorize(any(), any());
            assertEquals(404, post(client, "/api/fd/account/create-with-txn", body.replace("\"10\"", "\"999\"")).statusCode());
            assertEquals(0, accounts.count());
            assertEquals(200, post(client, "/api/fd/account/create-with-txn", body).statusCode());
            var fd = accounts.findById("0019999990").orElseThrow();
            fd.setFdAccountMaturityDate(LocalDate.now());
            fd.setFdAccountAccruedInterest(new BigDecimal("700"));
            accounts.save(fd);
            maturity.processMaturedAccounts(LocalDate.now());
            assertEquals("CLOSED", accounts.findById(fd.getFdAccountNo()).orElseThrow().getFdAccountStatus());
            assertEquals("QUEUED", logs.findById("MAT-0019999990").orElseThrow().getNotificationLogStatus());
            publisher.publishPending();
            await(() -> "SENT".equals(logs.findById("MAT-0019999990").orElseThrow().getNotificationLogStatus()));
            verify(mail).send(argThat((SimpleMailMessage m) -> m.getTo()[0].equals("customer@example.com")
                    && m.getText().contains("10700")));
            maturity.processMaturedAccounts(LocalDate.now());
            notifications.deliverMaturityNotification(new FdMaturityEventDto("MAT-0019999990", "10", fd.getFdAccountNo(),
                    new BigDecimal("10700"), LocalDate.now()));
            verify(mail, times(1)).send(any(SimpleMailMessage.class));
            assertEquals(2, transactions.count()); // initial deposit plus one maturity payout
            var docs = get(client, "/v3/api-docs");
            assertEquals(200, docs.statusCode());
            assertTrue(docs.body().contains("/api/fd/notifications/account/{fdAccountNo}"));
            assertEquals(200, get(client, "/swagger-ui/index.html").statusCode());
            var swaggerConfig = get(client, "/v3/api-docs/swagger-config");
            assertEquals(200, swaggerConfig.statusCode());
            assertTrue(swaggerConfig.body().contains("http://localhost:8080/v3/api-docs"));
        } finally { factory.destroy(); }
    }

    @Test void failedNotificationQueueDoesNotRollbackPayoutAndClosure() {
        var fd = new FixedDepositAccountEntity();
        fd.setFdAccountNo("0018888880");
        fd.setFdAccountCustomerId("10");
        fd.setFdAccountProductCode("FD_STANDARD");
        fd.setFdAccountPrincipal(new BigDecimal("10000"));
        fd.setFdAccountRate(new BigDecimal("7"));
        fd.setFdAccountTerm(12);
        fd.setFdAccountOpenedAt(LocalDateTime.now().minusYears(1));
        fd.setFdAccountMaturityDate(LocalDate.now());
        fd.setFdAccountStatus("ACTIVE");
        fd.setFdAccountInterestType("SIMPLE");
        fd.setFdAccountInterestPayoutType("CAPITALIZE");
        fd.setFdAccountInterestFrequency("MONTHLY");
        fd.setFdAccountAccruedInterest(BigDecimal.ZERO);
        accounts.save(fd);
        long before = transactions.count();
        doThrow(new IllegalStateException("simulated queue write failure")).when(notifications)
                .queueMaturityNotification(eq("10"), eq(fd.getFdAccountNo()), any(), any());
        maturity.processMaturedAccounts(LocalDate.now());
        assertEquals("CLOSED", accounts.findById(fd.getFdAccountNo()).orElseThrow().getFdAccountStatus());
        assertEquals(before + 1, transactions.count());
        assertFalse(logs.existsById("MAT-" + fd.getFdAccountNo()));
        accounts.deleteById(fd.getFdAccountNo());
    }

    private HttpResponse<String> post(HttpClient client, String path, String body) throws Exception {
        return client.send(HttpRequest.newBuilder(URI.create("http://localhost:" + port + path))
                .header("Content-Type", "application/json").POST(HttpRequest.BodyPublishers.ofString(body)).build(),
                HttpResponse.BodyHandlers.ofString());
    }
    private HttpResponse<String> get(HttpClient client, String path) throws Exception {
        return client.send(HttpRequest.newBuilder(URI.create("http://localhost:" + port + path)).GET().build(),
                HttpResponse.BodyHandlers.ofString());
    }
    private void await(java.util.function.BooleanSupplier condition) throws Exception {
        long deadline = System.nanoTime() + Duration.ofSeconds(30).toNanos();
        while (!condition.getAsBoolean() && System.nanoTime() < deadline) { Thread.sleep(100); }
        assertTrue(condition.getAsBoolean(), "Kafka processing did not complete within 30 seconds");
    }
}
