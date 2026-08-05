const email = 'callistusdjidah06@gmail.com';
fetch('http://localhost:3000/api/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
}).then(res => res.json()).then(data => console.log(data)).catch(console.error);
