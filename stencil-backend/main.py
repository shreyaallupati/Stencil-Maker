from fastapi import FastAPI, UploadFile, File, Form
from fastapi.responses import FileResponse
from PIL import Image, ImageOps, ImageFilter
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
import io
import os
import uuid
from reportlab.lib.utils import ImageReader

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"], # Vite's default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/generate-stencil/")
async def generate_stencil(
    file: UploadFile = File(...),
    target_width_cm: float = Form(...),
    filter_type: str = Form(...) # "color", "bw", "outline"
):
    # Load Image
    img = Image.open(file.file)
    
    # Apply Filters
    if filter_type == "bw":
        img = ImageOps.grayscale(img)
    elif filter_type == "outline":
        img = img.convert("L").filter(ImageFilter.FIND_EDGES)
    
    # A4 Dimensions in points (1 point = 1/72 inch)
    # A4 is roughly 595 x 842 points
    a4_w, a4_h = A4
    
    # Calculate how many tiles we need
    img_w, img_h = img.size
    aspect_ratio = img_h / img_w
    target_height_cm = target_width_cm * aspect_ratio
    
    # Assume 1cm = 28.35 points for scaling
    # We slice based on the grid
    cols = int(target_width_cm // 21) + 1 # 21cm width of A4
    rows = int(target_height_cm // 29.7) + 1 # 29.7cm height of A4
    
    tile_w = img_w // cols
    tile_h = img_h // rows
    
    pdf_path = f"stencil_{uuid.uuid4()}.pdf"
    c = canvas.Canvas(pdf_path, pagesize=A4)
    
    for r in range(rows):
        for col in range(cols):
            left = col * tile_w
            top = r * tile_h
            right = left + tile_w
            bottom = top + tile_h
            
            # Crop the tile
            tile = img.crop((left, top, right, bottom))
            
            # Save tile to temp buffer to put in PDF
            tile_buffer = io.BytesIO()
            tile.save(tile_buffer, format="JPEG")
            tile_buffer.seek(0)
            
            # Draw on PDF (scaling to fill A4)
            c.drawImage(ImageReader(tile_buffer), 0, 0, width=a4_w, height=a4_h)
            c.showPage() # New page for next tile
            
    c.save()
    return FileResponse(pdf_path, filename="your_stencil.pdf")