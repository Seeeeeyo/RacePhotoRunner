import requests
import os

def test_bib_detection():
    # URL of your FastAPI endpoint
    url = "http://localhost:8000/api/bib-detection/detect/"
    
    # Path to test image
    image_path = "debug_images/pre_inference_1745898318_boston_marathon_5_WEBL5607.jpg"
    
    # Open the image file
    with open(image_path, "rb") as f:
        # Create the files parameter for the request
        files = {"file": (os.path.basename(image_path), f, "image/jpeg")}
        
        # Make the POST request
        response = requests.post(url, files=files)
        
        # Print the response
        print("Status Code:", response.status_code)
        print("Response:", response.json())

if __name__ == "__main__":
    test_bib_detection() 