<?php

add_action('wp_ajax_dispatch_submit_booking', 'dispatch_handle_booking_submission');
add_action('wp_ajax_nopriv_dispatch_submit_booking', 'dispatch_handle_booking_submission');

function dispatch_handle_booking_submission() {
    check_ajax_referer('dispatch_booking_nonce', 'nonce');

    $endpoint = get_option('dispatch_api_endpoint');
    $apiKey = get_option('dispatch_api_key');

    if (!$endpoint || !$apiKey) {
        wp_send_json_error('Plugin not configured. Please contact admin.');
    }

    // Prepare data for SaaS API
    $pickupDate = sanitize_text_field($_POST['date']);
    $pickupTime = sanitize_text_field($_POST['time']);
    // Combine date and time to ISO string (approximate)
    $isoDateTime = date('c', strtotime("$pickupDate $pickupTime"));

    $payload = array(
        'pickupAddress' => sanitize_text_field($_POST['pickup']),
        'dropoffAddress' => sanitize_text_field($_POST['dropoff']),
        'passengerName' => sanitize_text_field($_POST['name']),
        'passengerPhone' => sanitize_text_field($_POST['phone']),
        'pickupTime' => $isoDateTime,
        // 'fare' => null // let backend calc or TBD
        'source' => 'WORDPRESS' // Optional: track source
    );

    // Send to Next.js API
    $response = wp_remote_post($endpoint, array(
        'headers' => array(
            'Content-Type' => 'application/json',
            'x-api-key' => $apiKey
        ),
        'body' => json_encode($payload),
        'timeout' => 15
    ));

    if (is_wp_error($response)) {
        wp_send_json_error($response->get_error_message());
    }

    $code = wp_remote_retrieve_response_code($response);
    $body = wp_remote_retrieve_body($response);

    if ($code === 200 || $code === 201) {
        wp_send_json_success(json_decode($body));
    } else {
        wp_send_json_error('API Error: ' . $body);
    }
}
