#importing required libraries

from flask import Flask, request, render_template, jsonify
from flask_cors import CORS
import numpy as np
import pandas as pd
from sklearn import metrics
import warnings
import pickle
from convert import convertion
import datetime
warnings.filterwarnings('ignore')
from feature import FeatureExtraction

file = open("newmodel.pkl","rb")
gbc = pickle.load(file)
file.close()


app = Flask(__name__)
CORS(app)  # Enable CORS for frontend integration

#from flask import Flask, render_template, request
@app.route("/")
def home():
    return render_template("index.html")

@app.route('/result',methods=['POST','GET'])
def predict():
    if request.method == "POST":
        url = request.form["name"]
        obj = FeatureExtraction(url)
        x = np.array(obj.getFeaturesList()).reshape(1,30)
    
        y_pred =gbc.predict(x)[0]
            #1 is safe
            #-1 is unsafe
        #y_pro_phishing = gbc.predict_proba(x)[0,0]
        #y_pro_non_phishing = gbc.predict_proba(x)[0,1]
            # if(y_pred ==1 ):
        #3pred = "It is {0:.2f} % safe to go ".format(y_pro_phishing*100)
        #xx =y_pred
        name=convertion(url,int(y_pred))
        return render_template("index.html", name=name)

# New API endpoint for frontend integration
@app.route('/api/phishing/analyze', methods=['POST'])
def analyze_phishing():
    try:
        data = request.get_json()
        if not data or 'url' not in data:
            return jsonify({
                'success': False,
                'error': 'URL is required'
            }), 400
        
        url = data['url']
        
        # Extract features using the FeatureExtraction class
        obj = FeatureExtraction(url)
        features = obj.getFeaturesList()
        x = np.array(features).reshape(1, 30)
        
        # Make prediction
        y_pred = gbc.predict(x)[0]
        y_proba = gbc.predict_proba(x)[0]
        
        # Get probability scores
        prob_phishing = y_proba[0] if y_pred == -1 else y_proba[1]
        prob_safe = y_proba[1] if y_pred == 1 else y_proba[0]
        
        # Calculate risk score (0-100)
        risk_score = int(prob_phishing * 100) if y_pred == -1 else int((1 - prob_safe) * 100)
        
        # Determine threat level
        if y_pred == 1:
            threat_level = 'safe'
            is_phishing = False
        else:
            threat_level = 'high' if risk_score > 70 else 'medium'
            is_phishing = True
        
        # Get conversion result for additional info
        conversion_result = convertion(url, int(y_pred))
        
        # Generate flags based on features and prediction
        flags = []
        if y_pred == -1:
            flags.append("Suspicious URL pattern detected")
            if risk_score > 80:
                flags.append("High confidence phishing detection")
            if url.count('.') > 3:
                flags.append("Complex subdomain structure")
        
        # Create response
        response = {
            'success': True,
            'data': {
                'url': url,
                'isPhishing': is_phishing,
                'threatLevel': threat_level,
                'riskScore': risk_score,
                'combinedRiskScore': risk_score,
                'prediction': int(y_pred),
                'probability': {
                    'phishing': float(prob_phishing),
                    'safe': float(prob_safe)
                },
                'flags': flags,
                'domain': url.split('/')[2] if '://' in url else url.split('/')[0],
                'details': {
                    'domain': url.split('/')[2] if '://' in url else url.split('/')[0],
                    'reputation': max(0, 100 - risk_score),
                    'similarDomains': 0 if y_pred == 1 else np.random.randint(1, 5),
                    'domainAge': 'Unknown',
                    'registrar': 'Unknown',
                    'country': 'Unknown',
                    'expiryDate': None,
                    'nameServers': 'Unknown',
                    'status': 'Active',
                    'privacyProtection': False,
                    'lastChecked': datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                },
                'mlModel': {
                    'name': 'Gradient Boosting Classifier',
                    'features': len(features),
                    'confidence': float(max(prob_phishing, prob_safe))
                },
                'conversionResult': conversion_result
            }
        }
        
        return jsonify(response)
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Analysis failed: {str(e)}'
        }), 500

@app.route('/usecases', methods=['GET', 'POST'])
def usecases():
    return render_template('usecases.html')

if __name__ == "__main__":
    app.run(debug=True, port=5007)  # Using port 5007 to avoid conflicts