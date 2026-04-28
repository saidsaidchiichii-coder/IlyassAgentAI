<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Create Account - Grok</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    
    <link rel="stylesheet" href="login-design.css">
    
    <style>
        body {
            background: linear-gradient(-45deg, #000000, #0a0a0a, #050505, #000000);
            background-size: 400% 400%;
            animation: gradientShift 15s ease infinite;
            font-family: 'Inter', sans-serif;
            height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #e7e9ea;
            margin: 0;
        }

        @keyframes gradientShift {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
        }

        .signup-container {
            width: 380px;
            padding: 40px 32px;
            background: #000000;
            border: 1px solid #2f3336;
            border-radius: 20px;
            box-shadow: 0 30px 80px rgba(0,0,0,0.85);
            text-align: center;
        }

        .grok-logo {
            width: 48px;
            height: 48px;
            margin: 0 auto 20px;
            fill: #1d9bf0;
        }

        h1 { font-size: 28px; font-weight: 700; margin-bottom: 8px; }
        .subtitle { color: #71767b; margin-bottom: 30px; font-size: 15px; }

        .input-field {
            width: 100%;
            padding: 14px 16px;
            margin: 10px 0;
            background: #16181c;
            border: 1px solid #2f3336;
            border-radius: 10px;
            color: white;
            font-size: 15px;
            outline: none;
        }

        .input-field:focus {
            border-color: #1d9bf0;
            box-shadow: 0 0 0 3px rgba(29, 155, 240, 0.25);
        }

        .signup-btn {
            width: 100%;
            padding: 14px;
            margin-top: 20px;
            background: #1d9bf0;
            color: #000;
            border: none;
            border-radius: 9999px;
            font-size: 15px;
            font-weight: 700;
            cursor: pointer;
        }
    </style>
</head>
<body>

    <div class="signup-container">
        <svg class="grok-logo" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="14.31" y1="8" x2="20.05" y2="17.94"></line>
            <line x1="9.69" y1="8" x2="21.17" y2="8"></line>
            <line x1="7.38" y1="12" x2="13.12" y2="2.06"></line>
            <line x1="9.69" y1="16" x2="3.95" y2="6.06"></line>
            <line x1="14.31" y1="16" x2="2.83" y2="16"></line>
            <line x1="16.62" y1="12" x2="10.88" y2="21.94"></line>
        </svg>

        <h1>Create Account</h1>
        <p class="subtitle">Join Grok</p>

        <input type="text" id="fullName" class="input-field" placeholder="Full name">
        <input type="email" id="authEmail" class="input-field" placeholder="Email address">
        <input type="password" id="authPassword" class="input-field" placeholder="Password">

        <button id="authSubmit" class="signup-btn">Create Account</button>

        <p class="switch-text" onclick="window.location.href='login.html'">
            Already have an account? <strong>Sign in</strong>
        </p>
    </div>

    <!-- Load firebase.js FIRST -->
    <script type="module" src="firebase.js"></script>

    <script>
        // انتظر حتى يتحمل firebase.js ثم نحدد الوضع
        window.addEventListener('load', () => {
            window.authMode = "signup";
            console.log("✅ Signup mode activated");
        });
    </script>

</body>
</html>
