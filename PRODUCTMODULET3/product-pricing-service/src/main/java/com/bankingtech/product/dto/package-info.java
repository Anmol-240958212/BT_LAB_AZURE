/**
 * Request / response DTOs of the REST API (with Bean Validation annotations).
 * Entities never leave the service layer - only DTOs cross the HTTP boundary,
 * so the JSON contract shared with the FD groups stays stable even when the
 * tables change.
 */
package com.bankingtech.product.dto;
