package ua.course.store;

import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

class OrderApiTest extends AbstractApiTest {

    private int createProduct(long unitPrice, int stock) {
        String sku = "API-ORD-" + System.nanoTime();
        String body = """
                {"sku":"%s","unitPrice":%d,"stock":%d,"onSale":false}
                """.formatted(sku, unitPrice, stock);

        return given()
                .contentType("application/json")
                .body(body)
                .when()
                .post("/products")
                .then()
                .statusCode(201)
                .extract().path("id");
    }

    @Test
    void placeOrder_validData_returns201_thenGetReturnsSameOrder() {
        // Крок 1: POST /products — отримуємо productId динамічно
        int productId = createProduct(10_000, 10);

        // Крок 2: POST /orders — використовуємо productId із кроку 1
        String reference = "API-O-" + System.nanoTime();
        String orderBody = """
                {"reference":"%s","productId":%d,"quantity":2,"premium":false,"couponValid":false}
                """.formatted(reference, productId); // ← йде в тіло запиту

        int orderId = given()
                .contentType("application/json")
                .body(orderBody)
                .when()
                .post("/orders")
                .then()
                .statusCode(201)
                .header("Location", containsString("/orders/"))
                .body("id", greaterThan(0))
                .body("reference", equalTo(reference))
                .body("total", equalTo(20_000))
                .body("status", equalTo("CONFIRMED"))
                .body("item.productId", equalTo(productId))
                .body("item.quantity", equalTo(2))
                .extract().path("id"); // Крок 3: .extract().path("id") витягує з відповіді сервера згенерований id.

        given()
                .when()
                .get("/orders/{id}", orderId) // Крок 4: GET /orders/{id} — перевіряємо, що дані реально збереглись
                .then()
                .statusCode(200)
                .body("id", equalTo(orderId))
                .body("reference", equalTo(reference))
                .body("total", equalTo(20_000))
                .body("status", equalTo("CONFIRMED"));
    }

    private int createOrder(int productId, int quantity) {
        String reference = "API-O-" + System.nanoTime();
        String body = """
                {"reference":"%s","productId":%d,"quantity":%d,"premium":false,"couponValid":false}
                """.formatted(reference, productId, quantity);

        return given()
                .contentType("application/json")
                .body(body)
                .when()
                .post("/orders")
                .then()
                .statusCode(201)
                .extract().path("id");
    }

    @Test
    void returnOrder_confirmedOrder_returns200AndChangesStatus() {
        int productId = createProduct(10_000, 10);
        int orderId = createOrder(productId, 2);

        given()
                .when()
                .post("/orders/{id}/return", orderId) // ←  сам action-виклик
                .then()
                .statusCode(200)
                .body("id", equalTo(orderId))
                .body("status", equalTo("RETURNED"));

        // persistedState: перевіряємо реальний стан через окремий GET
        given()
                .when()
                .get("/orders/{id}", orderId)
                .then()
                .statusCode(200)
                .body("status", equalTo("RETURNED"));
    }

    @Test
    // 409 Conflict: намагаємося повернути замовлення, яке вже було повернене раніше
    void returnOrder_alreadyReturned_returns409AndStateUnchanged() {
        int productId = createProduct(10_000, 10);
        int orderId = createOrder(productId, 2);

        // Перше повернення — успішне
        given()
                .when()
                .post("/orders/{id}/return", orderId)
                .then()
                .statusCode(200);

        // Друге повернення — заборонена дія
        given()
                .when()
                .post("/orders/{id}/return", orderId)
                .then()
                .statusCode(409)
                .body("code", notNullValue())
                .body("message", notNullValue());

        // Незмінність: статус і далі RETURNED
        given()
                .when()
                .get("/orders/{id}", orderId)
                .then()
                .statusCode(200)
                .body("status", equalTo("RETURNED"));
    }

    //бізнес-правило: «Знижка 10% застосовується, якщо сума замовлення більша або дорівнює 80 000 і купон дійсний».
    @ParameterizedTest(name = "unitPrice={0}, qty={1}, couponValid={2} -> total={3}")
    @CsvSource({
            // unitPrice, quantity, couponValid, expectedTotal
            "40000, 2, true,  72000",   // 80000, рівно поріг, купон чинний -> знижка 10%
            "40000, 2, false, 80000",   // 80000, поріг є, та купон НЕчинний -> знижка 0%
            "10000, 2, true,  20000",   // 20000, нижче порогу, купон чинний -> знижка 0% (сума замала)
            "50000, 2, true,  90000"    // 100000, вище порогу, купон чинний -> знижка 10%
    })
    void placeOrder_personalDiscountRule_appliesCorrectTotal(
            long unitPrice, int quantity, boolean couponValid, long expectedTotal) {
        int productId = createProduct(unitPrice, 10);

        String reference = "API-O-RULE-" + System.nanoTime();
        String body = """
                {"reference":"%s","productId":%d,"quantity":%d,"premium":false,"couponValid":%s}
                """.formatted(reference, productId, quantity, couponValid);
        //1. Виконує HTTP requests до готового SUT
        given()
                .contentType("application/json")
                .body(body)
                .when()
                .post("/orders")
                .then()
                .statusCode(201)
                .body("total", equalTo((int) expectedTotal));
    }
}