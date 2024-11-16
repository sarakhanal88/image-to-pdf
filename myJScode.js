// Detect page by checking if specific elements exist
const getStartedBtn = document.getElementById('getStartedBtn');
const imageUpload = document.getElementById('imageUpload');

// Function to run only on the landing page
function initLandingPage() {
    const historyBtn = document.getElementById('historyBtn');
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');
    const historyContainer = document.getElementById('historyContainer');
    const historyList = document.getElementById('historyList');

    // Navigate to the main conversion page
    getStartedBtn.addEventListener('click', () => {
        window.location.href = 'homepage.html';  // Link to main conversion page
    });

    // Show conversion history
    historyBtn.addEventListener('click', () => {
        historyContainer.classList.toggle('hidden');
        clearHistoryBtn.classList.toggle('hidden');  // Show clear history button when history is displayed
        loadHistory();
    });

    // Load history from localStorage and display it
    function loadHistory() {
        historyList.innerHTML = '';  // Clear previous entries
        const history = JSON.parse(localStorage.getItem('pdfHistory')) || [];
        if (history.length === 0) {
            historyList.innerHTML = '<li>No history found.</li>';
        } else {
            history.forEach(item => {
                const listItem = document.createElement('li');
                listItem.textContent = item;
                historyList.appendChild(listItem);
            });
        }
    }

    // Clear history from localStorage
    clearHistoryBtn.addEventListener('click', () => {
        localStorage.removeItem('pdfHistory');
        loadHistory();
        alert('History cleared!');
    });
}

// Function to run only on the main conversion page
function initConversionPage() {
    const previewImage = document.getElementById('previewImage');
    const filterSelect = document.getElementById('filterSelect');
    const enhancementSelect = document.getElementById('enhancementSelect');
    const watermarkText = document.getElementById('watermarkText');
    const pdfFilename = document.getElementById('pdfFilename'); // Filename input
    const nextImageBtn = document.getElementById('nextImageBtn');
    const convertBtn = document.getElementById('convertBtn');
    const pageSizeSelect = document.getElementById('pageSizeSelect'); // New - Select page size
    const successMessage = document.getElementById('successMessage');

    const images = [];
    let currentIndex = 0;
    const imagesForPdf = [];

    imageUpload.addEventListener('change', handleImageUpload);
    nextImageBtn.addEventListener('click', showNextImage);
    filterSelect.addEventListener('change', applyFilter);
    enhancementSelect.addEventListener('change', applyEnhancement);

    function handleImageUpload(event) {
        const files = Array.from(event.target.files);
        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => images.push({ src: e.target.result });
            reader.readAsDataURL(file);
        });

        setTimeout(() => {
            currentIndex = 0;
            displayImage(currentIndex);
        }, 500);
    }

    function displayImage(index) {
        if (images[index]) {
            previewImage.src = images[index].src;
            previewImage.classList.remove('hidden');
            applyFilter();
            applyEnhancement();
        }
    }

    function applyFilter() {
        previewImage.style.filter = filterSelect.value;
    }

    function applyEnhancement() {
        previewImage.style.filter += ` ${enhancementSelect.value}`;
    }

    function showNextImage() {
        saveCurrentImageSettings();
        currentIndex = (currentIndex + 1) % images.length;
        displayImage(currentIndex);
    }

    function saveCurrentImageSettings() {
        const imageSettings = {
            src: previewImage.src,
            filter: filterSelect.value,
            enhancement: enhancementSelect.value,
            watermark: watermarkText.value
        };
        imagesForPdf[currentIndex] = imageSettings;
    }

    function saveToHistory(filename) {
        const history = JSON.parse(localStorage.getItem('pdfHistory')) || [];
        history.push(filename);
        localStorage.setItem('pdfHistory', JSON.stringify(history));
    }

    // Function to create PDF
    convertBtn.addEventListener('click', async () => {
        saveCurrentImageSettings();

        const { jsPDF } = window.jspdf;

        // Get selected page size from dropdown
        const pageSize = pageSizeSelect.value;
        let pdf;

        // Initialize jsPDF with the selected page size
        switch (pageSize) {
            case 'a3':
                pdf = new jsPDF({ format: 'a3', unit: 'mm' });
                break;
            case 'a4':
                pdf = new jsPDF({ format: 'a4', unit: 'mm' });
                break;
            case 'letter':
                pdf = new jsPDF({ format: 'letter', unit: 'mm' });
                break;
            case 'legal':
                pdf = new jsPDF({ format: 'legal', unit: 'mm' });
                break;
            default:
                pdf = new jsPDF({ format: 'a4', unit: 'mm' });  // Default to A4
        }

        // Set a consistent margin for all sides
        const margin = 20;

        // Add images to the PDF with the selected size
        for (let index = 0; index < imagesForPdf.length; index++) {
            const image = imagesForPdf[index];
            if (image) {
                const img = new Image();
                img.src = image.src;

                await new Promise((resolve) => {
                    img.onload = () => {
                        const imgWidth = img.width;
                        const imgHeight = img.height;

                        // Calculate scaling to fit the PDF page with equal margins
                        const pdfWidth = pdf.internal.pageSize.getWidth() - 2 * margin; // Margin for both sides
                        const pdfHeight = pdf.internal.pageSize.getHeight() - 2 * margin; // Margin for both sides
                        const scale = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight); // Fill the page

                        const scaledWidth = imgWidth * scale;
                        const scaledHeight = imgHeight * scale;

                        // Centering the image with equal margins
                        const xOffset = (pdf.internal.pageSize.getWidth() - scaledWidth) / 2;
                        const yOffset = (pdf.internal.pageSize.getHeight() - scaledHeight) / 2;

                        // Set canvas to apply filters and enhancements
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        canvas.width = imgWidth * 3; // Higher resolution
                        canvas.height = imgHeight * 3; // Higher resolution

                        // Apply filters and enhancements to the canvas
                        ctx.filter = `${image.filter} ${image.enhancement}`;
                        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                        // Add the image to the PDF first
                        pdf.addImage(canvas.toDataURL('image/jpeg', 1.0), 'JPEG', xOffset, yOffset, scaledWidth, scaledHeight);

                        // Now add the watermark directly on top of the image
                        if (image.watermark) {
                            pdf.setFontSize(40); // Adjust font size as needed
                            pdf.setTextColor(150, 150, 150); // Set watermark color
                            pdf.text(image.watermark, xOffset + (scaledWidth / 2), yOffset + (scaledHeight / 2), {
                                angle: 45, // Rotate the watermark
                                align: 'center',
                                baseline: 'middle'
                            });
                        }
                        resolve();
                    };
                });

                // Add a new page for each image except the last one
                if (index < imagesForPdf.length - 1) {
                    pdf.addPage();
                }
            }
        }

        // Generate filename and save the PDF
        const filename = pdfFilename.value.trim() || `Converted_Image_${new Date().toISOString()}.pdf`;
        pdf.save(filename);

        saveToHistory(filename);
        successMessage.classList.remove('hidden');
        successMessage.innerText = 'PDF created successfully!';
    });
}

// Initialize the appropriate functions based on the page
if (document.getElementById('imageUpload')) {
    initConversionPage();
} else {
    initLandingPage();
}
