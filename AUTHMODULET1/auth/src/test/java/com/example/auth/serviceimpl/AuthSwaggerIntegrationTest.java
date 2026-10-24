package com.example.auth.serviceimpl;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import java.net.URI;
import java.net.http.*;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "spring.datasource.url=jdbc:h2:mem:authdocs;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver", "spring.datasource.username=sa",
        "spring.datasource.password=", "spring.jpa.hibernate.ddl-auto=create-drop", "spring.jpa.show-sql=false" })
class AuthSwaggerIntegrationTest {
    @Value("${local.server.port}") int port;

    @Test void swaggerAndCrossOriginDocsWorkWithoutAuthentication() throws Exception {
        var client = HttpClient.newHttpClient();
        var docs = client.send(HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/v3/api-docs"))
                .header("Origin", "http://localhost:8081").GET().build(), HttpResponse.BodyHandlers.ofString());
        assertEquals(200, docs.statusCode());
        assertTrue(docs.body().contains("/customer/sync"));
        assertTrue(docs.body().contains("bearerAuth"));
        assertEquals("http://localhost:8081", docs.headers().firstValue("Access-Control-Allow-Origin").orElseThrow());
        var preflight = client.send(HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/customer/sync"))
                .header("Origin", "http://localhost:8081").header("Access-Control-Request-Method", "POST")
                .header("Access-Control-Request-Headers", "authorization,content-type")
                .method("OPTIONS", HttpRequest.BodyPublishers.noBody()).build(), HttpResponse.BodyHandlers.ofString());
        assertEquals(200, preflight.statusCode());
        assertEquals("http://localhost:8081", preflight.headers().firstValue("Access-Control-Allow-Origin").orElseThrow());
        var ui = client.send(HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/swagger-ui/index.html"))
                .GET().build(), HttpResponse.BodyHandlers.ofString());
        assertEquals(200, ui.statusCode());
    }
}
