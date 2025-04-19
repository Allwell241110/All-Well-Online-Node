  //Products detail thumbsnail
  const mainImage = document.querySelector('.main-image');
  const thumbnails = document.querySelectorAll('.thumb');

  thumbnails.forEach(thumb => {
    thumb.addEventListener('click', () => {
      mainImage.src = thumb.src;
    });
  });