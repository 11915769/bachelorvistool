from flask import Flask, request, jsonify
from flask_cors import CORS
from fit_service import parse_fit_file
from fit_service import process_files

app = Flask(__name__)
CORS(app)

@app.route('/api/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    try:
        data = parse_fit_file(file.stream)
        return jsonify({'data': data})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/uploads', methods=['POST'])
def upload_files():
    if 'files' not in request.files:
        return jsonify({'error': 'No files provided'}), 400

    files = request.files.getlist('files')

    try:
        results = process_files(files)
        return jsonify({'results': results})
    except Exception as e:
        return jsonify({'error': str(e)}), 500



if __name__ == '__main__':
    app.run(debug=True, port=5000)
