
  //Banner Java Script
  const slides = document.querySelector('.slides');
  const totalSlides = slides.children.length;
  let index = 0;

  function showSlide(i) {
    index = (i + totalSlides) % totalSlides;
    slides.style.transform = `translateX(-${index * 100}%)`;
  }

  document.querySelector('.prev').addEventListener('click', () => {
    showSlide(index - 1);
  });

  document.querySelector('.next').addEventListener('click', () => {
    showSlide(index + 1);
  });

  setInterval(() => {
    showSlide(index + 1);
  }, 5000);

