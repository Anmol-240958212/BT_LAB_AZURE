package com.example.auth.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

import com.example.auth.dto.CustomerReportResponseEvent;
import com.example.auth.entity.*;
import com.example.auth.repository.*;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.kafka.core.KafkaTemplate;
import tools.jackson.databind.json.JsonMapper;

class CustomerReportKafkaServiceTest {
    @Test
    void publishesMaskedCustomerSnapshotForAValidRequest() throws Exception {
        var customers = mock(CustDtlRepository.class);
        var addresses = mock(CustAddrCmpntRepository.class);
        var contacts = mock(CustCntctDtlsRepository.class);
        var ids = mock(CustIdfnRepository.class);
        var users = mock(AuthUsrRepository.class);
        @SuppressWarnings("unchecked") KafkaTemplate<String, String> kafka = mock(KafkaTemplate.class);
        when(kafka.send(anyString(), anyString(), anyString())).thenReturn(CompletableFuture.completedFuture(null));
        var customer = new CustDtl(); customer.setCustomerIdentifier(10L); customer.setFullName("Report Customer");
        var status = new CustStsMstr(); status.setStatusCode("ACTIVE"); customer.setCustomerStatus(status);
        var contactType = new CntctTypMstr(); contactType.setContactType("MOBILE");
        var contact = new CustCntctDtls(); contact.setContactType(contactType); contact.setContactValue("+911234567890");
        var addressType = new AddrTypMstr(); addressType.setAddressType("CITY");
        var address = new CustAddrCmpnt(); address.setAddressType(addressType); address.setAddressTypeValue("Tokyo");
        var idType = new IdfnTypMstr(); idType.setIdentificationType("PAN");
        var id = new CustIdfn(); id.setIdentificationType(idType); id.setIdentificationItem("ABCDE1234F");
        var user = new AuthUsr(); user.setEmail("customer@example.com");
        when(customers.findById(10L)).thenReturn(Optional.of(customer));
        when(contacts.findByCustomer(customer)).thenReturn(List.of(contact));
        when(addresses.findByCustomer(customer)).thenReturn(List.of(address));
        when(ids.findByCustomer(customer)).thenReturn(List.of(id));
        when(users.findByCustomerCustomerIdentifier(10L)).thenReturn(Optional.of(user));

        new CustomerReportKafkaService(customers, addresses, contacts, ids, users, kafka).customerSnapshot(
                "{\"schemaVersion\":1,\"correlationId\":\"request-1\",\"customerId\":10,\"expiresAt\":" + (System.currentTimeMillis() + 10_000) + "}");

        var payload = ArgumentCaptor.forClass(String.class);
        verify(kafka).send(eq("auth-customer-report-replies-v1"), eq("request-1"), payload.capture());
        var response = new JsonMapper().readValue(payload.getValue(), CustomerReportResponseEvent.class);
        assertEquals("customer@example.com", response.customer().email());
        assertEquals("+911234567890", response.customer().contacts().get(0).value());
        assertEquals("Tokyo", response.customer().addresses().get(0).value());
        assertEquals("XXXXXX234F", response.customer().identifications().get(0).maskedValue());
    }
}
