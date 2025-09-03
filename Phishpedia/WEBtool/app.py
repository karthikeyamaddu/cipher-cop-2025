from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import base64
from io import BytesIO
from PIL import Image
from datetime import datetime
import os
import sys

# Add parent directory to Python path to import phishpedia
parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, parent_dir)

from phishpedia import PhishpediaWrapper, result_file_write

app = Flask(__name__)
CORS(app)

# 在创建应用时初始化模型
with app.app_context():
    current_dir = os.path.dirname(os.path.realpath(__file__))
    log_dir = os.path.join(current_dir, 'plugin_logs')
    os.makedirs(log_dir, exist_ok=True)
    phishpedia_cls = PhishpediaWrapper()


@app.route('/')
def index():
    """Serve the main HTML page"""
    return render_template('index.html')


@app.route('/analyze', methods=['POST'])
def analyze():
    try:
        print('Request received')
        data = request.get_json()
        url = data.get('url')
        screenshot_data = data.get('screenshot')

        # 解码Base64图片数据
        image_data = base64.b64decode(screenshot_data.split(',')[1])
        image = Image.open(BytesIO(image_data))
        # Preprocess: convert to RGB, resize to 224x224, center crop if not already
        image = image.convert('RGB')
        # If image is not square, center crop to square
        w, h = image.size
        if w != h:
            min_side = min(w, h)
            left = (w - min_side) // 2
            top = (h - min_side) // 2
            right = left + min_side
            bottom = top + min_side
            image = image.crop((left, top, right, bottom))
        image = image.resize((224, 224))
        screenshot_path = 'temp_screenshot.png'
        image.save(screenshot_path, format='PNG')

        # 调用Phishpedia模型进行识别
        phish_category, pred_target, matched_domain, \
            plotvis, siamese_conf, pred_boxes, \
            logo_recog_time, logo_match_time = phishpedia_cls.test_orig_phishpedia(url, screenshot_path, None)

        # 添加结果处理逻辑
        result = {
            "isPhishing": bool(phish_category),
            "brand": pred_target if pred_target else "unknown",
            "legitUrl": f"https://{matched_domain[0]}" if matched_domain else "unknown",
            "confidence": float(siamese_conf) if siamese_conf is not None else 0.0
        }

        # 记录日志
        today = datetime.now().strftime('%Y%m%d')
        log_file_path = os.path.join(log_dir, f'{today}_results.txt')

        try:
            with open(log_file_path, "a+", encoding='ISO-8859-1') as f:
                result_file_write(f, current_dir, url, phish_category, pred_target,
                                  matched_domain if matched_domain else ["unknown"],
                                  siamese_conf if siamese_conf is not None else 0.0,
                                  logo_recog_time, logo_match_time)
        except UnicodeError:
            with open(log_file_path, "a+", encoding='utf-8') as f:
                result_file_write(f, current_dir, url, phish_category, pred_target,
                                  matched_domain if matched_domain else ["unknown"],
                                  siamese_conf if siamese_conf is not None else 0.0,
                                  logo_recog_time, logo_match_time)

        if os.path.exists(screenshot_path):
            os.remove(screenshot_path)

        return jsonify(result)

    except Exception as e:
        print(f"Error in analyze: {str(e)}")
        log_error_path = os.path.join(log_dir, 'log_error.txt')
        with open(log_error_path, "a+", encoding='utf-8') as f:
            f.write(f'{datetime.now().strftime("%Y-%m-%d %H:%M:%S")} - {str(e)}\n')
        return jsonify("ERROR"), 500


@app.route('/get-directory')
def get_directory():
    """Get the directory structure of the target list"""
    try:
        # Get the expand_targetlist directory path
        expand_targetlist_path = os.path.join(parent_dir, 'models', 'expand_targetlist')
        
        if not os.path.exists(expand_targetlist_path):
            return jsonify({"error": "Target list directory not found", "file_tree": []})
        
        def scan_directory(path):
            """Recursively scan directory and return file tree structure"""
            items = []
            try:
                for item in os.listdir(path):
                    item_path = os.path.join(path, item)
                    if os.path.isdir(item_path):
                        # Skip hidden directories and __pycache__
                        if not item.startswith('.') and item != '__pycache__':
                            items.append({
                                "name": item,
                                "type": "directory",
                                "children": scan_directory(item_path)
                            })
                    else:
                        # Only include image files
                        if item.lower().endswith(('.png', '.jpg', '.jpeg', '.gif', '.bmp')):
                            items.append({
                                "name": item,
                                "type": "file"
                            })
            except PermissionError:
                pass
            return sorted(items, key=lambda x: (x['type'] == 'file', x['name'].lower()))
        
        file_tree = scan_directory(expand_targetlist_path)
        return jsonify({"file_tree": file_tree})
        
    except Exception as e:
        print(f"Error getting directory: {str(e)}")
        return jsonify({"error": str(e), "file_tree": []})


@app.route('/add-brand', methods=['POST'])
def add_brand():
    """Add a new brand directory"""
    try:
        brand_name = request.form.get('brandName')
        brand_domain = request.form.get('brandDomain')
        
        if not brand_name:
            return jsonify({"success": False, "error": "Brand name is required"})
        
        # Create directory for the new brand
        brand_path = os.path.join(parent_dir, 'models', 'expand_targetlist', brand_name)
        os.makedirs(brand_path, exist_ok=True)
        
        # Update domain map if needed (this is a simplified implementation)
        # In practice, you might want to update the domain_map.pkl file
        
        return jsonify({"success": True})
        
    except Exception as e:
        print(f"Error adding brand: {str(e)}")
        return jsonify({"success": False, "error": str(e)})


@app.route('/del-brand', methods=['POST'])
def del_brand():
    """Delete a brand directory"""
    try:
        data = request.get_json()
        directory = data.get('directory')
        
        if not directory:
            return jsonify({"success": False, "error": "Directory name is required"})
        
        brand_path = os.path.join(parent_dir, 'models', 'expand_targetlist', directory)
        
        if os.path.exists(brand_path):
            import shutil
            shutil.rmtree(brand_path)
            return jsonify({"success": True})
        else:
            return jsonify({"success": False, "error": "Directory not found"})
            
    except Exception as e:
        print(f"Error deleting brand: {str(e)}")
        return jsonify({"success": False, "error": str(e)})


@app.route('/add-logo', methods=['POST'])
def add_logo():
    """Add a logo to a brand directory"""
    try:
        logo_file = request.files.get('logo')
        directory = request.form.get('directory')
        
        if not logo_file or not directory:
            return jsonify({"success": False, "error": "Logo file and directory are required"})
        
        brand_path = os.path.join(parent_dir, 'models', 'expand_targetlist', directory)
        
        if not os.path.exists(brand_path):
            return jsonify({"success": False, "error": "Brand directory not found"})
        
        # Save the logo file
        logo_path = os.path.join(brand_path, logo_file.filename)
        logo_file.save(logo_path)
        
        return jsonify({"success": True})
        
    except Exception as e:
        print(f"Error adding logo: {str(e)}")
        return jsonify({"success": False, "error": str(e)})


@app.route('/del-logo', methods=['POST'])
def del_logo():
    """Delete a logo file"""
    try:
        directory = request.form.get('directory')
        filename = request.form.get('filename')
        
        if not directory or not filename:
            return jsonify({"success": False, "error": "Directory and filename are required"})
        
        logo_path = os.path.join(parent_dir, 'models', 'expand_targetlist', directory, filename)
        
        if os.path.exists(logo_path):
            os.remove(logo_path)
            return jsonify({"success": True})
        else:
            return jsonify({"success": False, "error": "File not found"})
            
    except Exception as e:
        print(f"Error deleting logo: {str(e)}")
        return jsonify({"success": False, "error": str(e)})


@app.route('/reload-model', methods=['POST'])
def reload_model():
    """Reload the Phishpedia model"""
    try:
        global phishpedia_cls
        # Reinitialize the model
        phishpedia_cls = PhishpediaWrapper()
        return jsonify({"success": True})
        
    except Exception as e:
        print(f"Error reloading model: {str(e)}")
        return jsonify({"success": False, "error": str(e)})


@app.route('/detect', methods=['POST'])
def detect():
    """Main detection endpoint that the frontend calls"""
    try:
        data = request.get_json()
        url = data.get('url')
        image_url = data.get('imageUrl')
        
        print(f'Detection request received for URL: {url}')
        
        if not url:
            return jsonify({"error": "URL is required"}), 400
        
        # For now, we'll need a screenshot. In a real implementation,
        # you might want to take a screenshot of the URL automatically
        if not image_url:
            return jsonify({
                "result": "Unknown",
                "matched_brand": "unknown",
                "confidence": 0.0,
                "correct_domain": "unknown",
                "detection_time": "0.00",
                "logo_extraction": "",
                "error": "Screenshot is required for detection"
            })
        
        # Use the uploaded image for detection
        screenshot_path = os.path.join(current_dir, 'temp_uploads', image_url)
        
        if not os.path.exists(screenshot_path):
            return jsonify({
                "result": "Unknown", 
                "matched_brand": "unknown",
                "confidence": 0.0,
                "correct_domain": "unknown",
                "detection_time": "0.00",
                "logo_extraction": "",
                "error": "Screenshot file not found"
            })
        
        # Run Phishpedia detection
        import time
        start_time = time.time()
        
        phish_category, pred_target, matched_domain, \
            plotvis, siamese_conf, pred_boxes, \
            logo_recog_time, logo_match_time = phishpedia_cls.test_orig_phishpedia(url, screenshot_path, None)
        
        total_time = time.time() - start_time
        
        # Prepare response
        result = "Unknown"
        if phish_category == 1:
            result = "Phishing"
        elif phish_category == 0 and pred_target:
            result = "Benign"
        
        # Convert plotvis to base64 for frontend display
        logo_extraction_b64 = ""
        if plotvis is not None:
            import cv2
            import base64
            _, buffer = cv2.imencode('.png', plotvis)
            logo_extraction_b64 = base64.b64encode(buffer).decode('utf-8')
        
        response_data = {
            "result": result,
            "matched_brand": pred_target if pred_target else "unknown",
            "confidence": float(siamese_conf) if siamese_conf is not None else 0.0,
            "correct_domain": matched_domain[0] if matched_domain else "unknown",
            "detection_time": f"{total_time:.2f}",
            "logo_extraction": logo_extraction_b64
        }
        
        return jsonify(response_data)
        
    except Exception as e:
        print(f"Error in detect: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            "result": "Unknown",
            "matched_brand": "unknown", 
            "confidence": 0.0,
            "correct_domain": "unknown",
            "detection_time": "0.00",
            "logo_extraction": "",
            "error": str(e)
        }), 500


@app.route('/upload', methods=['POST'])
def upload():
    """Upload screenshot for analysis"""
    try:
        if 'image' not in request.files:
            return jsonify({"success": False, "error": "No image file provided"})
        
        file = request.files['image']
        if file.filename == '':
            return jsonify({"success": False, "error": "No file selected"})
        
        # Create upload directory if it doesn't exist
        upload_dir = os.path.join(current_dir, 'temp_uploads')
        os.makedirs(upload_dir, exist_ok=True)
        
        # Save the file
        filename = f"uploaded_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{file.filename}"
        file_path = os.path.join(upload_dir, filename)
        file.save(file_path)
        
        return jsonify({
            "success": True,
            "imageUrl": filename
        })
        
    except Exception as e:
        print(f"Error in upload: {str(e)}")
        return jsonify({"success": False, "error": str(e)})


@app.route('/clear_upload', methods=['POST'])
def clear_upload():
    """Clear uploaded image"""
    try:
        data = request.get_json()
        image_url = data.get('imageUrl')
        
        if image_url:
            file_path = os.path.join(current_dir, 'temp_uploads', image_url)
            if os.path.exists(file_path):
                os.remove(file_path)
        
        return jsonify({"success": True})
        
    except Exception as e:
        print(f"Error in clear_upload: {str(e)}")
        return jsonify({"success": False, "error": str(e)})


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
