package ua.course.store;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@Tag("unit")
@ExtendWith(MockitoExtension.class)
class OrderServiceTest {

    @Mock ProductRepository products;
    @Mock OrderRepository orders;
    @Mock OrderPolicy policy;

    private OrderService service() {
        return new OrderService(products, orders, policy);
    }

    @Test
    @DisplayName("Сума без знижки")
    void totalWithoutDiscount() {
        assertEquals(30000, service().calculateTotal(10000, 2));
    }

    @Test
    @DisplayName("Знижка 10% на межі 80000 з купоном")
    void discountAtBoundary() {
        assertEquals(72000, service().calculateTotal(40000, 2, false, true, false));
    }

    @Test
    @DisplayName("Нижче межі 80000 знижки немає")
    void noDiscountBelowBoundary() {
        assertEquals(79999, service().calculateTotal(79999, 1, false, true, false));
    }

    @Test
    @DisplayName("Кількість 0 відхиляється")
    void invalidQuantity() {
        assertThrows(IllegalArgumentException.class, () -> service().calculateTotal(10000, 0));
    }

    @Test
    @DisplayName("Успішне оформлення замовлення")
    void placeOrderSuccess() throws Exception {
        var product = new Product(1, "SKU-1", 10000, 5, false);
        when(products.findById(1)).thenReturn(product);
        when(policy.isAllowed(product, 2)).thenReturn(true);
        when(orders.create(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));

        var order = service().placeOrder(new OrderRequest("REF-1", 1, 2, false));

        assertEquals(20000, order.total());
        assertEquals(OrderStatus.CONFIRMED, order.status());
        verify(orders).create(any(Order.class));
    }

    @Test
    @DisplayName("Політика забороняє: замовлення не створюється")
    void placeOrderRejectedByPolicy() throws Exception {
        var product = new Product(1, "SKU-1", 10000, 5, false);
        when(products.findById(1)).thenReturn(product);
        when(policy.isAllowed(product, 1)).thenReturn(false);

        assertThrows(OrderRejectedException.class,
                () -> service().placeOrder(new OrderRequest("REF-2", 1, 1, false)));
        verify(orders, never()).create(any(Order.class));
    }

    @Test
    @DisplayName("Повторне повернення відхиляється")
    void repeatedReturn() throws Exception {
        var item = new OrderItem(1, 1, 1, 10000, false);
        var returned = new Order(5, "REF-3", false, false, 10000, OrderStatus.RETURNED, item);
        when(orders.findById(5)).thenReturn(returned);

        assertThrows(OrderRejectedException.class, () -> service().returnOrder(5));
        verify(orders, never()).updateStatus(anyLong(), any());
    }
}