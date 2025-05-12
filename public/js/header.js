// Get elements
const hamburgerMenu = document.querySelector('.hamburger');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');

// Toggle Sidebar and Overlay visibility
function toggleMenu() {
  sidebar.classList.toggle('active');
  overlay.classList.toggle('active');
}

// Close Sidebar when Overlay is clicked
function closeMenu() {
  sidebar.classList.remove('active');
  overlay.classList.remove('active');
}

  const searchForm = document.getElementById('searchForm');
  const searchInput = document.getElementById('searchInput');

  searchForm.addEventListener('submit', function (e) {
    e.preventDefault(); // Prevent page reload

    const query = searchInput.value.trim();
    if (!query) return;

    // Redirect to /products?search=query
    window.location.href = `/products?search=${encodeURIComponent(query)}`;
  });
