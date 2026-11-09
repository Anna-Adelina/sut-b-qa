package ua.course.store;

import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;

@Testcontainers
public abstract class AbstractIntegrationTest {

    @Container
    static final PostgreSQLContainer<?> POSTGRES =
            new PostgreSQLContainer<>("postgres:17-alpine");

    protected static Connection connection;

    @BeforeAll
    static void setUpDatabaseOnce() throws Exception {
        //Підключення до бази, генерує: випадковий порт, користувача й пароль за замовчуванням.
        connection = DriverManager.getConnection(
                POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
        connection.setAutoCommit(true);
        //Міграції. Створення таблиць один раз
        runSqlFile("migrations/V1__create_tables.sql");
        runSqlFile("migrations/V2__add_indexes.sql");
    }

    @BeforeEach
    void cleanTables() throws Exception {
        try (Statement statement = connection.createStatement()) {
            //Пункт 10. Очищення даних між тестами
            statement.execute("TRUNCATE TABLE order_items, orders, products RESTART IDENTITY CASCADE");
        }
    }

    @AfterAll
    static void tearDownDatabase() throws Exception {
        if (connection != null) {
            connection.close();
        }
    }

    private static void runSqlFile(String path) throws Exception {
        String sql = Files.readString(Path.of(path));
        try (Statement statement = connection.createStatement()) {
            statement.execute(sql);
        }
    }
}