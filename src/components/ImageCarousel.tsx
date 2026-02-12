import { useState, useEffect } from 'react';

export default function ImageCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const images = [
    '/src/assets/1.png',
    '/src/assets/2.png',
    '/src/assets/3.png',
    '/src/assets/4.png',
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 5000); // Cambiar imagen cada 5 segundos

    return () => clearInterval(interval);
  }, [images.length]);

  return (
    <div className="carousel-container">
      {images.map((image, index) => (
        <div
          key={index}
          className={`carousel-slide ${index === currentIndex ? 'active' : ''}`}
          style={{
            backgroundImage: `url(${image})`,
          }}
        />
      ))}
      
      <div className="carousel-dots">
        {images.map((_, index) => (
          <button
            key={index}
            className={`dot ${index === currentIndex ? 'active' : ''}`}
            onClick={() => setCurrentIndex(index)}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
