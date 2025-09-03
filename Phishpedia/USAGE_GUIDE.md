# Phishpedia Web Application Usage Guide

## How to Use the Web Interface

1. **Start the Application**
   - Make sure you're in the activated virtual environment
   - Navigate to the WEBtool directory: `cd WEBtool`
   - Run: `python app.py`
   - Open your browser and go to: `http://localhost:5000`

2. **Using the Detection Feature**
   - Enter a URL in the URL field
   - Upload a screenshot of the webpage (you can take a screenshot manually or use browser tools)
   - Click "Start Detection!"
   - The system will analyze the screenshot and provide results

3. **Managing Brands (Database)**
   - Click the hamburger menu (☰) to open the sidebar
   - You can:
     - Add new brands to the database
     - Delete existing brands
     - Add logos to existing brands
     - Delete logos from brands
     - Reload the model after making changes

## Command Line Usage

You can also run Phishpedia from the command line:

```bash
# Activate virtual environment
phishpedia_env\Scripts\activate

# Run on test dataset
python phishpedia.py --folder datasets/test_sites

# The results will be saved to a text file with today's date
```

## Test Dataset Structure

The test sites should be organized like this:
```
test_sites/
├── site1/
│   ├── info.txt (contains the URL)
│   ├── shot.png (screenshot of the webpage)
│   └── html.txt (optional: HTML content)
├── site2/
│   ├── info.txt
│   ├── shot.png
│   └── html.txt
```

## Notes

- The system requires both a URL and a screenshot for detection
- Detection results include:
  - Classification (Benign/Phishing/Unknown)
  - Matched brand (if any)
  - Confidence score
  - Correct domain information
  - Processing time
- Logo extraction results are displayed visually with bounding boxes
