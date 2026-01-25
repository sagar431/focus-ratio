/**
 * Distraction Photo Capture Module
 * Takes photos when user leaves their desk for accountability
 */

class PhotoCapture {
    constructor(options = {}) {
        this.config = {
            captureOnAway: true,
            maxPhotos: 10,            // Keep last 10 photos
            captureDelay: 2000,       // Wait 2 seconds before capturing
            ...options
        };

        this.state = {
            photos: [],
            isInitialized: false,
            videoElement: null
        };

        // Callbacks
        this.onPhotoCapture = options.onPhotoCapture || (() => { });
    }

    init(videoElement) {
        this.state.videoElement = videoElement;
        this.createUI();
        this.loadPhotos();
        this.state.isInitialized = true;
        console.log('✅ Photo capture initialized');
    }

    createUI() {
        // Create photo gallery button and panel
        const galleryBtn = document.createElement('button');
        galleryBtn.className = 'gallery-btn';
        galleryBtn.id = 'galleryBtn';
        galleryBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
            </svg>
            <span class="photo-count" id="photoCount">0</span>
        `;
        galleryBtn.title = 'View captured photos';
        galleryBtn.onclick = () => this.toggleGallery();

        // Create gallery panel
        const galleryPanel = document.createElement('div');
        galleryPanel.className = 'gallery-panel';
        galleryPanel.id = 'galleryPanel';
        galleryPanel.innerHTML = `
            <div class="gallery-header">
                <h3>📸 Distraction Photos</h3>
                <button class="gallery-close" onclick="window.photoCapture.toggleGallery()">×</button>
            </div>
            <div class="gallery-content" id="galleryContent">
                <p class="gallery-empty">No photos captured yet</p>
            </div>
            <div class="gallery-footer">
                <button class="gallery-clear" onclick="window.photoCapture.clearPhotos()">
                    🗑️ Clear All
                </button>
            </div>
        `;

        // Add to webcam container
        const webcamContainer = document.getElementById('webcamContainer');
        if (webcamContainer) {
            webcamContainer.insertBefore(galleryBtn, webcamContainer.firstChild);
        } else {
            document.body.appendChild(galleryBtn);
        }
        document.body.appendChild(galleryPanel);

        this.elements = {
            galleryBtn,
            galleryPanel,
            galleryContent: document.getElementById('galleryContent'),
            photoCount: document.getElementById('photoCount')
        };
    }

    capturePhoto(reason = 'away') {
        if (!this.state.videoElement) {
            console.warn('No video element available for capture');
            return null;
        }

        const video = this.state.videoElement;

        // Create canvas to capture frame
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 320;
        canvas.height = video.videoHeight || 240;

        const ctx = canvas.getContext('2d');

        // Mirror the image (since video is mirrored)
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Add timestamp overlay
        ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, canvas.height - 30, canvas.width, 30);
        ctx.fillStyle = '#fff';
        ctx.font = '12px monospace';
        ctx.fillText(new Date().toLocaleString(), 10, canvas.height - 10);

        // Add reason badge
        const reasonText = reason === 'away' ? '🚶 Left Desk' : '📸 Manual Capture';
        ctx.fillStyle = reason === 'away' ? '#ef4444' : '#22c55e';
        ctx.fillRect(canvas.width - 100, 5, 95, 25);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText(reasonText, canvas.width - 95, 22);

        // Convert to data URL
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);

        // Create photo object
        const photo = {
            id: Date.now(),
            dataUrl,
            timestamp: new Date().toISOString(),
            reason
        };

        // Add to photos array
        this.state.photos.unshift(photo);

        // Limit to max photos
        if (this.state.photos.length > this.config.maxPhotos) {
            this.state.photos.pop();
        }

        // Save to localStorage
        this.savePhotos();

        // Update UI
        this.updateGalleryUI();

        // Show capture notification
        this.showCaptureNotification();

        // Callback
        this.onPhotoCapture(photo);

        console.log('📸 Photo captured:', reason);

        return photo;
    }

    showCaptureNotification() {
        // Flash effect on gallery button
        const btn = this.elements.galleryBtn;
        btn.classList.add('flash');
        setTimeout(() => btn.classList.remove('flash'), 500);
    }

    toggleGallery() {
        this.elements.galleryPanel.classList.toggle('visible');
    }

    updateGalleryUI() {
        const content = this.elements.galleryContent;
        const count = this.elements.photoCount;

        if (this.state.photos.length === 0) {
            content.innerHTML = '<p class="gallery-empty">No photos captured yet</p>';
        } else {
            content.innerHTML = this.state.photos.map(photo => `
                <div class="gallery-item">
                    <img src="${photo.dataUrl}" alt="Capture ${photo.id}">
                    <div class="gallery-item-info">
                        <span class="gallery-time">${new Date(photo.timestamp).toLocaleTimeString()}</span>
                        <span class="gallery-reason">${photo.reason === 'away' ? '🚶 Away' : '📸'}</span>
                    </div>
                </div>
            `).join('');
        }

        count.textContent = this.state.photos.length;
    }

    savePhotos() {
        try {
            // Only save metadata, not full images (to save space)
            const today = new Date().toDateString();
            const savedPhotos = this.state.photos.slice(0, 5); // Keep only last 5 in storage
            localStorage.setItem('focusRatioPhotos', JSON.stringify({
                date: today,
                photos: savedPhotos
            }));
        } catch (e) {
            console.warn('Failed to save photos:', e);
        }
    }

    loadPhotos() {
        try {
            const saved = localStorage.getItem('focusRatioPhotos');
            if (saved) {
                const data = JSON.parse(saved);
                if (data.date === new Date().toDateString()) {
                    this.state.photos = data.photos || [];
                    this.updateGalleryUI();
                }
            }
        } catch (e) {
            console.warn('Failed to load photos:', e);
        }
    }

    clearPhotos() {
        if (confirm('Clear all captured photos?')) {
            this.state.photos = [];
            localStorage.removeItem('focusRatioPhotos');
            this.updateGalleryUI();
            this.toggleGallery();
        }
    }

    getPhotos() {
        return this.state.photos;
    }
}

// Export for use in main app
window.PhotoCapture = PhotoCapture;
