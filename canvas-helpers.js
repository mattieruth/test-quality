class CanvasRenderer {
  constructor(canvas, onFirstRender) {
    this.canvas = canvas;
    this.aborted = false;
    this.hasRendered = false;
    this.onFirstRender = onFirstRender;
    this.renderOnInterval = true;
  }

  render(style = 'sequence') {
    this.lastDrawTime = Date.now();
    switch (style) {
      case 'ball':
        this.drawBall();
        break;
      case 'gradient':
        this.drawGradient();
        break;
      case 'sequence':
      default:
        this.drawImgSequence();
        break;
    }
  }

  abort() {
    this.aborted = true;
  }

  printFPS() {
    if (!this.hasRendered) return;

    let now = Date.now();
    console.log(`fps: ${1000 / (now - this.lastDrawTime)}`);
    this.lastDrawTime = now;
  }

  async drawImgSequence() {
    console.log('capture source: images');

    const ctx = this.canvas.getContext('2d');

    // Folder path containing images on the server
    const folderPath = './frames';

    // Array to store loaded image objects
    const images = [];

    // Function to fetch and load images from a folder
    const loadImagesFromFolder = async () => {
      try {
        const data = [];
        for (let i = 1; i <= 30; i++) {
          const pad = (numS) => {
            return numS.length < 2
              ? `00${numS}`
              : numS.length < 3
              ? `0${numS}`
              : numS;
          };
          data.push(`frame_${pad(i.toString())}.jpg`);
        }

        // Function to load images
        async function loadImage(src) {
          return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
          });
        }

        // Load all images asynchronously
        const imagePromises = data.map(async (imageName) => {
          const imagePath = `${folderPath}/${imageName}`;
          console.log('load image', imagePath);
          const img = await loadImage(imagePath);
          images.push(img);
        });

        // Wait for all images to be loaded
        await Promise.all(imagePromises);
      } catch (error) {
        console.error('Error loading images:', error);
      }
    };

    // Load and draw images
    await loadImagesFromFolder();

    let index = 0;
    let incrementing = true;
    // Function to draw images on the canvas
    const drawImage = () => {
      if (this.aborted) return;

      this.printFPS();

      let img = images[index];
      // Draw the image at specific coordinates
      ctx.drawImage(img, 0, 0, 1920, 1080);

      incrementing =
        index === 0 ? true : index === images.length - 1 ? false : incrementing;
      if (incrementing) {
        index++;
      } else {
        index--;
      }

      if (!this.hasRendered) {
        this.onFirstRender();
        this.hasRendered = true;
      }
      if (!this.renderOnInterval) {
        requestAnimationFrame(drawImage);
      }
    };

    drawImage();
    if (this.renderOnInterval) {
      this.renderInterval = setInterval(() => {
        drawImage();
      }, 1000 / 31);
    }
  }

  drawBall() {
    console.log('capture source: ball');

    let ctx = this.canvas.getContext('2d');

    // Define the ball properties
    const ballRadius = 350;
    let x = this.canvas.width / 2;
    let y = this.canvas.height / 2;
    let dx = 2;
    let dy = 2;

    const draw = () => {
      if (this.aborted) return;

      this.printFPS();

      // Clear the canvas
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      // Create a radial gradient for the ball
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, ballRadius);
      gradient.addColorStop(0, 'red');
      gradient.addColorStop(1, 'orange');

      // Draw the ball
      ctx.beginPath();
      ctx.arc(x, y, ballRadius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
      ctx.closePath();

      // Update ball position
      x += dx;
      y += dy;

      // Bounce off the walls
      if (x - ballRadius < 0 || x + ballRadius > this.canvas.width) {
        dx = -dx;
      }
      if (y - ballRadius < 0 || y + ballRadius > this.canvas.height) {
        dy = -dy;
      }

      if (!this.hasRendered) {
        this.onFirstRender();
        this.hasRendered = true;
      }
      if (!this.renderOnInterval) {
        requestAnimationFrame(draw);
      }
    };

    draw();
    if (this.renderOnInterval) {
      this.renderInterval = setInterval(() => {
        draw();
      }, 1000 / 31);
    }
  }

  drawGradient() {
    console.log('capture source: gradient');

    let ctx = this.canvas.getContext('2d');

    // Define gradient colors
    const gradient1 = ctx.createLinearGradient(0, 0, this.canvas.width, 0);
    gradient1.addColorStop(0, '#5F9EA0');
    gradient1.addColorStop(0.5, '#FFA07A');
    gradient1.addColorStop(1, '#DC143C');

    const gradient2 = ctx.createLinearGradient(0, 0, this.canvas.width, 0);
    gradient2.addColorStop(0, '#008B8B');
    gradient2.addColorStop(0.5, '#FF7F50');
    gradient2.addColorStop(1, '#FF4500');

    // Initial position of the gradient
    let position = 0;

    const draw = () => {
      if (this.aborted) return;

      this.printFPS();

      // Clear the canvas
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      // Update position for the next frame
      position += 1;

      // Reset position if it goes beyond canvas width
      if (position > this.canvas.width) {
        position = 0;
      }

      // Draw the gradient
      ctx.fillStyle = gradient1;
      ctx.fillRect(position, 0, this.canvas.width, this.canvas.height);
      ctx.fillStyle = gradient2;
      ctx.fillRect(0, 0, position - 10, this.canvas.height);

      // after we've drawn once, if we haven't started the test yet, start it.
      if (!this.hasRendered) {
        this.onFirstRender();
        this.hasRendered = true;
      }

      if (!this.renderOnInterval) {
        requestAnimationFrame(draw);
      }
    };
    draw();
    if (this.renderOnInterval) {
      this.renderInterval = setInterval(() => {
        draw();
      }, 1000 / 31);
    }
  }
}
