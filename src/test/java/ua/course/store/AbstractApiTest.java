package ua.course.store;

import io.restassured.RestAssured;
import org.junit.jupiter.api.BeforeAll;

public abstract class AbstractApiTest {

    @BeforeAll
    static void setUpRestAssured() {
        RestAssured.baseURI = "http://127.0.0.1:8080";
    }
}