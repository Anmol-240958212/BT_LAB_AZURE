package com.bankingtech.product;

import static org.junit.jupiter.api.Assertions.*;

import java.time.LocalDate;

import org.junit.jupiter.api.Test;

import com.bankingtech.product.dto.ProductUpdateRequestDto;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

class ProductUpdateRequestDtoTest {
    private final ObjectMapper mapper = new ObjectMapper().registerModule(new JavaTimeModule());

    @Test
    void omittedNullablePropertiesRemainUnspecified() throws Exception {
        ProductUpdateRequestDto request = mapper.readValue("{\"productName\":\"Revised\"}", ProductUpdateRequestDto.class);
        assertFalse(request.descriptionSupplied());
        assertFalse(request.effectiveToSupplied());
        assertNull(request.description());
        assertNull(request.effectiveTo());
    }

    @Test
    void explicitNullMarksNullablePropertiesForClearing() throws Exception {
        ProductUpdateRequestDto request = mapper.readValue(
                "{\"description\":null,\"effectiveTo\":null}", ProductUpdateRequestDto.class);
        assertTrue(request.descriptionSupplied());
        assertTrue(request.effectiveToSupplied());
        assertNull(request.description());
        assertNull(request.effectiveTo());
    }

    @Test
    void concreteValuesAreDeserialized() throws Exception {
        ProductUpdateRequestDto request = mapper.readValue(
                "{\"description\":\"Updated\",\"effectiveTo\":\"2028-12-31\"}", ProductUpdateRequestDto.class);
        assertTrue(request.descriptionSupplied());
        assertTrue(request.effectiveToSupplied());
        assertEquals("Updated", request.description());
        assertEquals(LocalDate.of(2028, 12, 31), request.effectiveTo());
    }
}
