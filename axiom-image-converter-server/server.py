import io
import os
import sys
import subprocess
import tempfile
from flask import Flask, request, send_file, jsonify

def resource_path(relative_path):
    """
        Returns the absolute path to the specified resource.
        If the application is run as an executable, the temporary directory
        indicated by PyInstaller (sys._MEIPASS) will be used. Otherwise, the current script directory will be used.
    """
    if getattr(sys, 'frozen', False):
        base_path = sys._MEIPASS
    else:
        # In development mode, use the directory where server.py is located
        base_path = os.path.abspath(os.path.dirname(__file__))
    return os.path.join(base_path, relative_path)

def get_ffmpeg_path():
    return resource_path(os.path.join('helpers', 'ffmpeg', 'ffmpeg.exe'))

app = Flask(__name__)

@app.route('/convert', methods=['POST'])
def convert():
    # Check if the file was provided in the request
    if 'file' not in request.files:
        return jsonify({'error': 'No file was provided.'}), 400
    file = request.files['file']
    
    # Save the .webp file to a temporary file
    with tempfile.NamedTemporaryFile(suffix='.webp', delete=False) as temp_in:
        file.save(temp_in)
        temp_in_path = temp_in.name

    # Define the path for the converted .png file
    temp_out_path = temp_in_path.replace('.webp', '.png')
    
    try:
        # Get the path to ffmpeg.exe from the helpers folder
        ffmpeg_exe = get_ffmpeg_path()
        # Call ffmpeg for conversion (use the -y option to overwrite if necessary)
        subprocess.run(
            [ffmpeg_exe, '-y', '-i', temp_in_path, temp_out_path],
            check=True,
            capture_output=True
        )
        # Read the .png file into memory
        with open(temp_out_path, 'rb') as f:
            img_bytes = f.read()
        # Send the PNG file as a downloadable response
        return send_file(
            io.BytesIO(img_bytes),
            mimetype='image/png',
            as_attachment=True,
            download_name=os.path.basename(temp_out_path)
        )
    except subprocess.CalledProcessError as e:
        return jsonify({
            'error': 'Conversion failed',
            'details': e.stderr.decode()
        }), 500
    finally:
        # Delete the temporary files
        os.remove(temp_in_path)
        if os.path.exists(temp_out_path):
            os.remove(temp_out_path)

if __name__ == '__main__':
    app.run(port=5000, debug=True)
