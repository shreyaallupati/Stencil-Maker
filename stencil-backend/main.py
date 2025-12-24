import math
import io
from datetime import datetime
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, ImageOps, ImageFilter
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

@app.post("/generate-stencil/")
async def generate_stencil(
    file: UploadFile = File(...),
    target_width_cm: float = Form(...),
    target_height_cm: float = Form(...),
    filter_type: str = Form(...),
    orientation: str = Form("portrait")
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

        # 2. Open Image
        img = Image.open(file.file).convert("RGB")
        img_w_orig, img_h_orig = img.size

        # Apply Filters
        if filter_type == "bw":
            img = ImageOps.grayscale(img).convert("RGB")
        elif filter_type == "outline":
            img = img.convert("L").filter(ImageFilter.FIND_EDGES)
            img = ImageOps.invert(img).convert("RGB")

        # 3. UI already sends CM (it converts ft+in to cm)
        # So we use the values directly
        final_w_cm = target_width_cm
        final_h_cm = target_height_cm
        
        # Calculate grid based on these exact dimensions
        cols = math.ceil(final_w_cm / a4_w_cm)
        rows = math.ceil(final_h_cm / a4_h_cm)

        # 4. Convert to pixels at 300 DPI
        DPI = 300
        cm_to_inch = 1 / 2.54
        total_w_px = int(final_w_cm * cm_to_inch * DPI)
        total_h_px = int(final_h_cm * cm_to_inch * DPI)
        
        # 5. Resize image to exact target size (will stretch if needed)
        resized_img = img.resize((total_w_px, total_h_px), Image.Resampling.LANCZOS)

        # 6. A4 page size in pixels
        page_w_px = int(a4_w_cm * cm_to_inch * DPI)
        page_h_px = int(a4_h_cm * cm_to_inch * DPI)

        # 7. Generate PDF with tiles
        pdf_buffer = io.BytesIO()
        c = canvas.Canvas(pdf_buffer, pagesize=pagesize)

        for r in range(rows):
            for col in range(cols):
                left = col * page_w_px
                upper = r * page_h_px
                right = min(left + page_w_px, total_w_px)
                lower = min(upper + page_h_px, total_h_px)

                tile = resized_img.crop((left, upper, right, lower))
                
                page_canvas = Image.new("RGB", (page_w_px, page_h_px), "white")
                page_canvas.paste(tile, (0, 0))

                tile_io = io.BytesIO()
                page_canvas.save(tile_io, format="JPEG", quality=95)
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