# Dispatch Connect - WordPress Plugin

## Installation

1.  Copy the `wordpress-plugin` folder to your WordPress site's `wp-content/plugins/` directory and rename it to `dispatch-connect`.
    *   Final path should be `wp-content/plugins/dispatch-connect/dispatch-connect.php`.
2.  Log in to your WordPress Admin Dashboard.
3.  Go to **Plugins** and activate **Dispatch Connect**.

## Configuration

1.  Go to **Settings > Dispatch Connect**.
2.  **API Endpoint**: Enter your SaaS URL (e.g., `https://your-app.com/api/jobs`).
    *   *For local testing*, use `http://localhost:3000/api/jobs`.
3.  **API Key**: Enter the API Key provided by the SaaS Admin.
    *   *Default Dev Key*: `sk_live_123456789`

## Usage

Add the booking form to any page or post using the shortcode:

```
[dispatch_booking_form]
```

## Styling
The form inherits some styles from your theme but uses `assets/form.css` for structural layout. You can override these styles in your theme's CSS or the Customizer.
