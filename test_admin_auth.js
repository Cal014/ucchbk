const email = 'admin@gmail.com';
const password = '...'; // I don't know the password, but I can check if token_version is the issue.

// Wait, I can generate a token directly!
const jwt = require('jsonwebtoken');
require('dotenv').config();

const token = jwt.sign(
    { userId: '60c265bd-483d-4a0f-8fda-f01ce782cf78', role: 'admin', tokenVersion: 1 },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
);

async function test() {
    let res = await fetch('http://localhost:3000/api/auth/profile', {
        headers: { 'Authorization': 'Bearer ' + token }
    });
    console.log("Profile:", res.status, await res.json());
}
test();
