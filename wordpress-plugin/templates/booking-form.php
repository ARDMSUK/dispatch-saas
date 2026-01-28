<div class="dispatch-booking-container">
    <form id="dispatch-booking-form">
        <div class="form-group">
            <label>Pickup Address</label>
            <input type="text" name="pickup" required placeholder="Enter pickup location" />
        </div>
        
        <div class="form-group">
            <label>Destination</label>
            <input type="text" name="dropoff" required placeholder="Enter destination" />
        </div>

        <div class="row">
            <div class="form-group half">
                <label>Date</label>
                <input type="date" name="date" required />
            </div>
            <div class="form-group half">
                <label>Time</label>
                <input type="time" name="time" required />
            </div>
        </div>

        <div class="row">
            <div class="form-group half">
                <label>Name</label>
                <input type="text" name="name" required placeholder="Your Name" />
            </div>
            <div class="form-group half">
                <label>Phone Number</label>
                <input type="tel" name="phone" required placeholder="07700 900XXX" />
            </div>
        </div>

        <button type="submit" id="dispatch-submit-btn">Get Quote & Book</button>
        
        <div id="dispatch-message"></div>
    </form>
</div>
