document.addEventListener("DOMContentLoaded", () => {
  const productCards = document.querySelectorAll(".product-card");

  productCards.forEach(card => {
    card.addEventListener("click", () => {
      const productName = card.getAttribute("data-id");
      if (productName) {
        window.location.href = `/products/${productName}`;
      }
    });
  });
});