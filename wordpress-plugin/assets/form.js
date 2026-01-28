jQuery(document).ready(function ($) {
    $('#dispatch-booking-form').on('submit', function (e) {
        e.preventDefault();

        var form = $(this);
        var btn = $('#dispatch-submit-btn');
        var msg = $('#dispatch-message');

        btn.prop('disabled', true).text('Processing...');
        msg.removeClass('success error').text('');

        var formData = {
            action: 'dispatch_submit_booking',
            nonce: dispatchData.nonce,
            pickup: form.find('input[name="pickup"]').val(),
            dropoff: form.find('input[name="dropoff"]').val(),
            date: form.find('input[name="date"]').val(),
            time: form.find('input[name="time"]').val(),
            name: form.find('input[name="name"]').val(),
            phone: form.find('input[name="phone"]').val()
        };

        $.post(dispatchData.ajax_url, formData, function (response) {
            btn.prop('disabled', false).text('Get Quote & Book');

            if (response.success) {
                msg.addClass('success').text('Booking successfully sent! We will contact you shortly.');
                form[0].reset();
            } else {
                msg.addClass('error').text('Error: ' + (response.data || 'Unknown error occurred.'));
            }
        });
    });
});
