<?php

function dispatch_booking_shortcode() {
    ob_start();
    include DISPATCH_CONNECT_PATH . 'templates/booking-form.php';
    return ob_get_clean();
}
add_shortcode('dispatch_booking_form', 'dispatch_booking_shortcode');
