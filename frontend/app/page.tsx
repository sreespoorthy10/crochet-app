"use client";

import { useState } from "react";

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [resultImage, setResultImage] = useState<string | null>(null);

  const [gridWidth, setGridWidth] = useState(40);
  const [gridHeight, setGridHeight] = useState(40);
  const [colorCount, setColorCount] = useState(8);

  const [originalWidth, setOriginalWidth] = useState<number | null>(null);
  const [originalHeight, setOriginalHeight] = useState<number | null>(null);

  const [maxGridWidth, setMaxGridWidth] = useState(300);
  const [maxGridHeight, setMaxGridHeight] = useState(300);

  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const minGrid = 1;

  const clampWidth = (value: number) => {
    return Math.max(minGrid, Math.min(maxGridWidth, value));
  };

  const clampHeight = (value: number) => {
    return Math.max(minGrid, Math.min(maxGridHeight, value));
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0] || null;
    setSelectedFile(file);
    setResultImage(null);

    if (!file) {
      setMessage("No file selected");
      return;
    }

    setMessage(`Selected: ${file.name}`);
    setIsAnalyzing(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("http://127.0.0.1:8001/analyze", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        setMessage(`Image selected, but automatic analysis failed: ${errorText}`);
        return;
      }

      const data = await response.json();

      setOriginalWidth(data.image_width);
      setOriginalHeight(data.image_height);

      setMaxGridWidth(data.max_grid_width);
      setMaxGridHeight(data.max_grid_height);

      setGridWidth(data.recommended_grid_width);
      setGridHeight(data.recommended_grid_height);
      setColorCount(data.recommended_color_count);

      setMessage(
        `Auto-selected ${data.recommended_grid_width} x ${data.recommended_grid_height} grid and ${data.recommended_color_count} colors`
      );
    } catch (error) {
      setMessage("Image selected, but automatic analysis failed");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGridWidthChange = (value: number) => {
    if (!originalWidth || !originalHeight) {
      setGridWidth(clampWidth(value));
      return;
    }

    const requestedWidth = clampWidth(value);
    const aspectRatio = originalHeight / originalWidth;

    let newWidth = requestedWidth;
    let newHeight = Math.round(newWidth * aspectRatio);

    // If height exceeds its max, scale width back down
    if (newHeight > maxGridHeight) {
      newHeight = maxGridHeight;
      newWidth = Math.round(newHeight * (originalWidth / originalHeight));
    }

    newWidth = clampWidth(newWidth);
    newHeight = clampHeight(newHeight);

    setGridWidth(newWidth);
    setGridHeight(newHeight);
  };

  const handleGridHeightChange = (value: number) => {
    if (!originalWidth || !originalHeight) {
      setGridHeight(clampHeight(value));
      return;
    }

    const requestedHeight = clampHeight(value);
    const aspectRatio = originalWidth / originalHeight;

    let newHeight = requestedHeight;
    let newWidth = Math.round(newHeight * aspectRatio);

    // If width exceeds its max, scale height back down
    if (newWidth > maxGridWidth) {
      newWidth = maxGridWidth;
      newHeight = Math.round(newWidth * (originalHeight / originalWidth));
    }

    newWidth = clampWidth(newWidth);
    newHeight = clampHeight(newHeight);

    setGridWidth(newWidth);
    setGridHeight(newHeight);
  };

  const handleConvert = async () => {
    if (!selectedFile) {
      setMessage("Please select an image first.");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("grid_width", String(gridWidth));
    formData.append("grid_height", String(gridHeight));
    formData.append("color_count", String(colorCount));

    try {
      const response = await fetch("http://127.0.0.1:8001/convert", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        setMessage(errorData?.detail || "Conversion failed");
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
  
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
        {/* Left side: Preview image - 2/3 */}
        <div className="md:col-span-2">
          <div className="border rounded bg-gray-50 h-[600px] p-4 flex items-center justify-center">
            {resultImage ? (
              <img
                src={resultImage}
                alt="Grid result"
                className="max-w-full max-h-full object-contain border"
              />
            ) : (
              <div className="text-gray-500">Preview will appear here</div>
            )}
          </div>
            
          {resultImage && (
            <a
              href={resultImage}
              download="crochet-grid.png"
              className="mt-4 inline-block px-4 py-2 border rounded"
            >
              Download Grid
            </a>
          )}
        </div>
  
        {/* Right side: Controls - 1/3 */}
        <div className="md:col-span-1 border rounded p-4">
          <input type="file" accept="image/*" onChange={handleFileChange} />
  
          {originalWidth && originalHeight && (
            <p className="mt-3 text-sm text-gray-600">
              Original image size: {originalWidth} x {originalHeight}
            </p>
          )}
  
          <div className="mt-6">
            <label className="block font-medium mb-2">
              Horizontal Grid Size: {gridWidth}
            </label>
            <input
              type="range"
              min={minGrid}
              max={maxGridWidth}
              step="1"
              value={gridWidth}
              onChange={(e) => handleGridWidthChange(Number(e.target.value))}
              className="w-full"
              disabled={!selectedFile}
            />
            <div className="flex justify-between text-sm text-gray-600 mt-1">
              <span>Smaller</span>
              <span>Larger</span>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Max allowed: {maxGridWidth}
            </p>
          </div>
  
          <div className="mt-6">
            <label className="block font-medium mb-2">
              Vertical Grid Size: {gridHeight}
            </label>
            <input
              type="range"
              min={minGrid}
              max={maxGridHeight}
              step="1"
              value={gridHeight}
              onChange={(e) => handleGridHeightChange(Number(e.target.value))}
              className="w-full"
              disabled={!selectedFile}
            />
            <div className="flex justify-between text-sm text-gray-600 mt-1">
              <span>Smaller</span>
              <span>Larger</span>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Max allowed: {maxGridHeight}
            </p>
          </div>
  
          <div className="mt-6">
            <label className="block font-medium mb-2">
              Number of Colors: {colorCount}
            </label>
            <input
              type="range"
              min="2"
              max="64"
              step="1"
              value={colorCount}
              onChange={(e) => setColorCount(Number(e.target.value))}
              className="w-full"
              disabled={!selectedFile}
            />
            <div className="flex justify-between text-sm text-gray-600 mt-1">
              <span>Fewer</span>
              <span>More</span>
            </div>
          </div>
  
          <button
            onClick={handleConvert}
            disabled={!selectedFile || isAnalyzing}
            className="mt-6 block w-full px-4 py-2 border rounded disabled:opacity-50"
          >
            {isAnalyzing ? "Analyzing image..." : "Convert to Grid"}
          </button>
  
          {message && <p className="mt-4 text-sm">{message}</p>}
        </div>
      </div>
    </main>
  );
}