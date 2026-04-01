from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from PIL import Image
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

@app.post("/convert")
async def convert_image(
    file: UploadFile = File(...),
    grid_size: int = Form(...),
    color_count: int = Form(...)
):
    contents = await file.read()

    image = Image.open(io.BytesIO(contents)).convert("RGB")

    # resize to grid first
    image = image.resize((grid_size, grid_size), Image.Resampling.NEAREST)

    # stronger color reduction
    image = image.convert("P", palette=Image.Palette.ADAPTIVE, colors=color_count)
    image = image.convert("RGB")

    # enlarge for preview
    preview_size = 400
    image = image.resize((preview_size, preview_size), Image.Resampling.NEAREST)

    output = io.BytesIO()
    image.save(output, format="PNG")
    output.seek(0)

    return StreamingResponse(output, media_type="image/png")
