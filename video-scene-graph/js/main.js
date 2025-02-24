// main.js

document.addEventListener("DOMContentLoaded", () => {
    /* ====== Mobile Menu Toggle (if you need it) ====== */
    const mobileMenuToggle = document.getElementById("mobile-menu-toggle");
    const navMenu = document.getElementById("nav-menu");
    if (mobileMenuToggle && navMenu) {
      mobileMenuToggle.addEventListener("click", () => {
        if (navMenu.style.display === "block") {
          navMenu.style.display = "none";
        } else {
          navMenu.style.display = "block";
        }
      });
    }
  
    /* ====== Carousel Logic ====== */
    function initCarousel(trackID, prevBtnID, nextBtnID) {
      const track = document.getElementById(trackID);
      if (!track) return; // safety check
  
      const slides = Array.from(track.children);
      let currentIndex = 0;
  
      const prevBtn = document.getElementById(prevBtnID);
      const nextBtn = document.getElementById(nextBtnID);
  
      // Move to a specific slide index
      function moveToSlide(index) {
        if (index < 0) {
          index = slides.length - 1; // wrap around
        } else if (index >= slides.length) {
          index = 0; // wrap around
        }
        const slideWidth = slides[0].getBoundingClientRect().width;
        track.style.transform = `translateX(-${slideWidth * index}px)`;
  
        // Pause video in old slide
        pauseVideo(slides[currentIndex]);
  
        currentIndex = index;
      }
  
      function pauseVideo(slide) {
        const videos = slide.getElementsByTagName("video");
        for (let v of videos) {
          v.pause();
        }
      }
  
      // Event listeners for next/prev
      if (prevBtn) {
        prevBtn.addEventListener("click", () => moveToSlide(currentIndex - 1));
      }
      if (nextBtn) {
        nextBtn.addEventListener("click", () => moveToSlide(currentIndex + 1));
      }
  
      // Ensure correct slide widths on load/resize
      function setSlideWidths() {
        const containerWidth = track.parentElement.getBoundingClientRect().width;
        slides.forEach(slide => {
          slide.style.minWidth = `${containerWidth}px`;
        });
        moveToSlide(currentIndex);
      }
  
      window.addEventListener("load", setSlideWidths);
      window.addEventListener("resize", setSlideWidths);
    }
  
    // Initialize each publication carousel
    initCarousel("track1", "prevBtn1", "nextBtn1"); // HIG
    initCarousel("track2", "prevBtn2", "nextBtn2"); // CYCLO
    initCarousel("track3", "prevBtn3", "nextBtn3"); // HyperGLM
  });
  