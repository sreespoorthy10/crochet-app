from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from PIL import Image, ImageFilter, ImageStat
import io

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root():
    return {"message": "Backend is working"}


MAX_GRID_SIZE = 300


def calculate_image_complexity(image: Image.Image) -> float:
    small_image = image.resize((100, 100)).convert("RGB")

    edge_image = small_image.filter(ImageFilter.FIND_EDGES).convert("L")
    edge_stat = ImageStat.Stat(edge_image)
    edge_score = edge_stat.mean[0] / 255.0

    rgb_stat = ImageStat.Stat(small_image)
    variance_values = rgb_stat.var
    avg_variance = sum(variance_values) / len(variance_values)
    variance_score = min(avg_variance / 5000.0, 1.0)

    complexity = (0.6 * edge_score) + (0.4 * variance_score)
    return max(0.0, min(complexity, 1.0))


def recommend_base_detail(complexity: float) -> int:
    if complexity < 0.20:
        return 30
    elif complexity < 0.35:
        return 40
    elif complexity < 0.50:
        return 55
    elif complexity < 0.65:
        return 70
    elif complexity < 0.80:
        return 85
    else:
        return 100


def recommend_grid_dimensions(
    image_width: int,
    image_height: int,
    base_detail: int
) -> tuple[int, int]:
    max_width = min(MAX_GRID_SIZE, image_width)
    max_height = min(MAX_GRID_SIZE, image_height)

    if image_width >= image_height:
        grid_width = min(base_detail, max_width)
        grid_height = max(1, round(grid_width * (image_height / image_width)))
        grid_height = min(grid_height, max_height)
    else:
        grid_height = min(base_detail, max_height)
        grid_width = max(1, round(grid_height * (image_width / image_height)))
        grid_width = min(grid_width, max_width)

    return grid_width, grid_height


def recommend_color_count(complexity: float) -> int:
    if complexity < 0.20:
        return 6
    elif complexity < 0.35:
        return 8
    elif complexity < 0.50:
        return 10
    elif complexity < 0.65:
        return 14
    elif complexity < 0.80:
        return 18
    else:
        return 24


@app.post("/analyze")
async def analyze_image(file: UploadFile = File(...)):
    contents = await file.read()

    try:
        image = Image.open(io.BytesIO(contents)).convert("RGB")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid image file")

    image_width, image_height = image.size
    complexity = calculate_image_complexity(image)

    base_detail = recommend_base_detail(complexity)
    grid_width, grid_height = recommend_grid_dimensions(
        image_width=image_width,
        image_height=image_height,
        base_detail=base_detail,
    )
    color_count = recommend_color_count(complexity)

    return {
        "complexity": round(complexity, 3),
        "image_width": image_width,
        "image_height": image_height,
        "max_grid_width": min(MAX_GRID_SIZE, image_width),
        "max_grid_height": min(MAX_GRID_SIZE, image_height),
        "recommended_grid_width": grid_width,
        "recommended_grid_height": grid_height,
        "recommended_color_count": color_count,
    }


@app.post("/convert")
async def convert_image(
    file: UploadFile = File(...),
    grid_width: int = Form(...),
    grid_height: int = Form(...),
    color_count: int = Form(...)
):
    contents = await file.read()

    try:
        image = Image.open(io.BytesIO(contents)).convert("RGB")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid image file")

    original_width, original_height = image.size
    max_width = min(MAX_GRID_SIZE, original_width)
    max_height = min(MAX_GRID_SIZE, original_height)

    if grid_width < 1 or grid_height < 1:
        raise HTTPException(status_code=400, detail="Grid size must be greater than 0")

    if color_count < 1:
        raise HTTPException(status_code=400, detail="Color count must be greater than 0")

    if grid_width > max_width or grid_height > max_height:
        raise HTTPException(
            status_code=400,
            detail="Grid size cannot exceed 300 or the original image dimensions"
        )

    # Step 1: reduce image to actual grid dimensions
    grid_image = image.resize((grid_width, grid_height), Image.Resampling.NEAREST)

    # Step 2: reduce colors on the grid image
    grid_image = grid_image.convert(
        "P",
        palette=Image.Palette.ADAPTIVE,
        colors=color_count
    )
    grid_image = grid_image.convert("RGB")

    # Step 3: scale it back to original image size
    # so displayed image size stays constant
    preview_image = grid_image.resize(
        (original_width, original_height),
        Image.Resampling.NEAREST
    )

    output = io.BytesIO()
    preview_image.save(output, format="PNG")
    output.seek(0)

    return StreamingResponse(output, media_type="image/png")