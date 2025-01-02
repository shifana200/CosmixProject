document.getElementById('registerForm').addEventListener('submit', function(event) {
    let isValid = true;
  
    // Clear previous error messages
    document.getElementById('passwordError').textContent = '';
    document.getElementById('confirmPasswordError').textContent = '';
  
    // Get form values
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
  
    // Password validation: Check length (minimum 6 characters)
    if (password.length < 6) {
      document.getElementById('passwordError').textContent = 'Password must be at least 6 characters long.';
      isValid = false;
    }
  
    // Confirm Password validation: Check if passwords match
    if (password !== confirmPassword) {
      document.getElementById('confirmPasswordError').textContent = 'Passwords do not match.';
      isValid = false;
    }
  
    // If form is invalid, prevent submission and show errors
    if (!isValid) {
      event.preventDefault();
      return; // Prevent further execution if validation fails
    }
  
    // OTP generation logic
    const otp = generateOTP();
  
    // Simulate sending OTP (you would typically send it via email or SMS)
    console.log('Generated OTP:', otp);  // For testing, you can check the console
  
    // Redirect to OTP verification page
    window.location.href = `verify.html?otp=${otp}`;
  });
  
  // Function to generate a random 6-digit OTP
  function generateOTP() {
    let otp = '';
    for (let i = 0; i < 6; i++) {
      otp += Math.floor(Math.random() * 10); // Generate a random number between 0 and 9
    }
    return otp;
  }
  