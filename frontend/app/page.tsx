"use client";

import { useState } from "react";

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [gridSize, setGridSize] = useState("40");
  const [colorCount, setColorCount] = useState("8");

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setSelectedFile(file);

    if (file) {
      setMessage(`Selected: ${file.name}`);
      setResultImage(null);
    } else {
      setMessage("No file selected");
    }
  };

  const handleConvert = async () => {
    if (!selectedFile) {
      setMessage("Please select an image first.");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("grid_size", gridSize);
    formData.append("color_count", colorCount);

    try {
      const response = await fetch("http://127.0.0.1:8001/convert", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        setMessage("Conversion failed");
        return;
      }

      const blob = await response.blob();
      const imageUrl = URL.createObjectURL(blob);

      setResultImage(imageUrl);
      setMessage("Conversion successful");
    } catch (error) {
      setMessage("Conversion failed");
    }
  };

  return (
    <main className="p-10">
      <h1 className="text-2xl font-bold mb-6">Crochet Grid App</h1>

      <input type="file" accept="image/*" onChange={handleFileChange} />

      <div className="mt-4">
        <label className="mr-2">Grid Size:</label>
        <select
          value={gridSize}
          onChange={(e) => setGridSize(e.target.value)}
          className="border px-2 py-1"
        >
          <option value="20">20 x 20</option>
          <option value="40">40 x 40</option>
          <option value="60">60 x 60</option>
        </select>
      </div>

      <div className="mt-4">
        <label className="mr-2">Colors:</label>
        <select
          value={colorCount}
          onChange={(e) => setColorCount(e.target.value)}
          className="border px-2 py-1"
        >
          <option value="4">4 colors</option>
          <option value="8">8 colors</option>
          <option value="12">12 colors</option>
        </select>
      </div>

      <button
        onClick={handleConvert}
        className="mt-4 block px-4 py-2 border rounded"
      >
        Convert to Grid
      </button>

      {message && <p className="mt-4">{message}</p>}

      {resultImage && (
        <div className="mt-6">
          <img src={resultImage} alt="Grid result" className="border" />
            
          <a
            href={resultImage}
            download="crochet-grid.png"
            className="mt-4 inline-block px-4 py-2 border rounded"
          >
            Download Grid
          </a>
        </div>
      )}
    </main>
  );
}