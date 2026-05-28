import os
import sys
from PIL import Image

IN_DIR = os.path.join(os.path.dirname(__file__), "in")
OUT_DIR = os.path.join(os.path.dirname(__file__), "out")
TARGET_SIZE = (256, 256)

def normalize_icon(input_path, output_path):
    try:
        with Image.open(input_path) as img:
            # Convert to RGBA for transparency support
            img = img.convert("RGBA")
            
            # If the image was generated on a solid black background, 
            # we can convert the black pixels directly into transparent pixels.
            # (Assuming white silhouette on black background)
            data = img.getdata()
            new_data = []
            for item in data:
                # If pixel is dark (close to black), make it transparent
                if item[0] < 50 and item[1] < 50 and item[2] < 50:
                    new_data.append((255, 255, 255, 0))
                else:
                    # Make everything else pure white
                    new_data.append((255, 255, 255, item[3]))
            img.putdata(new_data)
            
            # Check ratio and crop to square if necessary
            width, height = img.size
            if width != height:
                print(f"Warning: {os.path.basename(input_path)} is not square ({width}x{height}). Cropping to center square.")
                min_dim = min(width, height)
                left = (width - min_dim) / 2
                top = (height - min_dim) / 2
                right = (width + min_dim) / 2
                bottom = (height + min_dim) / 2
                img = img.crop((left, top, right, bottom))
            
            # Resize to target size
            if img.size != TARGET_SIZE:
                img = img.resize(TARGET_SIZE, Image.Resampling.LANCZOS)
            
            # File size logic could be added here if we need to compress below a certain threshold
            # For now, we save as optimized PNG
            img.save(output_path, "PNG", optimize=True)
            print(f"Processed and normalized: {os.path.basename(input_path)}")
            
    except Exception as e:
        print(f"Error processing {input_path}: {e}")

def main():
    os.makedirs(IN_DIR, exist_ok=True)
    os.makedirs(OUT_DIR, exist_ok=True)
    
    print(f"Reading images from: {IN_DIR}")
    for filename in os.listdir(IN_DIR):
        if filename.lower().endswith(('.png', '.jpg', '.jpeg', '.webp')):
            in_path = os.path.join(IN_DIR, filename)
            out_path = os.path.join(OUT_DIR, os.path.splitext(filename)[0] + ".png")
            normalize_icon(in_path, out_path)
    print("Done.")

if __name__ == "__main__":
    main()
