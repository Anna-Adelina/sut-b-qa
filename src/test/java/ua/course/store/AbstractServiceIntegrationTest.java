package ua.course.store;

import org.junit.jupiter.api.BeforeEach;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.wiremock.integrations.testcontainers.WireMockContainer;

import java.net.URI;
import java.time.Duration;

import static com.github.tomakehurst.wiremock.client.WireMock.configureFor;
import static com.github.tomakehurst.wiremock.client.WireMock.reset;

@Testcontainers
public abstract class AbstractServiceIntegrationTest extends AbstractIntegrationTest {

    @Container
    static final WireMockContainer WIREMOCK =
            new WireMockContainer("wiremock/wiremock:3.9.1");

    protected ProductRepository productRepository;
    protected OrderRepository orderRepository;
    protected OrderService orderService;

    @BeforeEach
    void setUpService() {
        //Підключається до сервера, який працює всередині Docker-контейнера на такому хості та випадковому порті
        configureFor(WIREMOCK.getHost(), WIREMOCK.getPort());
        //Пункт 10. reset очищає всі старі правила (stubs) та історію запитів від попереднього тесту
        reset();

        productRepository = new ProductRepository(connection);
        orderRepository = new OrderRepository(connection);

        // Пункт6: Створи об'єкт, підключи його до бд і дай йому посилання на сервер WireMock,
        // щоб він міг надсилати туди HTTP-запити
        HttpOrderPolicy policy = new HttpOrderPolicy(
                URI.create(WIREMOCK.getBaseUrl()), Duration.ofSeconds(5));

        orderService = new OrderService(productRepository, orderRepository, policy);
    }
}