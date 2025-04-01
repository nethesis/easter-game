// Confetti generator library
// Based on https://www.kirilv.com/canvas-confetti/
class ConfettiGenerator {
    constructor(params) {
        this.params = {
            target: 'confetti-container',
            max: 80,
            size: 1,
            animate: true,
            respawn: true,
            props: ['circle', 'square', 'triangle', 'line'],
            colors: [[165,104,246], [230,61,135], [0,199,228], [253,214,126]],
            clock: 25,
            interval: null,
            rotate: false,
            start_from_edge: false,
            width: window.innerWidth,
            height: window.innerHeight
        };

        if (params && typeof params === "object") {
            this.params = {...this.params, ...params};
        }

        this.containerEl = this.getContainerEl();
        this.canvas = document.createElement('canvas');
        this.containerEl.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.droppedCount = 0;
        this.particlesGenerated = 0;
        
        this.setCanvasSize();
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    getContainerEl() {
        let containerEl = document.getElementById(this.params.target);
        if (!containerEl) {
            containerEl = document.createElement('div');
            containerEl.id = this.params.target;
            document.body.appendChild(containerEl);
        }
        return containerEl;
    }

    setCanvasSize() {
        this.canvas.width = this.params.width;
        this.canvas.height = this.params.height;
        this.canvas.style.position = 'fixed';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.pointerEvents = 'none';
        this.canvas.style.zIndex = '1000';
    }

    getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    getRandomColor() {
        return this.params.colors[Math.floor(Math.random() * this.params.colors.length)];
    }

    getRandomShape() {
        return this.params.props[Math.floor(Math.random() * this.params.props.length)];
    }

    createParticle() {
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        let particle = {
            prop: this.getRandomShape(),
            x: this.params.start_from_edge ? (Math.random() > 0.5 ? width : 0) : Math.random() * width,
            y: this.params.start_from_edge ? (Math.random() > 0.5 ? height : 0) : Math.random() * height,
            radius: Math.random() * 4 + 1,
            size: Math.random() * 10 + 10,
            rotate: Math.random() < 0.5,
            line: Math.floor(Math.random() * 65) - 30,
            angle: Math.random() * 2 * Math.PI,
            speed: Math.random() + 0.5,
            rotationSpeed: Math.random() * 0.2,
            color: this.getRandomColor()
        };
        
        this.particles.push(particle);
        this.particlesGenerated++;
    }

    drawParticles() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        for (let i = 0; i < this.particles.length; i++) {
            let p = this.particles[i];
            let opacity = 1;
            
            if (p.y >= this.canvas.height) {
                this.droppedCount++;
                this.particles.splice(i, 1);
                i--;
                continue;
            }
            
            p.y += p.speed;
            
            if (p.rotate) {
                p.angle += p.rotationSpeed;
            }
            
            this.ctx.save();
            this.ctx.translate(p.x, p.y);
            this.ctx.rotate(p.angle);
            
            this.ctx.fillStyle = `rgba(${p.color.join(',')}, ${opacity})`;
            this.ctx.beginPath();
            
            if (p.prop === 'circle') {
                this.ctx.arc(0, 0, p.size / 2, 0, 2 * Math.PI);
            } else if (p.prop === 'square') {
                this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
            } else if (p.prop === 'triangle') {
                this.ctx.beginPath();
                this.ctx.moveTo(0, -p.size / 2);
                this.ctx.lineTo(-p.size / 2, p.size / 2);
                this.ctx.lineTo(p.size / 2, p.size / 2);
                this.ctx.closePath();
            } else if (p.prop === 'line') {
                this.ctx.beginPath();
                this.ctx.moveTo(0, -p.size / 2);
                this.ctx.lineTo(0, p.size / 2);
                this.ctx.lineWidth = 2;
                this.ctx.strokeStyle = `rgba(${p.color.join(',')}, ${opacity})`;
                this.ctx.stroke();
            }
            
            this.ctx.fill();
            this.ctx.restore();
        }
        
        if (this.particles.length < this.params.max && this.params.respawn) {
            this.createParticle();
        }
    }

    update() {
        this.drawParticles();
        if (this.params.animate) {
            requestAnimationFrame(this.update.bind(this));
        }
    }

    render() {
        for (let i = 0; i < this.params.max; i++) {
            this.createParticle();
        }
        this.update();
    }

    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.particles = [];
        this.droppedCount = 0;
        this.particlesGenerated = 0;
        
        if (this.params.interval) {
            clearInterval(this.params.interval);
        }
    }
}
