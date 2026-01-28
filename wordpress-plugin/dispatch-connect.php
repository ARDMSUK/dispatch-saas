<?php
/**
 * Plugin Name: Dispatch Connect
 * Plugin URI: https://your-saas.com
 * Description: Connects your WordPress site to the Dispatch SaaS for seamless bookings.
 * Version: 1.0
 * Author: Dispatch SaaS
 */

if (!defined('ABSPATH')) {
    exit;
}

// Constants
define('DISPATCH_CONNECT_PATH', plugin_dir_path(__FILE__));
define('DISPATCH_CONNECT_URL', plugin_dir_url(__FILE__));

// Includes
require_once DISPATCH_CONNECT_PATH . 'includes/settings.php';
require_once DISPATCH_CONNECT_PATH . 'includes/shortcode.php';
require_once DISPATCH_CONNECT_PATH . 'includes/api-connector.php';

// Enqueue Scripts/Styles
function dispatch_connect_scripts() {
    wp_enqueue_style('dispatch-form', DISPATCH_CONNECT_URL . 'assets/form.css');
    wp_enqueue_script('dispatch-form', DISPATCH_CONNECT_URL . 'assets/form.js', array('jquery'), '1.0', true);
    
    // Pass PHP vars to JS
    wp_localize_script('dispatch-form', 'dispatchData', array(
        'ajax_url' => admin_url('admin-ajax.php'),
        'nonce' => wp_create_nonce('dispatch_booking_nonce')
    ));
}
add_action('wp_enqueue_scripts', 'dispatch_connect_scripts');
