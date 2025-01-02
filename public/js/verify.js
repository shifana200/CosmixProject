let countdownTimer;
let isOtpResendAllowed = true; // Flag to track if resend is allowed

// Function to handle OTP form submission
document.getElementById('otpForm').addEventListener('submit', function(e) {
    e.preventDefault();

    // Collect OTP from the input fields
    const otp = Array.from(document.querySelectorAll('.otp-input input')).map(input => input.value).join('');

    // Ensure OTP length is 6 characters
    if (otp.length !== 6) {
        alert('Please enter a valid 6-digit OTP');
        return;
    }

    // Assuming the user’s email is stored in the session or passed dynamically
    const email = 'user-email-here'; // Replace with dynamic user email

    fetch('/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp, email }) // Include OTP and email
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            window.location.href = '/login'; // Redirect to login page after successful OTP verification
        } else {
            alert(data.message);
        }
    })
    .catch(error => console.error('Error:', error));
});

// Function to handle OTP Resend with 30-second cooldown
function resendOtp() {
    if (isOtpResendAllowed) {
        const email = 'user-email-here'; // Replace with dynamic user email

        fetch('/send-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('OTP resent successfully!');
                startCountdownTimer(); // Start the 30-second countdown for resend
            } else {
                alert('Error while resending OTP!');
            }
        })
        .catch(error => console.error('Error:', error));

        // Disable resend OTP button and start countdown
        isOtpResendAllowed = false;
        startCountdownTimer();
    } else {
        alert('Please wait before requesting a new OTP');
    }
}

// Start countdown for resend OTP
function startCountdownTimer() {
    let timeLeft = 30; // 30 seconds cooldown

    countdownTimer = setInterval(() => {
        if (timeLeft > 0) {
            timeLeft--;
            document.querySelector('.timer span').textContent = `${timeLeft}s`;
        } else {
            clearInterval(countdownTimer);
            document.querySelector('.timer span').textContent = '';
            isOtpResendAllowed = true;
        }
    }, 1000);

    // Disable the resend button during the countdown
    document.querySelector('.resend-otp').disabled = true;
}

// Add the event listener to resend OTP link
document.querySelector('.resend-otp').addEventListener('click', function(e) {
    e.preventDefault();
    resendOtp(); // Trigger resend OTP functionality
});
