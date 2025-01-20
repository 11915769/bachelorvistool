from flask import Flask, request, jsonify
from flask_cors import CORS
import fitparse

app = Flask(__name__)
CORS(app)

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    try:
        # Parse the FIT file
        fitfile = fitparse.FitFile(file.stream)
        cadence = []
        distance = []

        for record in fitfile.get_messages('record'):
            record_data = {d.name: d.value for d in record}
            if 'cadence' in record_data and 'distance' in record_data:
                cadence.append(record_data['cadence'])
                distance.append(record_data['distance'])

        return jsonify({'data': {'cadence': cadence, 'distance': distance}})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
