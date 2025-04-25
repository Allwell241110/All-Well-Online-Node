  //Hamburger Menue
 function toggleMenu() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('overlay').classList.toggle('show');
}
function closeMenu() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('overlay').classList.remove('show');
} 


//Search Bar:
  document.getElementById('searchForm').addEventListener('submit', function(e) {
    e.preventDefault(); // prevent form from submitting normally
    const query = document.getElementById('searchInput').value.trim();

    if (query) {
      // redirect to search results page
      window.location.href = `/products?search=${encodeURIComponent(query)}`;
    }
  });