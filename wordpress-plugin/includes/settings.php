<?php

function dispatch_register_settings() {
    register_setting('dispatch_options_group', 'dispatch_api_endpoint');
    register_setting('dispatch_options_group', 'dispatch_api_key');
}
add_action('admin_init', 'dispatch_register_settings');

function dispatch_register_options_page() {
    add_options_page('Dispatch Connect', 'Dispatch Connect', 'manage_options', 'dispatch-connect', 'dispatch_options_page_html');
}
add_action('admin_menu', 'dispatch_register_options_page');

function dispatch_options_page_html() {
    ?>
    <div class="wrap">
        <h1>Dispatch Connect Settings</h1>
        <form method="post" action="options.php">
            <?php settings_fields('dispatch_options_group'); ?>
            <table class="form-table">
                <tr valign="top">
                    <th scope="row">API Endpoint</th>
                    <td><input type="text" name="dispatch_api_endpoint" value="<?php echo esc_attr(get_option('dispatch_api_endpoint', 'http://localhost:3000/api/jobs')); ?>" class="regular-text" /></td>
                </tr>
                <tr valign="top">
                    <th scope="row">API Key</th>
                    <td><input type="text" name="dispatch_api_key" value="<?php echo esc_attr(get_option('dispatch_api_key')); ?>" class="regular-text" /></td>
                </tr>
            </table>
            <?php submit_button(); ?>
        </form>
    </div>
    <?php
}
