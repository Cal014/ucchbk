const email = 'change_pwd_user@example.com';
const current_password = 'OldPassword1!';
const new_password = 'NewPassword2@';
const name = 'Change Password User';

async function test() {
    console.log("Registering...");
    let res = await fetch('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: current_password, name })
    });
    console.log("Register:", res.status);

    console.log("Logging in to get token...");
    res = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: current_password })
    });
    const { token } = await res.json();
    console.log("Token received:", !!token);

    console.log("Changing password...");
    res = await fetch('http://localhost:3000/api/auth/change-password', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({ current_password, new_password })
    });
    console.log("Change Password:", res.status, await res.json());

    console.log("Logging in with old password...");
    res = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: current_password })
    });
    console.log("Old login:", res.status, await res.json());

    console.log("Logging in with new password...");
    res = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: new_password })
    });
    console.log("New login:", res.status, await res.json());
}
test();
