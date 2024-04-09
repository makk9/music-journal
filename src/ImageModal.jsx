import React, {useRef} from "react";

function ImageModal({ onClose, imageURLs, onAddImage }) {
  const fileInputRef = useRef(null);

  function handleFileInputChange(e) {
    const files = Array.from(e.target.files);
    onAddImage(files); // Pass the selected files to the parent component
  };

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
        ref={(fileInputRef)}
      />
      <button onClick={handleAddMoreImagesClick}>Add More Images</button>
      <button onClick={onClose}>Close</button>
    </div>
  );
}

export default ImageModal;
