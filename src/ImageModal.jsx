import React, { useRef } from "react";

function ImageModal({ onClose, imageURLs, onAddImage }) {
  const fileInputRef = useRef(null);

  // Handle file input change and upload files
  async function handleFileInputChange(e) {
    const files = Array.from(e.target.files);
    // Create a FormData object to send via POST
    const formData = new FormData();
    files.forEach((file) => formData.append("file", file));

    // Upload Request
    try {
      const response = await fetch("/images/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload image");
      }

      const imageUrls = await response.json();
      onAddImage([imageUrls.url]);
    } catch (error) {
      console.error("Error uploading files:", error);
    }
  }

  function handleAddMoreImagesClick() {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }

  return (
    <div className="image-modal-backdrop">
      <div className="image-modal-content">
        <div className="images-list">
          {imageURLs.map((url, index) => (
            <img key={index} src={url} alt="Journal Attachment" />
          ))}
        </div>
      </div>
      <input
        type="file"
        multiple
        accept="image/*"
        onChange={handleFileInputChange}
        style={{ display: "none" }} // Hide the input element
        ref={fileInputRef}
      />
      <button onClick={handleAddMoreImagesClick}>Add Images</button>
      <button onClick={onClose}>Close</button>
    </div>
  );
}

export default ImageModal;
