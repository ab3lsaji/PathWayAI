import asyncio
from rapidocr_onnxruntime import RapidOCR

# Initialize OCR engine globally
engine = RapidOCR()

async def extract_text(image_bytes: bytes) -> str:
    def _run_ocr():
        try:
            result, _ = engine(image_bytes)
            if not result:
                return ""
            # Extract detected text lines
            text_lines = [line[1] for line in result]
            return "\n".join(text_lines).strip()
        except Exception as e:
            print(f"[RapidOCR Error]: {e}")
            return ""

    return await asyncio.to_thread(_run_ocr)