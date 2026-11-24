const menuToggle = document.querySelector('.navbar-burger');
const menu = document.getElementById('site-menu');

menuToggle.addEventListener('click', () => {
  const isOpen = menuToggle.classList.toggle('is-active');
  menu.classList.toggle('is-active', isOpen);
  menuToggle.setAttribute('aria-expanded', String(isOpen));
});
