document.addEventListener('DOMContentLoaded', () => {
  const cartButtons = document.querySelectorAll('.add-to-cart-btn');

  const showAlert = (message, type) => {
    const alertDiv = document.createElement('div');
    alertDiv.classList.add('alert', type === 'success' ? 'alert-success' : 'alert-danger');
    alertDiv.textContent = message;
    document.body.appendChild(alertDiv);
    setTimeout(() => {
      alertDiv.style.display = 'none';
    }, 5000);
  };

  // Show the variant select and second Add to Cart button after first click
  cartButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      const productId = button.getAttribute('data-product-id');
      const variantSelectContainer = document.querySelector(`#variant-select-container-${productId}`);
      
      // Check if variant selection is already shown
      if (variantSelectContainer.style.display === 'none' || variantSelectContainer.style.display === '') {
        // Show the variant select dropdown
        variantSelectContainer.style.display = 'block';
        // Hide the initial "Add to Cart" button (optional)
        button.style.display = 'none';
      } else {
        // If variant select is already shown, add the product to the cart
        const variantSelect = document.querySelector(`#variant-select-${productId}`);
        const variantId = variantSelect ? variantSelect.value : null;

        addToCart(productId, variantId);
      }
    });
  });

  const addToCart = async (productId, variantId) => {
    try {
      const res = await fetch('/cart/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ productId, variantId })
      });

      if (res.ok) {
        showAlert('Product added to cart successfully!', 'success');
        window.location.reload();
      } else {
        showAlert('Failed to add product to cart', 'failure');
      }
    } catch (err) {
      showAlert('An error occurred while adding to cart', 'failure');
      console.error(err);
    }
  };
});