from typing import List

import fitparse

SEMICIRCLES_TO_DEGREES = 180 / (2**31)

def parse_fit_file(file_stream):
    distances, cadences, heart_rates, stride_lengths, powers, elevations, paces = ([] for _ in range(7))
    latitudes, longitudes, timestamps = [], [], []


    for record in fitparse.FitFile(file_stream).get_messages("record"):
        record_data = {d.name: d.value for d in record}
        distance = record_data.get("distance", None)
        cadence = record_data.get("cadence", None)
        fractional_cadence = record_data.get("fractional_cadence", 0)
        heart_rate = record_data.get("heart_rate", None)
        stride_length = record_data.get("step_length", None)
        power = record_data.get("power", None)
        elevation = record_data.get("enhanced_altitude", None)
        pace = 60 / (record_data.get("enhanced_speed", 0) * 3.6) if record_data.get("enhanced_speed", 0) else None

        if "position_lat" in record_data and "position_long" in record_data and record_data.get("position_lat", None) and record_data.get("position_long", None):
            lat = record_data["position_lat"] * SEMICIRCLES_TO_DEGREES
            lng = record_data["position_long"] * SEMICIRCLES_TO_DEGREES
            latitudes.append(lat)
            longitudes.append(lng)

        timestamp = record_data.get("timestamp", None)
        if timestamp:
            timestamps.append(timestamp)
        if distance is not None:
            distances.append(distance / 1000)
            cadences.append((cadence + fractional_cadence) * 2 if cadence is not None else None)
            heart_rates.append(heart_rate)
            stride_lengths.append(stride_length)
            powers.append(power)
            elevations.append(elevation)
            paces.append(pace)

    return {
        "Distance": distances,
        "Cadence": cadences,
        "HeartRate": heart_rates,
        "StrideLength": stride_lengths,
        "Power": powers,
        "Elevation": elevations,
        "Pace": paces,
        "Latitude": latitudes,
        "Longitude": longitudes,
        "Timestamp": timestamps,
    }


def process_files(files: list):
    results = []
    for file in files:
        try:
            parsed_data = parse_fit_file(file)
            results.append({'filename': file.filename, 'data': parsed_data})
        except Exception as e:
            results.append({'filename': file.filename, 'error': str(e)})
    return results
