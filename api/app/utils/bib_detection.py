"""
Module for race bib number detection using Google's Gemini Vision model.
"""

import os
import json
from typing import List, Optional
from google import genai
from google.genai import types
from fastapi import HTTPException
from dotenv import load_dotenv

# Load environment variables from .env file
# Ensure this is loaded early, especially if the class is instantiated at module level
load_dotenv()

class BibDetector:
    def __init__(self):
        """Initialize the BibDetector with Google Gemini client using API Key."""
        try:
            api_key = os.getenv("GOOGLE_API_KEY")
            if not api_key:
                raise ValueError("GOOGLE_API_KEY environment variable not set or not loaded")
            
            # Initialize with API Key
            self.client = genai.Client(api_key=api_key)
            self.model = "gemini-2.0-flash-lite" # Ensure this model works with API key, might need adjustment
        except Exception as e:
            # Provide more context in the error message
            error_detail = f"Failed to initialize Gemini client: {str(e)}. "
            if not os.getenv("GOOGLE_API_KEY"):
                error_detail += "GOOGLE_API_KEY was not found in environment."
            
            raise HTTPException(
                status_code=500,
                detail=error_detail
            )

    async def detect_bib_numbers(self, image_path: str) -> List[str]:
        """
        Detect bib numbers in a race photo using Gemini Vision.
        
        Args:
            image_path: Path to the image file
            
        Returns:
            List of detected bib numbers as strings
            
        Raises:
            HTTPException: If detection fails
        """
        try:
            # Upload image file to Gemini
            # This method requires the Developer Client (API Key auth)
            print(f"Uploading file: {image_path}")
            file = self.client.files.upload(file=image_path)
            print(f"File uploaded: {file.uri}")
            
            # Prepare the content for Gemini
            contents = [
                types.Content(
                    role="user",
                    parts=[
                        types.Part.from_uri(
                            file_uri=file.uri,
                            mime_type=file.mime_type,
                        ),
                        types.Part.from_text(text="what's the number on the bib? Return only the number(s) found."),
                    ],
                )
            ]

            # Configure response schema for string numbers
            generate_content_config = types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=types.Schema(
                    type=types.Type.OBJECT,
                    properties={
                        "number": types.Schema(
                            type=types.Type.ARRAY,
                            items=types.Schema(
                                type=types.Type.STRING,
                            ),
                        ),
                    },
                ),
            )

            # Get streaming response from Gemini, using correct 'config' parameter
            print("Generating content using stream...")
            response_text = ""
            for chunk in self.client.models.generate_content_stream(
                model=self.model,
                contents=contents,
                config=generate_content_config, # Use 'config' parameter name
            ):
                if chunk.text:
                    response_text += chunk.text
                # Optional: Print chunks for debugging stream progress
                # print(f"Received chunk: {chunk.text}") 
            
            print(f"Aggregated Gemini Response Text: {response_text}") # Debugging aggregated text

            # Extract bib numbers from response
            if response_text:
                try:
                    # Attempt to parse JSON directly
                    result = json.loads(response_text)
                    if isinstance(result, dict) and 'number' in result:
                        # Ensure the result is a list of strings
                        bib_numbers = [str(n) for n in result['number']]
                        print(f"Detected bibs: {bib_numbers}")
                        return bib_numbers
                    else:
                        print("Parsed JSON, but 'number' key missing or invalid format.")

                except (json.JSONDecodeError, ValueError) as e:
                    print(f"Error parsing Gemini JSON response: {str(e)}. Response text: {response_text}")
                    # Fallback: If it's not JSON, maybe it's just the number(s)?
                    # Basic attempt to extract numbers if response is just text
                    import re
                    potential_bibs = re.findall(r'\b\d+\b', response_text)
                    if potential_bibs:
                        print(f"Fallback extraction found: {potential_bibs}")
                        return potential_bibs
            else:
                print("No response text received from Gemini.")
            
            return []

        except Exception as e:
            # Log the full traceback for detailed debugging
            import traceback
            print(f"Bib detection error: {str(e)}")
            traceback.print_exc()
            # Optionally re-raise or return empty list depending on desired behavior
            # raise HTTPException(status_code=500, detail=f"Bib detection failed: {str(e)}")
            return [] # Return empty list on error for now

# Create a singleton instance
# This ensures GOOGLE_API_KEY is loaded before initialization if .env is present
bib_detector = BibDetector() 