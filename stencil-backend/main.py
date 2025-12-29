import math
import io
from datetime import datetime
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
# Added ImageDraw to handle the black lines
from PIL import Image, ImageOps, ImageFilter, ImageDraw
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.utils import ImageReader

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Stencil service is running!"}

@app.post("/generate-stencil/")
async def generate_stencil(
    file: UploadFile = File(...),
    target_width_cm: float = Form(...),
    target_height_cm: float = Form(...),
    filter_type: str = Form(...),
    orientation: str = Form("portrait"),
    # New Margin Inputs
    add_margins: bool = Form(False),
    margin_x_cm: float = Form(0.0), # Left/Right symmetry
    margin_y_cm: float = Form(0.0)  # Top/Bottom symmetry
):
    if not file.content_type.startswith("image/"):
        return {"error": "File is not an image."}

    try:
        # 1. Page settings
        if orientation == "landscape":
            pagesize = landscape(A4)
            a4_w_cm, a4_h_cm = 29.7, 21.0
        else:
            pagesize = A4
            a4_w_cm, a4_h_cm = 21.0, 29.7
        
        a4_w_pt, a4_h_pt = pagesize

        # 2. Open Image and apply filters
        img = Image.open(file.file).convert("RGB")
        if filter_type == "bw":
            img = ImageOps.grayscale(img).convert("RGB")
        elif filter_type == "outline":
            img = img.convert("L").filter(ImageFilter.FIND_EDGES)
            img = ImageOps.invert(img).convert("RGB")

        # 3. Dimensions & Resolution
        DPI = 300
        cm_to_inch = 1 / 2.54
        
        # Total mural dimensions in pixels
        total_w_px = int(target_width_cm * cm_to_inch * DPI)
        total_h_px = int(target_height_cm * cm_to_inch * DPI)

        # 4. Create the "Virtual Mural Canvas" (White background)
        mural_canvas = Image.new("RGB", (total_w_px, total_h_px), "white")
        draw = ImageDraw.Draw(mural_canvas)

        # 5. Handle Margins and Image Placement
        if add_margins:
            # Calculate inner painting dimensions in pixels
            inner_w_cm = max(0.1, target_width_cm - (2 * margin_x_cm))
            inner_h_cm = max(0.1, target_height_cm - (2 * margin_y_cm))
            
            inner_w_px = int(inner_w_cm * cm_to_inch * DPI)
            inner_h_px = int(inner_h_cm * cm_to_inch * DPI)
            
            offset_x_px = int(margin_x_cm * cm_to_inch * DPI)
            offset_y_px = int(margin_y_cm * cm_to_inch * DPI)

            # Resize image to the inner area
            resized_img = img.resize((inner_w_px, inner_h_px), Image.Resampling.LANCZOS)
            
            # Paste the image onto the center of the white canvas
            mural_canvas.paste(resized_img, (offset_x_px, offset_y_px))

            # Draw Black Lines (2-pixel width for visibility)
            # Line 1: Outer edge of the whole mural
            draw.rectangle([0, 0, total_w_px - 1, total_h_px - 1], outline="black", width=2)
            # Line 2: Inner edge where the image meets the margin
            draw.rectangle(
                [offset_x_px, offset_y_px, offset_x_px + inner_w_px, offset_y_px + inner_h_px], 
                outline="black", 
                width=2
            )
        else:
            # No margins: Just stretch image to full canvas
            resized_img = img.resize((total_w_px, total_h_px), Image.Resampling.LANCZOS)
            mural_canvas.paste(resized_img, (0, 0))

        # 6. Grid Calculation (based on full mural size)
        cols = math.ceil(target_width_cm / a4_w_cm)
        rows = math.ceil(target_height_cm / a4_h_cm)
        page_w_px = int(a4_w_cm * cm_to_inch * DPI)
        page_h_px = int(a4_h_cm * cm_to_inch * DPI)

        # 7. Generate PDF with tiles from our mural_canvas
        pdf_buffer = io.BytesIO()
        c = canvas.Canvas(pdf_buffer, pagesize=pagesize)

        for r in range(rows):
            for col in range(cols):
                left = col * page_w_px
                upper = r * page_h_px
                # Crop tile from the canvas (which already has margins/lines)
                tile = mural_canvas.crop((
                    left, 
                    upper, 
                    min(left + page_w_px, total_w_px), 
                    min(upper + page_h_px, total_h_px)
                ))
                
                # Ensure the tile fits perfectly on the A4 page background
                page_output = Image.new("RGB", (page_w_px, page_h_px), "white")
                page_output.paste(tile, (0, 0))

                tile_io = io.BytesIO()
                page_output.save(tile_io, format="JPEG", quality=95)
                tile_io.seek(0)

                c.drawImage(ImageReader(tile_io), 0, 0, width=a4_w_pt, height=a4_h_pt)
                c.showPage()

        c.save()
        pdf_buffer.seek(0)

        filename = f"stencil_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )

    except Exception as e:
        return {"error": str(e)}
    finally:
        file.file.close()

@app.post("/generate-preview/")
async def generate_preview(
    file: UploadFile = File(...),
    target_width_cm: float = Form(...),
    target_height_cm: float = Form(...),
    filter_type: str = Form(...),
    orientation: str = Form("portrait"),
    add_margins: bool = Form(False),
    margin_x_cm: float = Form(0.0),
    margin_y_cm: float = Form(0.0)
):
    if not file.content_type.startswith("image/"):
        return {"error": "File is not an image."}

    try:
        # 1. Page settings
        if orientation == "landscape":
            a4_w_cm, a4_h_cm = 29.7, 21.0
        else:
            a4_w_cm, a4_h_cm = 21.0, 29.7

        # 2. Open Image and apply filters
        img = Image.open(file.file).convert("RGB")
        if filter_type == "bw":
            img = ImageOps.grayscale(img).convert("RGB")
        elif filter_type == "outline":
            img = img.convert("L").filter(ImageFilter.FIND_EDGES)
            img = ImageOps.invert(img).convert("RGB")

        # 3. Dimensions & Resolution
        DPI = 150 # Lower DPI for preview speed
        cm_to_inch = 1 / 2.54
        
        total_w_px = int(target_width_cm * cm_to_inch * DPI)
        total_h_px = int(target_height_cm * cm_to_inch * DPI)

        # 4. Create Canvas
        mural_canvas = Image.new("RGB", (total_w_px, total_h_px), "white")
        draw = ImageDraw.Draw(mural_canvas)

        # 5. Margins & Placement
        if add_margins:
            inner_w_cm = max(0.1, target_width_cm - (2 * margin_x_cm))
            inner_h_cm = max(0.1, target_height_cm - (2 * margin_y_cm))
            inner_w_px = int(inner_w_cm * cm_to_inch * DPI)
            inner_h_px = int(inner_h_cm * cm_to_inch * DPI)
            offset_x_px = int(margin_x_cm * cm_to_inch * DPI)
            offset_y_px = int(margin_y_cm * cm_to_inch * DPI)

            resized_img = img.resize((inner_w_px, inner_h_px), Image.Resampling.LANCZOS)
            mural_canvas.paste(resized_img, (offset_x_px, offset_y_px))
            
            # Draw Borders
            draw.rectangle([0, 0, total_w_px - 1, total_h_px - 1], outline="black", width=3)
            draw.rectangle([offset_x_px, offset_y_px, offset_x_px + inner_w_px, offset_y_px + inner_h_px], outline="black", width=3)
        else:
            resized_img = img.resize((total_w_px, total_h_px), Image.Resampling.LANCZOS)
            mural_canvas.paste(resized_img, (0, 0))

        # 6. Draw Grid Lines (Red)
        cols = math.ceil(target_width_cm / a4_w_cm)
        rows = math.ceil(target_height_cm / a4_h_cm)
        page_w_px = int(a4_w_cm * cm_to_inch * DPI)
        page_h_px = int(a4_h_cm * cm_to_inch * DPI)

        for r in range(1, rows):
            y = r * page_h_px
            draw.line([(0, y), (total_w_px, y)], fill="red", width=2)
        for c in range(1, cols):
            x = c * page_w_px
            draw.line([(x, 0), (x, total_h_px)], fill="red", width=2)

        # Return Image
        img_io = io.BytesIO()
        mural_canvas.save(img_io, 'JPEG', quality=85)
        img_io.seek(0)
        return StreamingResponse(img_io, media_type="image/jpeg")

    except Exception as e:
        return {"error": str(e)}
    finally:
        file.file.close()