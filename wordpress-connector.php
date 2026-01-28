<?php
/**
 * Dispatch SaaS Connector for WordPress
 * 
 * Add this code to your theme's functions.php or a custom plugin.
 */

// Replace with your SaaS URL
define('DISPATCH_API_URL', 'https://api.your-dispatch-saas.com/api/external/booking');
// Replace with the Client's API Key
define('DISPATCH_API_KEY', 'your-client-api-key');

/**
 * Send Booking to Dispatch System
 * Call this function when your existing booking form is submitted.
 */
function send_booking_to_dispatch($booking_data) {
    $body = json_encode([
        'passengerName' => $booking_data['name'],
        'passengerPhone' => $booking_data['phone'],
        'passengerEmail' => $booking_data['email'],
        'pickupAddress' => $booking_data['pickup'],
        'dropoffAddress' => $booking_data['dropoff'],
        'pickupTime' => $booking_data['date'] . 'T' . $booking_data['time'] . ':00Z', // Format as needed
        'passengers' => (int)$booking_data['passengers'],
        'notes' => $booking_data['notes'],
        'tenantId' => 'bourne-end-taxis' // Or dynamic based on settings
    ]);

    $response = wp_remote_post(DISPATCH_API_URL, [
        'headers' => [
            'Content-Type' => 'application/json',
            'x-api-key' => DISPATCH_API_KEY,
        ],
        'body' => $body,
        'timeout' => 15,
    ]);

    if (is_wp_error($response)) {
        error_log('Dispatch API Error: ' . $response->get_error_message());
        return false;
    }

    $response_code = wp_remote_retrieve_response_code($response);
    if ($response_code !== 200) {
        error_log('Dispatch API Failed with code: ' . $response_code);
        return false;
    }

    return true;
}

// Example Hook: Integration with Contact Form 7
// add_action('wpcf7_before_send_mail', 'dispatch_cf7_integration');
function dispatch_cf7_integration($contact_form) {
    $submission = WPCF7_Submission::get_instance();
    if ($submission) {
        $data = $submission->get_posted_data();
        
        // Map CF7 fields to Dispatch fields
        $booking = [
            'name' => $data['your-name'],
            'phone' => $data['your-phone'],
            'email' => $data['your-email'],
            'pickup' => $data['pickup-address'],
            'dropoff' => $data['dropoff-address'],
            'passengers' => $data['passengers'],
            // ... etc
        ];

        send_booking_to_dispatch($booking);
    }
}
