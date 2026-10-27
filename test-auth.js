const { SignJWT } = require('jose');

async function test() {
  try {
    const JWT_SECRET = "Cicekanamurat47MC";
    const secret = new TextEncoder().encode(JWT_SECRET);
    
    // Create token for cicekana.dev
    const token = await new SignJWT({ userId: "6c2f7ba9-3922-4b66-b2a0-47000bc9c2fc", username: "cicekana.dev" })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("24h")
        .sign(secret);
        
    const cookieStr = `auth-token=${token}`;
    console.log('Generated mock cookie');

    const res2 = await fetch('http://localhost:3000/api/auth/me', {
      headers: { cookie: cookieStr }
    });
    console.log('Auth Me Status:', res2.status);
    const meData = await res2.json();
    console.log('Auth Me Data:', meData.user ? meData.user.username : meData);

    const res3 = await fetch(`http://localhost:3000/api/financial?branchId=926d95a0-dc1e-4fb7-8b2c-f0c3c86ba3c8`, {
        headers: { cookie: cookieStr }
    });
    console.log('Financial GET Status:', res3.status);
    
  } catch (error) {
    console.error('Test Failed:', error);
  }
}

test();
