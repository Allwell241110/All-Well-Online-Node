document.addEventListener('DOMContentLoaded', () => {
  const cartButtons = document.querySelectorAll('.add-to-cart-btn');

  // Function to show alert dynamically
  const showAlert = (message, type) => {
    const alertDiv = document.createElement('div');
    alertDiv.classList.add('alert');
    alertDiv.classList.add(type === 'success' ? 'alert-success' : 'alert-danger');
    alertDiv.textContent = message;

    // Append the alert to the body (or a specific container)
    document.body.appendChild(alertDiv);

    // Show the alert and then hide it after 5 seconds
    setTimeout(() => {
      alertDiv.style.display = 'none';
    }, 5000);
  };

  cartButtons.forEach(button => {
    button.addEventListener('click', async () => {
      const productId = button.getAttribute('data-product-id');

      try {
        const res = await fetch('/cart/add', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ productId })
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
    });
  });
});