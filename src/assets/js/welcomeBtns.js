// Funcionalidad de los botones en la pantalla de bienvenida 

let btnWelcomeLogin = document.getElementById('btn-welcome-login');
let btnRegister = document.getElementById('btn-register');

btnWelcomeLogin.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('page-login').classList.add('active');
    document.getElementById('page-welcome').classList.remove('active');
});

btnRegister.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('page-login').classList.add('active');
    document.getElementById('page-welcome').classList.remove('active');
    const registerUser = document.getElementById('toggle-auth-mode');
    const click = new Event('click');
    registerUser.dispatchEvent(click);
});

document.getElementById('back-welcome')?.addEventListener('click', (e) => {
    document.getElementById('page-welcome').classList.add('active');
    document.getElementById('page-login').classList.remove('active');
});