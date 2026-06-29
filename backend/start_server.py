import os
os.environ["PYTHONPATH"] = "C:\\Users\\Aradhya Chaudhary\\Documents\\Paraflow-AI\\backend"
os.environ["DEMO_MODE"] = "true"

from app.main import app
import uvicorn
uvicorn.run(app, host="127.0.0.1", port=8000)