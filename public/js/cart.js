
  document.addEventListener('DOMContentLoaded', () => {
  const updateForms = document.querySelectorAll('form[action="/cart/update"]');

  updateForms.forEach(form => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const productId = form.querySelector('input[name="productId"]').value;
      const quantity = parseInt(form.querySelector('input[name="quantity"]').value);

      try {
        const res = await fetch('/cart/update', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ productId, quantity }),
        });

        const data = await res.json();

        if (res.ok) {
          showAlert('success', data.message);
          window.location.reload();
        } else {
          showAlert('danger', data.message || 'Failed to update cart');
        }
      } catch (err) {
        console.error(err);
        showAlert('danger', 'An error occurred while updating the cart');
      }
    });
  });

  function showAlert(type, message) {
    const alertBox = document.createElement('div');
    alertBox.className = `alert alert-${type}`;
    alertBox.textContent = message;
    document.body.appendChild(alertBox);

    setTimeout(() => {
      alertBox.remove();
    }, 3000);
  }
});