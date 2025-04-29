#!/usr/bin/env python3
"""
Test script for the BibReader class.
This script demonstrates how to use the BibReader to detect and read bib numbers from images.
"""

import os
import sys
import argparse
from read_bib import BibReader

def parse_args():
    parser = argparse.ArgumentParser(description='Detect and read bib numbers from race photos.')
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument('-i', '--image', help='Path to a single image file')
    group.add_argument('-d', '--directory', help='Path to a directory containing images')
    parser.add_argument('-m', '--model', default='best.pt', help='Path to the YOLO model weights (default: best.pt)')
    parser.add_argument('-c', '--confidence', type=float, default=0.25, help='Confidence threshold (0-1)')
    parser.add_argument('--debug', action='store_true', help='Enable debug mode to save intermediate images')
    
    return parser.parse_args()

def main():
    args = parse_args()
    
    # Ensure model file exists
    if not os.path.exists(args.model):
        print(f"Error: Model file '{args.model}' not found", file=sys.stderr)
        return 1
    
    # Initialize bib reader
    print(f"Initializing BibReader with model: {args.model}, confidence threshold: {args.confidence}, debug: {args.debug}")
    bib_reader = BibReader(model_path=args.model, confidence_threshold=args.confidence, debug=args.debug)
    
    # Process single image
    if args.image:
        if not os.path.exists(args.image):
            print(f"Error: Image file '{args.image}' not found", file=sys.stderr)
            return 1
        
        print(f"Processing image: {args.image}")
        try:
            results = bib_reader.read_bib(args.image)
            print("\nResults:")
            if results:
                for i, result in enumerate(results):
                    print(f"  Bib #{i+1}: Number {result['bib_number']} (confidence: {result['confidence']:.2f})")
            else:
                print("  No bib numbers detected")
                
            if args.debug:
                print(f"\nDebug images saved to the debug_images/ directory")
        except Exception as e:
            print(f"Error processing image: {e}", file=sys.stderr)
            return 1
    
    # Process directory of images
    elif args.directory:
        if not os.path.isdir(args.directory):
            print(f"Error: Directory '{args.directory}' not found", file=sys.stderr)
            return 1
        
        print(f"Processing images in directory: {args.directory}")
        try:
            results = bib_reader.read_bibs_from_directory(args.directory)
            print("\nResults:")
            for filename, bibs in results.items():
                print(f"\n{filename}:")
                if isinstance(bibs, list) and bibs:
                    for i, bib in enumerate(bibs):
                        print(f"  Bib #{i+1}: Number {bib['bib_number']} (confidence: {bib['confidence']:.2f})")
                elif isinstance(bibs, list):
                    print("  No bib numbers detected")
                else:
                    print(f"  Error: {bibs['error']}")
                    
            if args.debug:
                print(f"\nDebug images saved to the debug_images/ directory")
        except Exception as e:
            print(f"Error processing directory: {e}", file=sys.stderr)
            return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main()) 