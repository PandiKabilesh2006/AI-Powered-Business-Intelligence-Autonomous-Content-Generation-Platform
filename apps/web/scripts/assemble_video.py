import os
import sys
import json
import traceback

# Automatically attempt to install dependencies if missing
try:
    import moviepy
    import numpy as np
    from PIL import Image as PILImage, ImageDraw, ImageFont
except ImportError:
    print("Required Python libraries are missing. Attempting to install...")
    try:
        import subprocess
        subprocess.check_call([sys.executable, "-m", "pip", "install", "moviepy", "pillow", "gtts", "numpy"])
        import moviepy
        import numpy as np
        from PIL import Image as PILImage, ImageDraw, ImageFont
        print("Successfully installed libraries.")
    except Exception as e:
        print(f"Failed to auto-install dependencies: {e}", file=sys.stderr)

def wrap_text(text, font, max_width):
    lines = []
    words = text.split()
    if not words:
        return lines
    current_line = words[0]
    for word in words[1:]:
        test_line = current_line + " " + word
        try:
            bbox = font.getbbox(test_line)
            w = bbox[2] - bbox[0]
        except AttributeError:
            w, h = font.getsize(test_line)
        
        if w <= max_width:
            current_line = test_line
        else:
            lines.append(current_line)
            current_line = word
    lines.append(current_line)
    return lines

def draw_subtitles(img, text):
    """Draw white wrapped subtitles over a semi-transparent black banner at the bottom of the PIL Image."""
    try:
        width, height = img.size
        draw = ImageDraw.Draw(img)
        
        # Determine clean font size
        font_size = int(height * 0.045)  # ~4.5% of height
        if font_size < 16:
            font_size = 16
            
        font = None
        for font_name in ["arial.ttf", "LiberationSans-Regular.ttf", "Helvetica.ttf"]:
            try:
                font = ImageFont.truetype(font_name, font_size)
                break
            except IOError:
                continue
                
        if font is None:
            font = ImageFont.load_default()
            
        # Wrapping
        max_text_width = int(width * 0.85)
        lines = wrap_text(text, font, max_text_width)
        
        if lines:
            line_heights = []
            for line in lines:
                try:
                    bbox = font.getbbox(line)
                    line_heights.append(bbox[3] - bbox[1] if bbox[3] - bbox[1] > 0 else font_size)
                except AttributeError:
                    line_heights.append(font.getsize(line)[1])
            total_text_height = sum(line_heights) + (len(lines) - 1) * 6
            
            box_padding = 15
            box_y_start = height - total_text_height - (box_padding * 2) - 40
            box_y_end = height - 40
            
            # Semi-transparent backing rectangle
            draw.rectangle(
                [(width * 0.05, box_y_start), (width * 0.95, box_y_end)],
                fill=(0, 0, 0, 160)
            )
            
            # Render text lines
            current_y = box_y_start + box_padding
            for i, line in enumerate(lines):
                try:
                    bbox = font.getbbox(line)
                    w = bbox[2] - bbox[0]
                except AttributeError:
                    w, h = font.getsize(line)
                
                x = (width - w) // 2
                draw.text((x, current_y), line, fill=(255, 255, 255, 255), font=font)
                current_y += line_heights[i] + 6
                
    except Exception as e:
        print(f"Error drawing subtitles: {e}", file=sys.stderr)
        
    return img

def overlay_subtitles_on_image(image_path, text, output_path):
    """Draw subtitles on a static image file and save it."""
    try:
        img = PILImage.open(image_path).convert("RGBA")
        img = draw_subtitles(img, text)
        img.convert("RGB").save(output_path, "JPEG")
        return True
    except Exception as e:
        print(f"Error drawing subtitles on image: {e}", file=sys.stderr)
        return False

def main():
    if len(sys.argv) < 3:
        print("Usage: python assemble_video.py <storyboard_json_path> <output_mp4_path>")
        sys.exit(1)
        
    storyboard_path = sys.argv[1]
    output_path = sys.argv[2]
    
    if not os.path.exists(storyboard_path):
        print(f"Storyboard file not found: {storyboard_path}", file=sys.stderr)
        sys.exit(1)
        
    try:
        with open(storyboard_path, "r", encoding="utf-8") as f:
            storyboard = json.load(f)
    except Exception as e:
        print(f"Failed to read storyboard JSON: {e}", file=sys.stderr)
        sys.exit(1)
        
    scenes = storyboard.get("scenes", [])
    if not scenes:
        print("No scenes found in storyboard.", file=sys.stderr)
        sys.exit(1)
        
    # Check moviepy imports
    try:
        # Try MoviePy v2.x direct imports first
        from moviepy import ImageClip, VideoFileClip, AudioFileClip, concatenate_videoclips
        from moviepy.video.fx import Loop
        USING_MOVIEPY_V2 = True
    except ImportError:
        try:
            # Fallback to MoviePy v1.x editor imports
            from moviepy.editor import ImageClip, VideoFileClip, AudioFileClip, concatenate_videoclips
            from moviepy.video.fx.loop import loop
            USING_MOVIEPY_V2 = False
        except ImportError:
            print("ERROR: moviepy library is not available. Exiting with preview details.", file=sys.stderr)
            sys.exit(2)
        
    clips = []
    temp_files = []
    
    try:
        for idx, scene in enumerate(scenes):
            visual_path = scene.get("image_path") # Contains path to image or video clip
            audio_path = scene.get("audio_path")
            text = scene.get("text", "")
            duration = float(scene.get("duration", 5.0))
            
            if not visual_path or not os.path.exists(visual_path):
                print(f"Warning: Visual asset file not found {visual_path}, skipping scene.", file=sys.stderr)
                continue
                
            # Determine if it's a video file or image file
            is_video = visual_path.lower().endswith(('.mp4', '.avi', '.mov', '.mkv', '.webm'))
            
            # Load audio to calculate accurate duration
            active_audio = None
            if audio_path and os.path.exists(audio_path):
                try:
                    active_audio = AudioFileClip(audio_path)
                    duration = active_audio.duration
                except Exception as ae:
                    print(f"Warning loading audio {audio_path}: {ae}", file=sys.stderr)
            
            if is_video:
                print(f"Scene {idx+1}: Loading video clip {visual_path}...")
                video_clip = VideoFileClip(visual_path)
                
                # Resize/loop/cut video to match duration
                if video_clip.duration < duration:
                    # Loop video if it is shorter than voice duration
                    if USING_MOVIEPY_V2:
                        video_clip = video_clip.with_effects([Loop(duration=duration)])
                    else:
                        video_clip = loop(video_clip, duration=duration)
                else:
                    # Cut video if it is longer than voice duration
                    if USING_MOVIEPY_V2:
                        video_clip = video_clip.subclipped(0, duration)
                    else:
                        video_clip = video_clip.subclip(0, duration)
                
                # Burn subtitles on each frame of the video
                def process_frame(frame):
                    img = PILImage.fromarray(frame)
                    img = draw_subtitles(img, text)
                    import numpy as np
                    return np.array(img)
                
                if USING_MOVIEPY_V2:
                    clip = video_clip.image_transform(process_frame)
                else:
                    clip = video_clip.fl_image(process_frame)
            else:
                # Process static image
                sub_image_path = f"{visual_path}_subtemp_{idx}.jpg"
                if overlay_subtitles_on_image(visual_path, text, sub_image_path):
                    temp_files.append(sub_image_path)
                    active_image = sub_image_path
                else:
                    active_image = visual_path
                
                if USING_MOVIEPY_V2:
                    clip = ImageClip(active_image).with_duration(duration)
                else:
                    clip = ImageClip(active_image).set_duration(duration)
            
            # Set audio if present
            if active_audio:
                if USING_MOVIEPY_V2:
                    clip = clip.with_audio(active_audio)
                else:
                    clip = clip.set_audio(active_audio)
                
            clips.append(clip)
            print(f"Scene {idx+1} loaded. Type: {'Video' if is_video else 'Image'}, Duration: {duration:.2f}s")
            
        if not clips:
            raise Exception("No valid clips could be generated.")
            
        # Concatenate scenes
        print("Concatenating clips...")
        final_clip = concatenate_videoclips(clips, method="compose")
        
        # Setup output directory
        os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
        
        # Render video
        print(f"Rendering output mp4 to {output_path}...")
        final_clip.write_videofile(
            output_path,
            fps=24,
            codec="libx264",
            audio_codec="aac",
            temp_audiofile="temp-audio.m4a",
            remove_temp=True
        )
        
        print("SUCCESS: Video compilation complete!")
        
    except Exception as e:
        print(f"ERROR: Video rendering failed: {e}", file=sys.stderr)
        traceback.print_exc()
        sys.exit(3)
    finally:
        # Cleanup temporary files
        for temp_file in temp_files:
            try:
                if os.path.exists(temp_file):
                    os.remove(temp_file)
            except Exception:
                pass

if __name__ == "__main__":
    main()
