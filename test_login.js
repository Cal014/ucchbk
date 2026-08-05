const email = 'testuser123@example.com';
const password = 'Password1!';
const name = 'Test User';

async function test() {
    console.log("Registering...");
    let res = await fetch('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name })
    });
    console.log("Register status:", res.status);
    console.log(await res.json());

    console.log("Logging in...");
    res = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    console.log("Login status:", res.status);
    console.log(await res.json());
}
test();
