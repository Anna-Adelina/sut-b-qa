package ua.course.store;

import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

class ProductApiTest extends AbstractApiTest {

    @Test
    void createProduct_validData_returns201WithLocationAndBody() {
        String sku = "API-P1-" + System.currentTimeMillis();
        String body = """
                {"sku":"%s","unitPrice":60000,"stock":10,"onSale":false}
                """.formatted(sku);
        // Успішний сценарій (успішне створення продукту)
        //1. Виконує HTTP requests до готового SUT
        given()
                .contentType("application/json")
                .body(body)
                .when()
                .post("/products")
                .then()
                .statusCode(201) // Success: статус 201 Created
                .header("Location", containsString("/products/"))
                .body("id", greaterThan(0))  // Перевіряємо поле в response body
                .body("sku", equalTo(sku))
                .body("unitPrice", equalTo(60000))
                .body("stock", equalTo(10))
                .body("onSale", equalTo(false));
    }

    @Test
    void getProduct_existingId_returns200WithMatchingData() {
        String sku = "API-GET-" + System.currentTimeMillis();
        String body = """
                {"sku":"%s","unitPrice":45000,"stock":5,"onSale":true}
                """.formatted(sku);
        //Спочатку створюється продукт, а потім робиться GET-запит на його отримання.
        int id = given()
                .contentType("application/json")
                .body(body)
                .when()
                .post("/products")
                .then()
                .statusCode(201)
                .extract().path("id");

        given()
                .when()
                .get("/products/{id}", id)
                .then()
                .statusCode(200)
                .body("id", equalTo(id)) //перевіряється, чи повернувся саме той id, sku і тд
                .body("sku", equalTo(sku))
                .body("unitPrice", equalTo(45000))
                .body("stock", equalTo(5))
                .body("onSale", equalTo(true));
    }

    @Test
    void getProduct_nonExistingId_returns404WithErrorContract() {
        // 404 Not Found: Запит до ресурсу, якого не існує (запит неіснуючого продукту з ID 999_999_999)
        given()
                .when()
                .get("/products/{id}", 999_999_999)
                .then()
                .statusCode(404) // Error: статус 404 Not Found
                .body("code", equalTo("NOT_FOUND")) // Перевіряємо поле помилки
                .body("message", notNullValue()); // та наявність тексту
    }
}