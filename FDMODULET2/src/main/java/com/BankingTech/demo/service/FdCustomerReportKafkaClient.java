package com.BankingTech.demo.service;

import com.BankingTech.demo.dto.CustomerReportRequestEvent;
import com.BankingTech.demo.dto.CustomerReportResponseEvent;
import java.util.UUID;
import java.util.concurrent.*;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpStatus;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.json.JsonMapper;

@Service
public class FdCustomerReportKafkaClient {
    private final KafkaTemplate<String, String> kafka;
    private final JsonMapper json = new JsonMapper();
    private final ConcurrentMap<String, CompletableFuture<CustomerReportResponseEvent>> pending = new ConcurrentHashMap<>();

    public FdCustomerReportKafkaClient(@Qualifier("fdProductKafkaTemplate") KafkaTemplate<String, String> kafka) { this.kafka = kafka; }

    @KafkaListener(topics = "auth-customer-report-replies-v1", containerFactory = "fdCustomerReportRepliesFactory")
    public void receive(String message) throws Exception {
        CustomerReportResponseEvent reply = json.readValue(message, CustomerReportResponseEvent.class);
        if (reply.schemaVersion() != 1) return;
        CompletableFuture<CustomerReportResponseEvent> future = pending.get(reply.correlationId());
        if (future != null) future.complete(reply);
    }

    public CustomerReportResponseEvent.Customer customer(Long customerId) {
        String id = UUID.randomUUID().toString();
        CompletableFuture<CustomerReportResponseEvent> future = new CompletableFuture<>();
        pending.put(id, future);
        try {
            kafka.send("auth-customer-report-requests-v1", id,
                    json.writeValueAsString(new CustomerReportRequestEvent(1, id, customerId, System.currentTimeMillis() + 15000)))
                    .whenComplete((sent, error) -> { if (error != null) future.completeExceptionally(error); });
            CustomerReportResponseEvent reply = future.get(12, TimeUnit.SECONDS);
            if (!reply.valid() || reply.customer() == null) {
                throw new ResponseStatusException(reply.status() == 404 ? HttpStatus.NOT_FOUND : HttpStatus.CONFLICT,
                        "Customer report data is unavailable");
            }
            if (!customerId.equals(reply.customer().customerId())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Customer report data does not match the FD account");
            }
            return reply.customer();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Customer report request interrupted");
        } catch (ResponseStatusException e) { throw e;
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Customer reporting data is unavailable. Check Auth and Kafka.");
        } finally { pending.remove(id); }
    }
}
