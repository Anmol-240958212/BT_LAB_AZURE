package com.bankingtech.product.exception;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.ServletWebRequest;
import org.springframework.web.context.request.WebRequest;

import com.bankingtech.product.dto.ApiErrorDto;

@RestControllerAdvice
public class ApiExceptionHandler {
    @ExceptionHandler(ApiException.class)
    ResponseEntity<ApiErrorDto> handleApi(ApiException ex, WebRequest request) {
        return response(ex.getStatus(), ex.getMessage(), request, Map.of());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ApiErrorDto> handleValidation(MethodArgumentNotValidException ex, WebRequest request) {
        Map<String, String> errors = new LinkedHashMap<>();
        for (FieldError fieldError : ex.getBindingResult().getFieldErrors()) {
            errors.putIfAbsent(fieldError.getField(), fieldError.getDefaultMessage());
        }
        return response(HttpStatus.BAD_REQUEST, "Request validation failed", request, errors);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    ResponseEntity<ApiErrorDto> handleUnreadable(HttpMessageNotReadableException ex, WebRequest request) {
        return response(HttpStatus.BAD_REQUEST, "Request body is malformed or contains an unsupported value",
                request, Map.of());
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    ResponseEntity<ApiErrorDto> handleTypeMismatch(MethodArgumentTypeMismatchException ex, WebRequest request) {
        return response(HttpStatus.BAD_REQUEST, "Invalid value for parameter " + ex.getName(), request, Map.of());
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<ApiErrorDto> handleConflict(DataIntegrityViolationException ex, WebRequest request) {
        return response(HttpStatus.CONFLICT, "The request conflicts with an existing product or pricing record",
                request, Map.of());
    }

    @ExceptionHandler(AccessDeniedException.class)
    ResponseEntity<ApiErrorDto> handleAccessDenied(AccessDeniedException ex, WebRequest request) {
        return response(HttpStatus.FORBIDDEN, "The authenticated user does not have an allowed role",
                request, Map.of());
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ApiErrorDto> handleUnexpected(Exception ex, WebRequest request) {
        return response(HttpStatus.INTERNAL_SERVER_ERROR, "An unexpected error occurred", request, Map.of());
    }

    private ResponseEntity<ApiErrorDto> response(HttpStatus status, String message,
                                                 WebRequest request, Map<String, String> fields) {
        String path = request instanceof ServletWebRequest servletRequest
                ? servletRequest.getRequest().getRequestURI() : "";
        return ResponseEntity.status(status).body(new ApiErrorDto(
                Instant.now(), status.value(), status.getReasonPhrase(), message, path, fields));
    }
}
